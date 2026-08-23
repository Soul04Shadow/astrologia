from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db import _migrate_existing_messages, init_db
from app.routers import charts, chat, misc, models, profiles, sessions, translate


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    try:
        _migrate_existing_messages()
    except Exception:
        pass
    yield


settings = get_settings()

app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(misc.router, prefix="/api")
app.include_router(profiles.router, prefix="/api")
app.include_router(charts.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(translate.router, prefix="/api")
app.include_router(models.router, prefix="/api")


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=422, content={"detail": str(exc)})
