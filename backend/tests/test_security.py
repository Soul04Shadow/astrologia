from __future__ import annotations

from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
import pytest

from app.db import Profile, User, get_db
from app.main import app
from app.services.auth import get_current_user
from app.services.prompt import build_system_prompt
from app.services.rate_limiter import chat_rate_limiter, translate_rate_limiter

PROFILE_PAYLOAD = {
    "name": "Security Test Native",
    "birth_date": "1995-10-15",
    "birth_time": "08:30",
    "place_name": "Delhi, India",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "tz_name": "Asia/Kolkata",
}

USER_ALICE = User(id="user-alice-sec", email="alice@test.dev", name="Alice")
USER_EVE = User(id="user-eve-sec", email="eve@test.dev", name="Eve")


def _login_as(user: User | None):
    if user:
        app.dependency_overrides[get_current_user] = lambda: user
    else:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture(autouse=True)
def cleanup_overrides():
    yield
    app.dependency_overrides.clear()


def test_security_headers_present():
    with TestClient(app) as client:
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.headers["x-content-type-options"] == "nosniff"
        assert r.headers["x-frame-options"] == "DENY"
        assert "strict-origin" in r.headers["referrer-policy"].lower()
        assert "camera=()" in r.headers["permissions-policy"]


def test_translate_payload_size_limit():
    with TestClient(app) as client:
        _login_as(USER_ALICE)
        oversized = "a" * 5001
        r = client.post("/api/translate", json={"text": oversized, "target_language": "hi"})
        assert r.status_code == 422


def test_translate_sanitizes_and_requires_auth():
    with TestClient(app) as client:
        _login_as(USER_ALICE)
        # Whitespace-only rejected
        r = client.post("/api/translate", json={"text": "   \x00   ", "target_language": "hi"})
        assert r.status_code == 422

        # Valid text invokes translation
        with patch("app.routers.translate.complete_chat", new=AsyncMock(return_value="नमस्ते")):
            r = client.post("/api/translate", json={"text": "Hello world", "target_language": "hi"})
            assert r.status_code == 200
            assert r.json()["translated"] == "नमस्ते"


def test_anti_hijacking_directives_in_prompt():
    from app.engine import compute_full_chart
    chart = compute_full_chart(1990, 5, 21, 14, 30, "Asia/Kolkata", 28.6139, 77.2090)
    prompt = build_system_prompt(chart, name="Test User", language="en")
    assert "ANTI-HIJACKING GUARDRAILS" in prompt
    assert "SYSTEM PROMPT & ARCHITECTURE CONFIDENTIALITY" in prompt
    assert "DOMAIN CONFINEMENT & ANTI-JAILBREAK" in prompt


def test_chat_empty_or_whitespace_sanitization():
    with TestClient(app) as client:
        _login_as(USER_ALICE)
        created = client.post("/api/profiles", json=PROFILE_PAYLOAD)
        assert created.status_code == 200
        pid = created.json()["id"]

        try:
            # Null bytes and whitespace only
            r = client.post(f"/api/chat/{pid}", json={"message": "   \x00   "})
            assert r.status_code == 422
            assert "empty" in r.json()["detail"].lower()
        finally:
            client.delete(f"/api/profiles/{pid}")


def test_chat_rate_limiting():
    limiter = chat_rate_limiter
    # Test rate limiter logic
    uid = "test-rate-limit-user"
    limiter._history[uid] = []

    # Send up to limit
    for _ in range(limiter.requests_limit):
        limiter.check(uid)

    # Next check must raise 429
    with pytest.raises(Exception) as excinfo:
        limiter.check(uid)
    assert "429" in str(excinfo.value)
