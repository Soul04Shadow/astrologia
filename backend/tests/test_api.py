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
        assert {"gemini", "groq", "openrouter", "lmstudio", "ollama"} <= set(ids)


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
