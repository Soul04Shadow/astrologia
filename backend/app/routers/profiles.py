from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import ChatMessage, Profile, get_db
from app.routers.charts import _chart_for_profile
from app.schemas import ChatMessageOut, ProfileCreate, ProfileOut
from app.services.pdf import render_report_pdf

router = APIRouter(prefix="/profiles", tags=["profiles"])


def _get_profile_or_404(db: Session, profile_id: int) -> Profile:
    profile = db.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.get("/{profile_id}/report.pdf")
def report_pdf(profile_id: int, db: Session = Depends(get_db)):
    profile = _get_profile_or_404(db, profile_id)
    try:
        chart = _chart_for_profile(profile)
        pdf_bytes = render_report_pdf(chart, profile.name)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")
    filename = f"kundli_{profile.name.replace(' ', '_')}_{profile.birth_date}.pdf"
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.post("", response_model=ProfileOut)
def create_profile(payload: ProfileCreate, db: Session = Depends(get_db)):
    profile = Profile(**payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("", response_model=list[ProfileOut])
def list_profiles(db: Session = Depends(get_db)):
    profiles = db.scalars(select(Profile).order_by(Profile.created_at.desc())).all()
    return profiles


@router.get("/{profile_id}", response_model=ProfileOut)
def get_profile(profile_id: int, db: Session = Depends(get_db)):
    return _get_profile_or_404(db, profile_id)


@router.put("/{profile_id}", response_model=ProfileOut)
def update_profile(profile_id: int, payload: ProfileCreate, db: Session = Depends(get_db)):
    profile = _get_profile_or_404(db, profile_id)
    for key, value in payload.model_dump().items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/{profile_id}")
def delete_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = _get_profile_or_404(db, profile_id)
    db.delete(profile)
    db.commit()
    return {"deleted": True}


@router.get("/{profile_id}/messages", response_model=list[ChatMessageOut])
def get_messages(profile_id: int, db: Session = Depends(get_db)):
    _get_profile_or_404(db, profile_id)
    messages = db.scalars(
        select(ChatMessage).where(ChatMessage.profile_id == profile_id).order_by(ChatMessage.created_at)
    ).all()
    return messages


@router.delete("/{profile_id}/messages")
def clear_messages(profile_id: int, db: Session = Depends(get_db)):
    _get_profile_or_404(db, profile_id)
    deleted = db.query(ChatMessage).filter(ChatMessage.profile_id == profile_id).delete()
    db.commit()
    return {"deleted": deleted}
