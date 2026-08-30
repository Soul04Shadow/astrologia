from __future__ import annotations

from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from fastapi import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import ChatMessage, Profile, User, get_db
from app.routers.charts import _chart_for_profile
from app.schemas import ChatMessageOut, ProfileCreate, ProfileOut
from app.services.auth import get_current_user
from app.services.pdf import render_report_pdf

router = APIRouter(prefix="/profiles", tags=["profiles"])


def _owned_profile_or_404(db: Session, profile_id: int, user: User) -> Profile:
    profile = db.get(Profile, profile_id)
    if not profile or profile.user_id != user.id:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.get("/{profile_id}/report.pdf")
def report_pdf(profile_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profile = _owned_profile_or_404(db, profile_id, user)
    try:
        chart = _chart_for_profile(profile)
        pdf_bytes = render_report_pdf(chart, profile.name, place_name=profile.place_name)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")
    ascii_fallback = f"kundli_{profile.id}_{profile.birth_date}.pdf"
    utf8_name = f"kundli_{profile.name}_{profile.birth_date}.pdf"
    headers = {
        "Content-Disposition": (
            f"attachment; filename=\"{ascii_fallback}\"; filename*=UTF-8''{quote(utf8_name)}"
        )
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


@router.post("", response_model=ProfileOut)
def create_profile(payload: ProfileCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profile = Profile(**payload.model_dump(), user_id=user.id)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("", response_model=list[ProfileOut])
def list_profiles(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.scalars(
        select(Profile).where(Profile.user_id == user.id).order_by(Profile.created_at.desc())
    ).all()


@router.get("/{profile_id}", response_model=ProfileOut)
def get_profile(profile_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _owned_profile_or_404(db, profile_id, user)


@router.put("/{profile_id}", response_model=ProfileOut)
def update_profile(profile_id: int, payload: ProfileCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profile = _owned_profile_or_404(db, profile_id, user)
    for key, value in payload.model_dump().items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/{profile_id}")
def delete_profile(profile_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profile = _owned_profile_or_404(db, profile_id, user)
    db.delete(profile)
    db.commit()
    return {"deleted": True}


@router.get("/{profile_id}/messages", response_model=list[ChatMessageOut])
def get_messages(profile_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _owned_profile_or_404(db, profile_id, user)
    messages = db.scalars(
        select(ChatMessage).where(ChatMessage.profile_id == profile_id).order_by(ChatMessage.created_at)
    ).all()
    return messages


@router.delete("/{profile_id}/messages")
def clear_messages(profile_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _owned_profile_or_404(db, profile_id, user)
    deleted = db.query(ChatMessage).filter(ChatMessage.profile_id == profile_id).delete()
    db.commit()
    return {"deleted": deleted}
