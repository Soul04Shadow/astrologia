from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.main import app

PROFILE = {
    "name": "Test Native",
    "birth_date": "1990-05-21",
    "birth_time": "14:30",
    "place_name": "Delhi, India",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "tz_name": "Asia/Kolkata",
}


def test_health_and_providers():
    with TestClient(app) as client:
        r = client.get("/api/health")
        assert r.status_code == 200
        r = client.get("/api/providers")
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()["providers"]]
        assert {"cliproxy", "gemini", "groq", "openrouter", "lmstudio", "ollama"} <= set(ids)
        models_r = client.get("/api/models?provider=cliproxy")
        assert models_r.status_code == 200
        assert len(models_r.json()) > 0


def test_profile_crud_and_chart():
    with TestClient(app) as client:
        created = client.post("/api/profiles", json=PROFILE)
        assert created.status_code == 200
        pid = created.json()["id"]

        listed = client.get("/api/profiles")
        assert any(p["id"] == pid for p in listed.json())

        chart = client.get(f"/api/charts/{pid}")
        assert chart.status_code == 200
        body = chart.json()
        assert body["chart"]["lagna"]["sign"] == "Virgo"
        assert len(body["chart"]["planets"]) == 9
        assert "dasha" in body["chart"]

        updated = client.put(f"/api/profiles/{pid}", json={**PROFILE, "name": "Renamed"})
        assert updated.json()["name"] == "Renamed"

        deleted = client.delete(f"/api/profiles/{pid}")
        assert deleted.status_code == 200
        assert client.get(f"/api/profiles/{pid}").status_code == 404


def test_chart_preview():
    with TestClient(app) as client:
        r = client.post("/api/charts/preview", json=PROFILE)
        assert r.status_code == 200
        chart = r.json()["chart"]
        assert chart["moon_rashi"]["sign"] == "Pisces"
        assert abs((chart["planets"]["Ketu"]["longitude"] - (chart["planets"]["Rahu"]["longitude"] + 180)) % 360) < 1e-3


def test_report_pdf():
    with TestClient(app) as client:
        pid = client.post("/api/profiles", json=PROFILE).json()["id"]
        r = client.get(f"/api/profiles/{pid}/report.pdf")
        assert r.status_code == 200
        assert r.headers["content-type"] == "application/pdf"
        assert r.content[:5] == b"%PDF-"
        client.delete(f"/api/profiles/{pid}")


def test_chat_with_mocked_provider():
    import app.routers.chat as chat_module

    async def _fake_stream(messages, provider=None):
        for word in ["Vedic ", "answer ", "grounded"]:
            yield word

    original = chat_module.stream_chat
    chat_module.stream_chat = _fake_stream
    try:
        with TestClient(app) as client:
            pid = client.post("/api/profiles", json=PROFILE).json()["id"]
            r = client.post(f"/api/chat/{pid}", json={"message": "Career prospects?", "language": "en"})
            assert r.status_code == 200
            events = [json.loads(line[5:]) for line in r.text.splitlines() if line.startswith("data:")]
            deltas = "".join(e.get("delta", "") for e in events)
            assert "grounded" in deltas
            assert any(e.get("event") == "done" for e in events)

            history = client.get(f"/api/profiles/{pid}/messages").json()
            roles = [m["role"] for m in history]
            assert roles.count("user") == 1 and roles.count("assistant") == 1
            client.delete(f"/api/profiles/{pid}")
    finally:
        chat_module.stream_chat = original


def test_chat_unknown_profile_404():
    with TestClient(app) as client:
        r = client.post("/api/chat/999999", json={"message": "hello"})
        assert r.status_code == 404


def test_session_crud():
    with TestClient(app) as client:
        pid = client.post("/api/profiles", json=PROFILE).json()["id"]
        # default session exists after profile creation (created on first list or chat)
        listed = client.get(f"/api/profiles/{pid}/sessions")
        assert listed.status_code == 200
        assert len(listed.json()) >= 1
        default_sid = listed.json()[0]["id"]

        created = client.post(f"/api/profiles/{pid}/sessions", json={"title": "Second session"})
        assert created.status_code == 201
        sid = created.json()["id"]
        assert created.json()["title"] == "Second session"

        all_sessions = client.get(f"/api/profiles/{pid}/sessions").json()
        assert len(all_sessions) >= 2
        assert any(s["id"] == sid for s in all_sessions)

        renamed = client.patch(f"/api/profiles/{pid}/sessions/{sid}", json={"title": "Renamed"})
        assert renamed.status_code == 200
        assert renamed.json()["title"] == "Renamed"

        msgs = client.get(f"/api/profiles/{pid}/sessions/{sid}/messages").json()
        assert msgs == []

        deleted = client.delete(f"/api/profiles/{pid}/sessions/{sid}")
        assert deleted.status_code == 200
        remaining = client.get(f"/api/profiles/{pid}/sessions").json()
        assert all(s["id"] != sid for s in remaining)

        client.delete(f"/api/profiles/{pid}")


def test_session_chat_isolation():
    import app.routers.chat as chat_module

    async def _fake_stream(messages, provider=None):
        for word in ["isolated ", "answer"]:
            yield word

    original = chat_module.stream_chat
    chat_module.stream_chat = _fake_stream
    try:
        with TestClient(app) as client:
            pid = client.post("/api/profiles", json=PROFILE).json()["id"]
            s1 = client.post(f"/api/profiles/{pid}/sessions", json={"title": "S1"}).json()["id"]
            s2 = client.post(f"/api/profiles/{pid}/sessions", json={"title": "S2"}).json()["id"]

            r1 = client.post(f"/api/chat/{pid}?session_id={s1}", json={"message": "hello s1", "language": "en"})
            assert r1.status_code == 200

            r2 = client.post(f"/api/chat/{pid}?session_id={s2}", json={"message": "hello s2", "language": "en"})
            assert r2.status_code == 200

            h1 = client.get(f"/api/profiles/{pid}/sessions/{s1}/messages").json()
            h2 = client.get(f"/api/profiles/{pid}/sessions/{s2}/messages").json()

            assert any(m["content"] == "hello s1" for m in h1)
            assert not any(m["content"] == "hello s1" for m in h2)
            assert any(m["content"] == "hello s2" for m in h2)
            assert not any(m["content"] == "hello s2" for m in h1)
            # ensure no leak
            assert len(h1) == 2  # user + assistant
            assert len(h2) == 2

            client.delete(f"/api/profiles/{pid}")
    finally:
        chat_module.stream_chat = original


def test_translate_mocked():
    from unittest.mock import AsyncMock, patch

    with patch("app.routers.translate.complete_chat", new=AsyncMock(return_value="नमस्ते दुनिया")) as mock:
        with TestClient(app) as client:
            r = client.post("/api/translate", json={"text": "hello world", "target_language": "hi"})
            assert r.status_code == 200
            assert r.json()["translated"] == "नमस्ते दुनिया"
            mock.assert_awaited_once()
            # hinglish
            r2 = client.post("/api/translate", json={"text": "hello", "target_language": "hinglish", "provider": "gemini"})
            assert r2.status_code == 200
            assert "translated" in r2.json()
