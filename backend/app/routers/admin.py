from __future__ import annotations

import json
import time
from datetime import datetime, timezone
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import available_providers, get_settings, provider_config
from app.db import (
    AllowedEmail,
    ChatMessage,
    ChatSession,
    Profile,
    SystemSetting,
    User,
    get_db,
)
from app.services.auth import is_admin_user, require_admin
from app.services.prompt import (
    CONSULTATION_STYLE,
    DEFAULT_PERSONA,
    JYOTISH_GUIDELINES,
    get_active_prompt_parts,
)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


class AllowlistAddRequest(BaseModel):
    email: str
    notes: str | None = None


class PromptUpdateRequest(BaseModel):
    persona: str | None = None
    guidelines: str | None = None
    style: str | None = None


class SystemSettingsUpdateRequest(BaseModel):
    default_provider: str | None = None
    default_models: dict[str, str] | None = None
    disabled_providers: list[str] | None = None


class PingProviderRequest(BaseModel):
    provider: str


def _merge_local_admin(db: Session):
    real_admin = db.scalars(
        select(User).where(User.id != "local-admin", User.email == "aayubansaldps@gmail.com")
    ).first()
    if real_admin:
        from sqlalchemy import text

        db.execute(text("UPDATE profiles SET user_id = :real_id WHERE user_id = 'local-admin'"), {"real_id": real_admin.id})
        db.execute(text("DELETE FROM users WHERE id = 'local-admin'"))
        db.commit()


def _get_revoked_emails(db: Session) -> set[str]:
    setting = db.scalar(select(SystemSetting).where(SystemSetting.key == "revoked_emails"))
    if not setting or not setting.value:
        return set()
    try:
        return set(json.loads(setting.value))
    except Exception:
        return set()


def _add_revoked_email(db: Session, email: str):
    revoked = _get_revoked_emails(db)
    revoked.add(email.lower())
    setting = db.scalar(select(SystemSetting).where(SystemSetting.key == "revoked_emails"))
    if not setting:
        db.add(SystemSetting(key="revoked_emails", value=json.dumps(list(revoked))))
    else:
        setting.value = json.dumps(list(revoked))
    db.commit()


def _unrevoke_email(db: Session, email: str):
    revoked = _get_revoked_emails(db)
    if email.lower() in revoked:
        revoked.remove(email.lower())
        setting = db.scalar(select(SystemSetting).where(SystemSetting.key == "revoked_emails"))
        if setting:
            setting.value = json.dumps(list(revoked))
            db.commit()


def _sync_allowed_emails(db: Session):
    s = get_settings()
    revoked = _get_revoked_emails(db)

    # 1. Sync from ALLOWED_EMAILS environment variable
    if s.allowed_emails:
        env_emails = [e.strip().lower() for e in s.allowed_emails.split(",") if e.strip()]
        existing = set(em.lower() for em in db.scalars(select(AllowedEmail.email)).all())
        added_any = False
        for em in env_emails:
            if em not in existing and em not in revoked:
                db.add(AllowedEmail(email=em, notes="Configured in environment", added_by="system"))
                existing.add(em)
                added_any = True
        if added_any:
            db.commit()

    # 2. Sync all registered users who aren't admins and haven't been revoked
    admins = [e.strip().lower() for e in s.admin_emails.split(",") if e.strip()]
    if "aayubansaldps@gmail.com" not in admins:
        admins.append("aayubansaldps@gmail.com")

    existing = set(em.lower() for em in db.scalars(select(AllowedEmail.email)).all())
    reg_users = db.scalars(select(User)).all()
    user_added = False
    for u in reg_users:
        if u.email and u.email.lower() not in admins and u.email.lower() not in existing and u.email.lower() not in revoked:
            db.add(
                AllowedEmail(
                    email=u.email.lower(),
                    notes=f"Active User ({u.name or 'Beta Tester'})",
                    added_by="system",
                )
            )
            existing.add(u.email.lower())
            user_added = True
    if user_added:
        db.commit()


@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    _merge_local_admin(db)
    _sync_allowed_emails(db)

    settings = get_settings()

    total_users = db.scalar(select(func.count(User.id))) or 0
    total_allowed = db.scalar(select(func.count(AllowedEmail.id))) or 0
    total_profiles = db.scalar(select(func.count(Profile.id))) or 0
    total_sessions = db.scalar(select(func.count(ChatSession.id))) or 0
    total_messages = db.scalar(select(func.count(ChatMessage.id))) or 0

    # Current default provider override if any
    default_provider_setting = db.scalar(select(SystemSetting.value).where(SystemSetting.key == "default_provider"))
    active_default_provider = default_provider_setting or settings.llm_provider

    # Swiss Ephemeris version if installed
    swisseph_ver = "Unknown"
    try:
        import swisseph as swe

        swisseph_ver = swe.swe_version()
    except Exception:
        pass

    db_type = "PostgreSQL" if "postgresql" in settings.database_url.lower() else "SQLite"

    return {
        "metrics": {
            "total_users": total_users,
            "total_allowed_testers": total_allowed,
            "total_profiles": total_profiles,
            "total_sessions": total_sessions,
            "total_messages": total_messages,
        },
        "diagnostics": {
            "database_type": db_type,
            "swisseph_version": swisseph_ver,
            "default_provider": active_default_provider,
            "server_time": datetime.now(timezone.utc).isoformat(),
        },
    }


@router.get("/allowlist")
def list_allowlist(db: Session = Depends(get_db)):
    _sync_allowed_emails(db)
    items = db.scalars(select(AllowedEmail).order_by(AllowedEmail.created_at.desc())).all()
    return [
        {
            "id": it.id,
            "email": it.email,
            "notes": it.notes,
            "added_by": it.added_by,
            "created_at": it.created_at.isoformat() if it.created_at else None,
        }
        for it in items
    ]


@router.post("/allowlist")
def add_to_allowlist(
    payload: AllowlistAddRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    norm_email = payload.email.strip().lower()
    if "@" not in norm_email or len(norm_email) < 3:
        raise HTTPException(status_code=422, detail="Invalid email address")

    _unrevoke_email(db, norm_email)

    existing = db.scalar(select(AllowedEmail).where(AllowedEmail.email == norm_email))
    if existing:
        if payload.notes is not None:
            existing.notes = payload.notes.strip()
        db.commit()
        db.refresh(existing)
        return {
            "id": existing.id,
            "email": existing.email,
            "notes": existing.notes,
            "added_by": existing.added_by,
            "created_at": existing.created_at.isoformat() if existing.created_at else None,
            "updated": True,
        }

    item = AllowedEmail(
        email=norm_email,
        notes=payload.notes.strip() if payload.notes else None,
        added_by=admin.email or admin.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {
        "id": item.id,
        "email": item.email,
        "notes": item.notes,
        "added_by": item.added_by,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "created": True,
    }


@router.delete("/allowlist/{email}")
def remove_from_allowlist(email: str, db: Session = Depends(get_db)):
    norm_email = email.strip().lower()
    item = db.scalar(select(AllowedEmail).where(AllowedEmail.email == norm_email))
    if not item:
        raise HTTPException(status_code=404, detail="Email not found in allowlist")

    _add_revoked_email(db, norm_email)
    db.delete(item)
    db.commit()
    return {"deleted": True, "email": norm_email}


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    _merge_local_admin(db)
    users = db.scalars(select(User).order_by(User.created_at.desc())).all()
    results = []

    for u in users:
        profiles_count = db.scalar(select(func.count(Profile.id)).where(Profile.user_id == u.id)) or 0
        
        # Count sessions and messages linked to user's profiles
        user_profile_ids = db.scalars(select(Profile.id).where(Profile.user_id == u.id)).all()
        sessions_count = 0
        messages_count = 0
        last_active = u.created_at.isoformat() if u.created_at else None

        if user_profile_ids:
            sessions_count = (
                db.scalar(select(func.count(ChatSession.id)).where(ChatSession.profile_id.in_(user_profile_ids))) or 0
            )
            messages_count = (
                db.scalar(select(func.count(ChatMessage.id)).where(ChatMessage.profile_id.in_(user_profile_ids))) or 0
            )
            latest_msg_time = db.scalar(
                select(func.max(ChatMessage.created_at)).where(ChatMessage.profile_id.in_(user_profile_ids))
            )
            if latest_msg_time:
                last_active = latest_msg_time.isoformat()

        results.append({
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "avatar_url": u.avatar_url,
            "is_admin": is_admin_user(u),
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_active": last_active,
            "profiles_count": profiles_count,
            "sessions_count": sessions_count,
            "messages_count": messages_count,
        })

    return results


@router.get("/settings")
def get_settings_endpoint(db: Session = Depends(get_db)):
    settings = get_settings()
    stored = {s.key: s.value for s in db.scalars(select(SystemSetting)).all()}

    disabled_providers = []
    if "disabled_providers" in stored:
        try:
            disabled_providers = json.loads(stored["disabled_providers"])
        except Exception:
            pass

    default_models = {}
    if "default_models" in stored:
        try:
            default_models = json.loads(stored["default_models"])
        except Exception:
            pass

    providers = available_providers()
    for p in providers:
        p["enabled"] = p["id"] not in disabled_providers
        cfg = provider_config(p["id"])
        p["base_url"] = cfg.get("base_url", "")
        p["default_model"] = default_models.get(p["id"], cfg.get("model", ""))

    return {
        "default_provider": stored.get("default_provider", settings.llm_provider),
        "disabled_providers": disabled_providers,
        "default_models": default_models,
        "providers": providers,
    }


@router.put("/settings")
def update_settings(
    payload: SystemSettingsUpdateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if payload.default_provider is not None:
        setting = db.get(SystemSetting, "default_provider")
        if not setting:
            setting = SystemSetting(key="default_provider", value=payload.default_provider, updated_by=admin.email)
            db.add(setting)
        else:
            setting.value = payload.default_provider
            setting.updated_by = admin.email

    if payload.default_models is not None:
        val = json.dumps(payload.default_models)
        setting = db.get(SystemSetting, "default_models")
        if not setting:
            setting = SystemSetting(key="default_models", value=val, updated_by=admin.email)
            db.add(setting)
        else:
            setting.value = val
            setting.updated_by = admin.email

    if payload.disabled_providers is not None:
        val = json.dumps(payload.disabled_providers)
        setting = db.get(SystemSetting, "disabled_providers")
        if not setting:
            setting = SystemSetting(key="disabled_providers", value=val, updated_by=admin.email)
            db.add(setting)
        else:
            setting.value = val
            setting.updated_by = admin.email

    db.commit()
    return {"saved": True}


@router.get("/prompt")
def get_prompt_settings(db: Session = Depends(get_db)):
    active = get_active_prompt_parts(db)
    stored = {s.key: s.value for s in db.scalars(select(SystemSetting)).all()}
    is_overridden = any(k in stored for k in ("prompt_persona", "prompt_guidelines", "prompt_style"))

    return {
        "persona": active["persona"],
        "guidelines": active["guidelines"],
        "style": active["style"],
        "is_overridden": is_overridden,
        "defaults": {
            "persona": DEFAULT_PERSONA,
            "guidelines": JYOTISH_GUIDELINES,
            "style": CONSULTATION_STYLE,
        },
    }


@router.put("/prompt")
def update_prompt_settings(
    payload: PromptUpdateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    items = {
        "prompt_persona": payload.persona,
        "prompt_guidelines": payload.guidelines,
        "prompt_style": payload.style,
    }
    for k, v in items.items():
        if v is not None:
            setting = db.get(SystemSetting, k)
            if not setting:
                setting = SystemSetting(key=k, value=v, updated_by=admin.email)
                db.add(setting)
            else:
                setting.value = v
                setting.updated_by = admin.email

    db.commit()
    return {"saved": True}


@router.post("/prompt/reset")
def reset_prompt_settings(db: Session = Depends(get_db)):
    for k in ("prompt_persona", "prompt_guidelines", "prompt_style"):
        setting = db.get(SystemSetting, k)
        if setting:
            db.delete(setting)
    db.commit()
    return {"reset": True}


@router.post("/ping-provider")
def ping_provider(payload: PingProviderRequest):
    pname = payload.provider.lower().strip()
    try:
        cfg = provider_config(pname)
    except ValueError as e:
        return {"ok": False, "latency_ms": 0, "error": str(e)}

    base_url = cfg["base_url"].rstrip("/")
    api_key = cfg["api_key"]
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}

    t0 = time.perf_counter()
    try:
        resp = httpx.get(f"{base_url}/models", headers=headers, timeout=4.0)
        dt = int((time.perf_counter() - t0) * 1000)
        if resp.status_code in (200, 401, 403):
            # 200 is healthy; 401/403 means server reached but key issue
            is_ok = resp.status_code == 200
            err_msg = None if is_ok else f"HTTP {resp.status_code}: Unauthorized / Invalid API Key"
            return {"ok": is_ok, "latency_ms": dt, "status_code": resp.status_code, "error": err_msg}
        return {"ok": False, "latency_ms": dt, "status_code": resp.status_code, "error": f"HTTP {resp.status_code}"}
    except Exception as exc:
        dt = int((time.perf_counter() - t0) * 1000)
        return {"ok": False, "latency_ms": dt, "error": str(exc)}
