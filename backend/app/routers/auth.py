from __future__ import annotations

from fastapi import APIRouter, Depends

from app.db import User
from app.services.auth import get_current_user, is_admin_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "is_admin": is_admin_user(user),
    }
