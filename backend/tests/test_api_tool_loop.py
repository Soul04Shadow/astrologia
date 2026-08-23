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


def test_chat_tool_loop():
    import app.routers.chat as chat_module

    async def _fake_stream(messages, provider=None, tools=None, tool_choice=None):
        has_tool = any(m.get("role") == "tool" for m in messages)
        if has_tool:
            yield {"type": "delta", "content": "answer with June transit data"}
        else:
            yield {"type": "tool_calls", "tool_calls": [{"id": "1", "name": "get_transit", "arguments": '{"at_date":"2027-06-01"}'}]}

    original = chat_module.stream_chat
    chat_module.stream_chat = _fake_stream
    try:
        with TestClient(app) as client:
            pid = client.post("/api/profiles", json=PROFILE).json()["id"]
            r = client.post(f"/api/chat/{pid}", json={"message": "What happens in June 2027?", "language": "en"})
            assert r.status_code == 200
            events = [json.loads(line[5:]) for line in r.text.splitlines() if line.startswith("data:")]
            assert any(e.get("event") == "tool_call" for e in events), events
            # ensure data: {"event":"tool_call"} JSON using data: prefix
            raw_lines = [l for l in r.text.splitlines() if l.startswith("data:")]
            assert any('"event": "tool_call"' in l or '"event":"tool_call"' in l for l in raw_lines)
            deltas = "".join(e.get("delta", "") for e in events)
            assert "June" in deltas, deltas
            # DB saved assistant contains June
            history = client.get(f"/api/profiles/{pid}/messages").json()
            assert any("June" in m["content"] for m in history if m["role"] == "assistant")
            # session updated_at changed - check that sessions still accessible
            sess = client.get(f"/api/profiles/{pid}/sessions").json()
            assert len(sess) >= 1
            client.delete(f"/api/profiles/{pid}")
    finally:
        chat_module.stream_chat = original


def test_chat_tool_loop_error_handling():
    import app.routers.chat as chat_module

    async def _fake_stream_err(messages, provider=None, tools=None, tool_choice=None):
        has_tool = any(m.get("role") == "tool" for m in messages)
        if has_tool:
            yield {"type": "delta", "content": "fallback answer despite error"}
        else:
            yield {"type": "tool_calls", "tool_calls": [{"id": "1", "name": "get_transit", "arguments": '{"at_date":"bad-date"}'}]}

    original = chat_module.stream_chat
    chat_module.stream_chat = _fake_stream_err
    try:
        with TestClient(app) as client:
            pid = client.post("/api/profiles", json=PROFILE).json()["id"]
            r = client.post(f"/api/chat/{pid}", json={"message": "bad date test", "language": "en"})
            assert r.status_code == 200
            events = [json.loads(line[5:]) for line in r.text.splitlines() if line.startswith("data:")]
            assert any(e.get("event") == "error_tool" for e in events), events
            deltas = "".join(e.get("delta", "") for e in events)
            assert "fallback" in deltas
            client.delete(f"/api/profiles/{pid}")
    finally:
        chat_module.stream_chat = original
