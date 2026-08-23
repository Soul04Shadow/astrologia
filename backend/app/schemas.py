from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class PlaceOut(BaseModel):
    display_name: str
    name: str
    latitude: float
    longitude: float
    tz_name: str


class ProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    birth_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    birth_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    place_name: str = Field(min_length=2)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    tz_name: str = Field(min_length=1, max_length=64)
    notes: str | None = None


class ProfileOut(BaseModel):
    id: int
    name: str
    birth_date: str
    birth_time: str
    place_name: str
    latitude: float
    longitude: float
    tz_name: str
    notes: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    language: str = "hinglish"
    provider: str | None = None


class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    provider: str | None = None
    language: str | None = None
    created_at: datetime
    session_id: int | None = None

    class Config:
        from_attributes = True


class ChatSessionOut(BaseModel):
    id: int
    profile_id: int
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
