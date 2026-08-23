from __future__ import annotations

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import ChatMessage, ChatSession, Profile, get_db
from app.routers.charts import _chart_for_profile
from app.schemas import ChatRequest
from app.services.llm import LLMError, stream_chat
from app.services.prompt import build_system_prompt

router = APIRouter(prefix="/chat", tags=["chat"])


def _history_messages(db: Session, profile_id: int, session_id: int | None = None) -> list[dict]:
    s = get_settings()
    q = select(ChatMessage).where(ChatMessage.profile_id == profile_id)
    if session_id is not None:
        q = q.where(ChatMessage.session_id == session_id)
    msgs = db.scalars(q.order_by(ChatMessage.created_at.desc()).limit(s.max_history_messages)).all()
    msgs.reverse()
    return [{"role": m.role, "content": m.content} for m in msgs]


def _get_or_create_default_session(db: Session, profile_id: int) -> ChatSession:
    sess = db.scalars(
        select(ChatSession).where(ChatSession.profile_id == profile_id).order_by(ChatSession.created_at)
    ).first()
    if not sess:
        sess = ChatSession(profile_id=profile_id, title="First consultation")
        db.add(sess)
        db.flush()
    return sess


@router.post("/{profile_id}")
def chat(profile_id: int, payload: ChatRequest, session_id: int | None = Query(None), db: Session = Depends(get_db)):
    profile = db.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # resolve session
    resolved_session: ChatSession | None = None
    if session_id is not None:
        resolved_session = db.get(ChatSession, session_id)
        if not resolved_session or resolved_session.profile_id != profile_id:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        resolved_session = _get_or_create_default_session(db, profile_id)
        session_id = resolved_session.id
        # need to commit to ensure session exists for history? already flushed
        # but ensure updated_at touch later

    try:
        chart = _chart_for_profile(profile)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Chart calculation failed: {e}")

    system_prompt = build_system_prompt(chart, name=profile.name, language=payload.language)
    history = _history_messages(db, profile_id, session_id)

    # auto-title from first message (40 chars) if default title
    if not history and resolved_session.title in ("First consultation", "New chat"):
        resolved_session.title = payload.message.strip()[:40] or resolved_session.title

    # touch updated_at
    resolved_session.updated_at = datetime.utcnow()
    db.add(resolved_session)
    db.commit()
    db.refresh(resolved_session)

    user_msg = ChatMessage(profile_id=profile.id, session_id=session_id, role="user", content=payload.message,
                           language=payload.language)
    db.add(user_msg)
    db.commit()

    messages = [{"role": "system", "content": system_prompt}, *history,
                {"role": "user", "content": payload.message}]

    async def event_stream():
        full_reply = []
        try:
            yield f"data: {json.dumps({'event': 'start', 'provider': payload.provider or get_settings().llm_provider})}\n\n"
            async for delta in stream_chat(messages, provider=payload.provider):
                full_reply.append(delta)
                yield f"data: {json.dumps({'delta': delta})}\n\n"
            content = "".join(full_reply)
            assistant_msg = ChatMessage(profile_id=profile.id, session_id=session_id, role="assistant", content=content,
                                        provider=payload.provider or get_settings().llm_provider,
                                        language=payload.language)
            db.add(assistant_msg)
            # touch session again on assistant reply
            resolved_session.updated_at = datetime.utcnow()
            db.add(resolved_session)
            db.commit()
            yield f"data: {json.dumps({'event': 'done'})}\n\n"
        except LLMError as e:
            db.rollback()
            yield f"data: {json.dumps({'event': 'error', 'detail': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
