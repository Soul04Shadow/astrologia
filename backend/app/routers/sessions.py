from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import ChatMessage, ChatSession, Profile, get_db
from app.schemas import ChatMessageOut

router = APIRouter(prefix="/profiles", tags=["sessions"])


class SessionCreate(BaseModel):
    title: str | None = Field(default=None, max_length=80)


class SessionOut(BaseModel):
    id: int
    profile_id: int
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SessionRename(BaseModel):
    title: str = Field(min_length=1, max_length=80)


def _get_profile_or_404(db: Session, profile_id: int) -> Profile:
    profile = db.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.post("/{profile_id}/sessions", response_model=SessionOut, status_code=201)
def create_session(profile_id: int, payload: SessionCreate | None = None, db: Session = Depends(get_db)):
    _get_profile_or_404(db, profile_id)
    title = (payload.title.strip() if payload and payload.title else None) or "New chat"
    # truncate to 40 as per spec for auto title? spec says title from first 40 chars
    if len(title) > 80:
        title = title[:80]
    sess = ChatSession(profile_id=profile_id, title=title)
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return sess


@router.get("/{profile_id}/sessions", response_model=list[SessionOut])
def list_sessions(profile_id: int, db: Session = Depends(get_db)):
    _get_profile_or_404(db, profile_id)
    # ensure default exists for backwards compat
    existing = db.scalars(select(ChatSession).where(ChatSession.profile_id == profile_id)).all()
    if not existing:
        sess = ChatSession(profile_id=profile_id, title="First consultation")
        db.add(sess)
        db.commit()
        db.refresh(sess)
        existing = [sess]
    # order by updated_at desc
    sessions = db.scalars(select(ChatSession).where(ChatSession.profile_id == profile_id).order_by(ChatSession.updated_at.desc())).all()
    return sessions


@router.get("/{profile_id}/sessions/{sid}/messages", response_model=list[ChatMessageOut])
def session_messages(profile_id: int, sid: int, db: Session = Depends(get_db)):
    _get_profile_or_404(db, profile_id)
    sess = db.get(ChatSession, sid)
    if not sess or sess.profile_id != profile_id:
        raise HTTPException(status_code=404, detail="Session not found")
    msgs = db.scalars(select(ChatMessage).where(ChatMessage.session_id == sid).order_by(ChatMessage.created_at)).all()
    return msgs


@router.patch("/{profile_id}/sessions/{sid}", response_model=SessionOut)
def rename_session(profile_id: int, sid: int, payload: SessionRename, db: Session = Depends(get_db)):
    _get_profile_or_404(db, profile_id)
    sess = db.get(ChatSession, sid)
    if not sess or sess.profile_id != profile_id:
        raise HTTPException(status_code=404, detail="Session not found")
    sess.title = payload.title[:80]
    sess.updated_at = datetime.utcnow()
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return sess


@router.delete("/{profile_id}/sessions/{sid}")
def delete_session(profile_id: int, sid: int, db: Session = Depends(get_db)):
    _get_profile_or_404(db, profile_id)
    sess = db.get(ChatSession, sid)
    if not sess or sess.profile_id != profile_id:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(sess)
    db.commit()
    return {"deleted": True}
