from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import ChatMessage, Profile, get_db
from app.routers.charts import _chart_for_profile
from app.schemas import ChatRequest
from app.services.llm import LLMError, stream_chat
from app.services.prompt import build_system_prompt

router = APIRouter(prefix="/chat", tags=["chat"])


def _history_messages(db: Session, profile_id: int) -> list[dict]:
    s = get_settings()
    msgs = db.scalars(
        select(ChatMessage).where(ChatMessage.profile_id == profile_id)
        .order_by(ChatMessage.created_at.desc()).limit(s.max_history_messages)
    ).all()
    msgs.reverse()
    return [{"role": m.role, "content": m.content} for m in msgs]


@router.post("/{profile_id}")
def chat(profile_id: int, payload: ChatRequest, db: Session = Depends(get_db)):
    profile = db.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    try:
        chart = _chart_for_profile(profile)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Chart calculation failed: {e}")

    system_prompt = build_system_prompt(chart, name=profile.name, language=payload.language)
    history = _history_messages(db, profile_id)

    user_msg = ChatMessage(profile_id=profile.id, role="user", content=payload.message,
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
            assistant_msg = ChatMessage(profile_id=profile.id, role="assistant", content=content,
                                        provider=payload.provider or get_settings().llm_provider,
                                        language=payload.language)
            db.add(assistant_msg)
            db.commit()
            yield f"data: {json.dumps({'event': 'done'})}\n\n"
        except LLMError as e:
            db.rollback()
            yield f"data: {json.dumps({'event': 'error', 'detail': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
