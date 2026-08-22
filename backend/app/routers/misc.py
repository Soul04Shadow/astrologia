from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.config import available_providers
from app.services.geo import resolve_place, search_place

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/providers")
def providers():
    return {"providers": available_providers()}


@router.get("/geocode")
def geocode(q: str = Query(min_length=2, max_length=200)):
    try:
        return {"results": search_place(q)}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/resolve-place")
def resolve_place_endpoint(q: str = Query(min_length=2, max_length=200)):
    try:
        return resolve_place(q)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
