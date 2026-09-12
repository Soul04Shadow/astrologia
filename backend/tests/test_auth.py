from __future__ import annotations

from fastapi.testclient import TestClient

from app.db import User
from app.main import app
from app.services.auth import get_current_user

PROFILE = {
    "name": "Owned Native",
    "birth_date": "1990-05-21",
    "birth_time": "14:30",
    "place_name": "Delhi, India",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "tz_name": "Asia/Kolkata",
}

USER_A = User(id="user-a", email="a@test.dev", name="A")
USER_B = User(id="user-b", name="B")


def _login_as(user: User) -> None:
    app.dependency_overrides[get_current_user] = lambda: user


def test_auth_me_local_mode():
    with TestClient(app):
        r = TestClient(app).get("/api/auth/me")
        assert r.status_code == 200
        assert r.json()["id"] == "local-admin"


def test_profile_ownership_isolation():
    with TestClient(app) as client:
        _login_as(USER_A)
        created = client.post("/api/profiles", json=PROFILE)
        assert created.status_code == 200
        pid = created.json()["id"]

        _login_as(USER_B)
        assert client.get(f"/api/profiles/{pid}").status_code == 404
        assert client.get(f"/api/profiles/{pid}/report.pdf").status_code == 404
        assert client.post(f"/api/chat/{pid}", json={"message": "hi"}).status_code == 404
        assert client.get("/api/profiles").json() == []
        assert client.get(f"/api/profiles/{pid}/messages").status_code == 404
        assert client.delete(f"/api/profiles/{pid}").status_code == 404

        _login_as(USER_A)
        assert client.get(f"/api/profiles/{pid}").status_code == 200
        client.delete(f"/api/profiles/{pid}")


def test_chat_stream_ownership():
    with TestClient(app) as client:
        _login_as(USER_A)
        pid = client.post("/api/profiles", json=PROFILE).json()["id"]

        _login_as(USER_B)
        assert client.get(f"/api/profiles/{pid}/stream?s=1").status_code == 404
        assert client.get(f"/api/profiles/{pid}/status?s=1").status_code == 404

        _login_as(USER_A)
        client.delete(f"/api/profiles/{pid}")


def test_verify_supabase_token_hs256(monkeypatch):
    import jwt
    from app.config import Settings
    from app.services.auth import verify_supabase_token

    monkeypatch.setattr(
        "app.services.auth.get_settings",
        lambda: Settings(supabase_jwt_secret="testsecret123", supabase_url=""),
    )
    token = jwt.encode(
        {"sub": "u-123", "email": "test@domain.com", "name": "Test User"},
        "testsecret123",
        algorithm="HS256",
    )
    info = verify_supabase_token(token)
    assert info["id"] == "u-123"
    assert info["email"] == "test@domain.com"
    assert info["name"] == "Test User"


def test_verify_supabase_token_invalid():
    import pytest
    from fastapi import HTTPException
    from app.services.auth import verify_supabase_token

    with pytest.raises(HTTPException) as exc_info:
        verify_supabase_token("invalid.token.format")
    assert exc_info.value.status_code == 401
