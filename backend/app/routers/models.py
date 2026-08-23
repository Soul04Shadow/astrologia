from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.services.catalog import CATALOG

router = APIRouter(prefix="/models", tags=["models"])


@router.get("")
def list_models(provider: str | None = Query(default=None)):
    if provider is not None:
        name = provider.lower().strip()
        if name not in CATALOG:
            raise HTTPException(status_code=400, detail=f"Unknown provider '{provider}'")
        return CATALOG[name]
    # flattened all
    out: list[dict] = []
    for lst in CATALOG.values():
        out.extend(lst)
    return out


# also handle trailing slash
@router.get("/")
def list_models_slash(provider: str | None = Query(default=None)):
    return list_models(provider)
