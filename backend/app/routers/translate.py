from __future__ import annotations

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.llm import complete_chat

router = APIRouter(prefix="/translate", tags=["translate"])


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1)
    target_language: Literal["en", "hi", "hinglish"]
    provider: str | None = None


@router.post("")
async def translate(payload: TranslateRequest):
    target_map = {
        "en": "English",
        "hi": "Hindi in Devanagari script",
        "hinglish": "Hinglish (Roman Hindi, Hindi thoughts in Roman script mixed with everyday English)",
    }
    target_desc = target_map.get(payload.target_language, payload.target_language)
    prompt = (
        f"Translate the following Vedic astrology markdown to {target_desc} preserving markdown, dates, bullets, numbers, "
        "formatting and structure. Keep exact dates, numbers, and markdown symbols (**, bullet lists, tables). "
        "If target is Hinglish, use Roman Hindi. Return only the translation, no explanation."
    )
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": payload.text},
    ]
    translated = await complete_chat(messages, provider=payload.provider)
    return {"translated": translated}
