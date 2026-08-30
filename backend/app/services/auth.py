from __future__ import annotations

import time

import httpx
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db, User

_bearer = HTTPBearer(auto_error=False)
_jwks_cache: dict = {"keys": None, "fetched_at": 0.0}
JWKS_TTL = 3600


def _jwks() -> dict:
    s = get_settings()
    now = time.time()
    if _jwks_cache["keys"] and now - _jwks_cache["fetched_at"] < JWKS_TTL:
        return {"keys": _jwks_cache["keys"]}
    url = f"{s.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    resp = httpx.get(url, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    _jwks_cache["keys"] = data.get("keys", [])
    _jwks_cache["fetched_at"] = now
    return data


def verify_supabase_token(token: str) -> dict:
    s = get_settings()
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}") from e

    if s.supabase_jwt_secret:
        try:
            claims = jwt.decode(
                token, s.supabase_jwt_secret, algorithms=["HS256"],
                audience="authenticated", options={"verify_aud": False},
            )
        except jwt.PyJWTError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {e}") from e
    else:
        kid = header.get("kid")
        keys = _jwks().get("keys", [])
        key = next((k for k in keys if k.get("kid") == kid), None)
        if not key:
            _jwks_cache["keys"] = None
            keys = _jwks().get("keys", [])
            key = next((k for k in keys if k.get("kid") == kid), None)
        if not key:
            raise HTTPException(status_code=401, detail="Unknown token key id")
        try:
            claims = jwt.decode(
                token, key, algorithms=[header.get("alg", "ES256")],
                options={"verify_aud": False},
            )
        except jwt.PyJWTError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {e}") from e

    sub = claims.get("sub")
    email = claims.get("email") or ""
    if not sub:
        raise HTTPException(status_code=401, detail="Token missing subject")
    return {"id": sub, "email": email, "name": claims.get("user_metadata", {}).get("name") or claims.get("name") or "",
            "avatar_url": claims.get("user_metadata", {}).get("avatar_url") or claims.get("picture") or ""}


def _upsert_user(db: Session, info: dict) -> User:
    user = db.get(User, info["id"])
    if not user:
        user = User(id=info["id"], email=info["email"], name=info["name"], avatar_url=info["avatar_url"])
        db.add(user)
    else:
        user.email = info["email"] or user.email
        user.name = info["name"] or user.name
        user.avatar_url = info["avatar_url"] or user.avatar_url
    db.commit()
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    s = get_settings()

    if not s.supabase_url:
        user = db.get(User, "local-admin")
        if not user:
            user = User(id="local-admin", email="local@localhost", name="Local Admin")
            db.add(user)
            db.commit()
        return user

    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    info = verify_supabase_token(credentials.credentials)
    email = info["email"]

    allowed = [e.strip().lower() for e in s.allowed_emails.split(",") if e.strip()]
    if allowed and email.lower() not in allowed:
        raise HTTPException(status_code=403, detail="Email not in beta allowlist")

    user = _upsert_user(db, info)

    admins = [e.strip().lower() for e in s.admin_emails.split(",") if e.strip()]
    if email and email.lower() in admins:
        from sqlalchemy import text

        db.execute(text("UPDATE profiles SET user_id = :uid WHERE user_id IS NULL"), {"uid": user.id})
        db.commit()

    return user
