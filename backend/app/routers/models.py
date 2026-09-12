import time
import httpx
from fastapi import APIRouter, HTTPException, Query

from app.config import get_settings
from app.services.catalog import CATALOG

router = APIRouter(prefix="/models", tags=["models"])

_cliproxy_cache: dict = {"models": None, "fetched_at": 0.0}
CLIPROXY_CACHE_TTL = 60.0  # seconds


def fetch_cliproxy_models() -> list[dict] | None:
    s = get_settings()
    now = time.time()
    if _cliproxy_cache["models"] is not None and (now - _cliproxy_cache["fetched_at"]) < CLIPROXY_CACHE_TTL:
        return _cliproxy_cache["models"]

    base_url = s.cliproxy_base_url.rstrip("/")
    api_key = s.cliproxy_api_key
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    url = f"{base_url}/models"
    try:
        resp = httpx.get(url, headers=headers, timeout=2.5)
        if resp.status_code == 200:
            data = resp.json()
            raw_list = data.get("data", [])
            out = []
            for item in raw_list:
                mid = item.get("id")
                if not mid:
                    continue
                label = mid.replace("-", " ").title()
                if "gemini" in mid.lower() or "claude" in mid.lower():
                    label = f"{label} (Antigravity)"
                out.append({
                    "id": mid,
                    "label": label,
                    "ctx": "1M",
                    "free": False,
                    "tools": True,
                })
            if out:
                _cliproxy_cache["models"] = out
                _cliproxy_cache["fetched_at"] = now
                return out
    except Exception:
        pass
    return None


@router.get("")
def list_models(provider: str | None = Query(default=None)):
    if provider is not None:
        name = provider.lower().strip()
        if name == "cliproxy":
            dyn = fetch_cliproxy_models()
            if dyn:
                return dyn
            return CATALOG.get("cliproxy", [])
        if name not in CATALOG:
            raise HTTPException(status_code=400, detail=f"Unknown provider '{provider}'")
        return CATALOG[name]
    # flattened all
    out: list[dict] = []
    for k, lst in CATALOG.items():
        if k == "cliproxy":
            dyn = fetch_cliproxy_models()
            out.extend(dyn if dyn else lst)
        else:
            out.extend(lst)
    return out


# also handle trailing slash
@router.get("/")
def list_models_slash(provider: str | None = Query(default=None)):
    return list_models(provider)
