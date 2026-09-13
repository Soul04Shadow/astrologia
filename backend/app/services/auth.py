from __future__ import annotations

import time

import httpx
import jwt
from fastapi import Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db, User

import logging

logger = logging.getLogger("uvicorn.error")

_bearer = HTTPBearer(auto_error=False)
_jwks_clients: dict[str, jwt.PyJWKClient] = {}


def _get_jwks_client(jwks_url: str) -> jwt.PyJWKClient:
    if jwks_url not in _jwks_clients:
        _jwks_clients[jwks_url] = jwt.PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)
    return _jwks_clients[jwks_url]


def verify_supabase_token(token: str) -> dict:
    s = get_settings()
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as e:
        logger.warning("Failed to decode token header: %s", e)
        raise HTTPException(status_code=401, detail=f"Invalid token header: {e}") from e

    alg = header.get("alg", "HS256")
    kid = header.get("kid")
    logger.info("Verifying Supabase token: alg=%s, kid=%s", alg, kid)

    claims: dict | None = None
    last_error: Exception | None = None

    # 1. Asymmetric key (ES256 / RS256) via JWKS
    if s.supabase_url and (alg in ("ES256", "RS256") or kid):
        try:
            jwks_url = f"{s.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
            jwks_client = _get_jwks_client(jwks_url)
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                options={"verify_aud": False},
            )
            logger.info("Successfully verified token using Supabase JWKS (%s)", alg)
        except Exception as e:
            last_error = e
            logger.warning("JWKS token verification failed: %s", e)

    # 2. Symmetric HS256 secret verification fallback
    if claims is None and s.supabase_jwt_secret:
        try:
            claims = jwt.decode(
                token,
                s.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            logger.info("Successfully verified token using SUPABASE_JWT_SECRET (HS256)")
        except Exception as e:
            last_error = e
            logger.debug("HS256 secret verification failed: %s", e)

    if claims is None:
        err_msg = f"Invalid token: {last_error}" if last_error else "Invalid token"
        logger.warning("Supabase token rejected: %s", err_msg)
        raise HTTPException(status_code=401, detail=err_msg)

    sub = claims.get("sub")
    email = claims.get("email") or claims.get("user_metadata", {}).get("email") or ""
    if not sub:
        raise HTTPException(status_code=401, detail="Token missing subject")

    name = claims.get("user_metadata", {}).get("name") or claims.get("name") or ""
    avatar_url = claims.get("user_metadata", {}).get("avatar_url") or claims.get("picture") or ""
    return {"id": sub, "email": email, "name": name, "avatar_url": avatar_url}


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
    token: str | None = Query(None, alias="token"),
    db: Session = Depends(get_db),
) -> User:
    s = get_settings()

    if not s.supabase_url or s.disable_auth:
        admin_email = s.admin_emails.split(",")[0].strip() if s.admin_emails else "aayubansaldps@gmail.com"
        user = db.get(User, "local-admin")
        if not user:
            user = User(id="local-admin", email=admin_email, name="Aayush Bansal")
            db.add(user)
            db.commit()
        elif user.email != admin_email or user.name != "Aayush Bansal":
            user.email = admin_email
            user.name = "Aayush Bansal"
            db.commit()
        return user

    raw_token = credentials.credentials if credentials else token
    if not raw_token:
        logger.warning("get_current_user: Neither Bearer credentials nor query token provided in request")
        raise HTTPException(status_code=401, detail="Not authenticated")

    info = verify_supabase_token(raw_token)
    email = info["email"]

    admins = [e.strip().lower() for e in s.admin_emails.split(",") if e.strip()]
    if "aayubansaldps@gmail.com" not in admins:
        admins.append("aayubansaldps@gmail.com")
    is_admin = bool(email and email.lower() in admins)

    if not is_admin:
        from sqlalchemy import select
        from app.db import AllowedEmail

        db_allowed = [em.lower() for em in db.scalars(select(AllowedEmail.email)).all()]
        env_allowed = [e.strip().lower() for e in s.allowed_emails.split(",") if e.strip()]
        all_allowed = set(db_allowed) | set(env_allowed)

        if all_allowed and email.lower() not in all_allowed:
            logger.warning("get_current_user: Email '%s' not in allowlist", email)
            raise HTTPException(status_code=403, detail="Email not in beta allowlist")

    user = _upsert_user(db, info)

    if is_admin:
        from sqlalchemy import text

        db.execute(text("UPDATE profiles SET user_id = :uid WHERE user_id IS NULL"), {"uid": user.id})
        db.commit()

    return user


def is_admin_user(user: User | None) -> bool:
    if not user:
        return False
    if user.id == "local-admin":
        return True
    s = get_settings()
    admins = [e.strip().lower() for e in s.admin_emails.split(",") if e.strip()]
    if "aayubansaldps@gmail.com" not in admins:
        admins.append("aayubansaldps@gmail.com")
    return bool(user.email and user.email.lower() in admins)


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not is_admin_user(user):
        raise HTTPException(status_code=403, detail="Forbidden: Admin privileges required")
    return user
