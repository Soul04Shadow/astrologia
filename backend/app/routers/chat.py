from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings, provider_config
from app.db import ChatMessage, ChatSession, Profile, User, get_db
from app.routers.charts import _chart_for_profile
from app.schemas import ChatRequest
from app.services.auth import get_current_user
from app.services.prompt import build_system_prompt
from app.services.stream_hub import hub, run_background_generation, stream_chat

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
async def chat(profile_id: int, payload: ChatRequest, session_id: int | None = Query(None), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profile = db.get(Profile, profile_id)
    if not profile or profile.user_id != user.id:
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

    try:
        chart = _chart_for_profile(profile)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Chart calculation failed: {e}")

    system_prompt = build_system_prompt(chart, name=profile.name, language=payload.language, db=db)
    history = _history_messages(db, profile_id, session_id)

    # auto-title from first message (40 chars) if default title
    if not history and resolved_session.title in ("First consultation", "New chat"):
        resolved_session.title = payload.message.strip()[:40] or resolved_session.title

    resolved_session.updated_at = datetime.now(timezone.utc)
    db.add(resolved_session)
    db.commit()
    db.refresh(resolved_session)

    user_msg = ChatMessage(profile_id=profile.id, session_id=session_id, role="user", content=payload.message,
                           language=payload.language)
    db.add(user_msg)
    db.commit()

    messages = [{"role": "system", "content": system_prompt}, *history,
                {"role": "user", "content": payload.message}]

    cfg = provider_config(payload.provider, payload.model)

    # Create background generation stream
    stream = hub.create_or_get_stream(profile.id, session_id)
    # Start generation in background task
    task = asyncio.create_task(
        run_background_generation(
            stream=stream,
            messages=messages,
            chart=chart,
            provider=payload.provider,
            model=cfg["model"],
            language=payload.language,
        )
    )
    stream.task = task

    return StreamingResponse(
        stream.stream_events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/{profile_id}/stream")
async def chat_stream(profile_id: int, session_id: int = Query(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profile = db.get(Profile, profile_id)
    if not profile or profile.user_id != user.id:
        raise HTTPException(status_code=404, detail="Profile not found")
    stream = hub.get_stream(profile_id, session_id)
    if stream and not stream.is_done:
        return StreamingResponse(
            stream.stream_events(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    async def empty_done():
        yield f"data: {json.dumps({'event': 'done'})}\n\n"

    return StreamingResponse(empty_done(), media_type="text/event-stream")


@router.get("/{profile_id}/status")
def chat_status(profile_id: int, session_id: int = Query(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return {
        "active": hub.is_active(profile_id, session_id),
        "session_id": session_id,
        "profile_id": profile_id,
    }
