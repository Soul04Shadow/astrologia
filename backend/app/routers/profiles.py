from __future__ import annotations

from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import ChatMessage, Profile, User, get_db
from app.routers.charts import _chart_for_profile
from app.schemas import ChatMessageOut, ProfileCreate, ProfileOut
from app.services.auth import get_current_user, is_admin_user
from app.services.pdf import render_report_html, render_report_pdf

router = APIRouter(prefix="/profiles", tags=["profiles"])


def _owned_profile_or_404(db: Session, profile_id: int, user: User) -> Profile:
    profile = db.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    if profile.user_id != user.id and not is_admin_user(user):
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


@router.get("/{profile_id}/report.html", response_class=HTMLResponse)
def report_html(profile_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profile = _owned_profile_or_404(db, profile_id, user)
    try:
        chart = _chart_for_profile(profile)
        html_str = render_report_html(chart, profile.name, place_name=profile.place_name, is_preview=True)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"HTML report generation failed: {e}")
    return HTMLResponse(content=html_str)


def _enrich_profile_out(profile: Profile) -> ProfileOut:
    p_dict = {
        "id": profile.id,
        "name": profile.name,
        "birth_date": profile.birth_date,
        "birth_time": profile.birth_time,
        "place_name": profile.place_name,
        "latitude": profile.latitude,
        "longitude": profile.longitude,
        "tz_name": profile.tz_name,
        "notes": profile.notes,
        "created_at": profile.created_at,
        "nakshatra": None,
        "nakshatra_lord": None,
        "moon_sign": None,
    }
    try:
        from app.engine.core import local_to_utc, nakshatra_of, raw_positions, sign_info, utc_to_jd
        b_parts = [int(x) for x in profile.birth_date.split("-")]
        t_parts = [int(x) for x in profile.birth_time.split(":")]
        utc_dt = local_to_utc(b_parts[0], b_parts[1], b_parts[2], t_parts[0], t_parts[1], profile.tz_name)
        jd = utc_to_jd(utc_dt)
        pos = raw_positions(jd)
        moon_lon = pos["Moon"]["lon"]
        nak = nakshatra_of(moon_lon)
        si = sign_info(moon_lon)
        p_dict["nakshatra"] = nak["name"]
        p_dict["nakshatra_lord"] = nak["lord"]
        p_dict["moon_sign"] = si["name"]
    except Exception:
        pass
    return ProfileOut(**p_dict)


@router.post("", response_model=ProfileOut)
def create_profile(payload: ProfileCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profile = Profile(**payload.model_dump(), user_id=user.id)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return _enrich_profile_out(profile)


@router.get("", response_model=list[ProfileOut])
def list_profiles(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.id == "local-admin":
        condition = (Profile.user_id == user.id) | (Profile.user_id.is_(None))
    else:
        condition = (Profile.user_id == user.id)
    profiles = db.scalars(
        select(Profile).where(condition).order_by(Profile.created_at.desc())
    ).all()
    return [_enrich_profile_out(p) for p in profiles]


@router.get("/{profile_id}", response_model=ProfileOut)
def get_profile(profile_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profile = _owned_profile_or_404(db, profile_id, user)
    return _enrich_profile_out(profile)


@router.put("/{profile_id}", response_model=ProfileOut)
def update_profile(profile_id: int, payload: ProfileCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profile = _owned_profile_or_404(db, profile_id, user)
    for key, value in payload.model_dump().items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return _enrich_profile_out(profile)


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
