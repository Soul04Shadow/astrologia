from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import Profile, User, get_db
from app.engine import compute_full_chart
from app.schemas import ProfileCreate
from app.services.auth import get_current_user, is_admin_user

router = APIRouter(prefix="/charts", tags=["charts"])


def _parse_birth(profile: Profile):
    try:
        y, m, d = (int(x) for x in profile.birth_date.split("-"))
        hh, mm = (int(x) for x in profile.birth_time.split(":"))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Invalid stored birth data: {e}")
    return y, m, d, hh, mm


def _chart_for_profile(profile: Profile) -> dict:
    y, m, d, hh, mm = _parse_birth(profile)
    return compute_full_chart(y, m, d, hh, mm, profile.tz_name, profile.latitude, profile.longitude)


@router.post("/preview")
def preview_chart_post(payload: ProfileCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    y, m, d = (int(x) for x in payload.birth_date.split("-"))
    hh, mm = (int(x) for x in payload.birth_time.split(":"))
    try:
        chart = compute_full_chart(y, m, d, hh, mm, payload.tz_name, payload.latitude, payload.longitude)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Chart calculation failed: {e}")
    return {"name": payload.name, "chart": chart}


@router.get("/{profile_id}")
def chart_for_profile(profile_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profile = db.get(Profile, profile_id)
    if not profile or (profile.user_id != user.id and not is_admin_user(user)):
        raise HTTPException(status_code=404, detail="Profile not found")
    try:
        chart = _chart_for_profile(profile)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Chart calculation failed: {e}")
    return {"profile": {"id": profile.id, "name": profile.name}, "chart": chart}
