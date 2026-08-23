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
            raw_lines = [l for l in r.text.splitlines() if l.startswith("data:")]
            assert any('"event": "tool_call"' in l or '"event":"tool_call"' in l for l in raw_lines)
            deltas = "".join(e.get("delta", "") for e in events)
            assert "June" in deltas, deltas
            history = client.get(f"/api/profiles/{pid}/messages").json()
            assert any("June" in m["content"] for m in history if m["role"] == "assistant")
            sess = client.get(f"/api/profiles/{pid}/sessions").json()
            assert len(sess) >= 1
            client.delete(f"/api/profiles/{pid}")
    finally:
        chat_module.stream_chat = original


def test_chat_parallel_multi_tool_calls_openai_spec():
    """
    Test Issue A: Multi-tool-call message grouping must conform to OpenAI specification:
    A single assistant message containing the array of all tool_calls,
    followed by corresponding tool messages with matching tool_call_ids.
    """
    import app.routers.chat as chat_module

    received_history_snapshots = []

    async def _fake_stream_parallel(messages, provider=None, tools=None, tool_choice=None):
        received_history_snapshots.append(list(messages))
        has_tool = any(m.get("role") == "tool" for m in messages)
        if has_tool:
            yield {"type": "delta", "content": "Both Ashtakavarga and Shadbala analysis calculated successfully."}
        else:
            yield {
                "type": "tool_calls",
                "tool_calls": [
                    {"id": "call_av_1", "name": "get_ashtakavarga", "arguments": "{}"},
                    {"id": "call_sb_2", "name": "get_shadbala", "arguments": "{}"},
                ],
            }

    original = chat_module.stream_chat
    chat_module.stream_chat = _fake_stream_parallel
    try:
        with TestClient(app) as client:
            pid = client.post("/api/profiles", json=PROFILE).json()["id"]
            r = client.post(f"/api/chat/{pid}", json={"message": "Analyze both Ashtakavarga and Shadbala", "language": "en"})
            assert r.status_code == 200
            events = [json.loads(line[5:]) for line in r.text.splitlines() if line.startswith("data:")]
            
            tool_call_events = [e for e in events if e.get("event") == "tool_call"]
            assert len(tool_call_events) == 2
            assert tool_call_events[0]["name"] == "get_ashtakavarga"
            assert tool_call_events[1]["name"] == "get_shadbala"

            # Check structure of messages passed to 2nd turn
            assert len(received_history_snapshots) == 2
            second_turn_msgs = received_history_snapshots[1]
            
            # Find the assistant message with tool calls
            assistant_tool_msgs = [m for m in second_turn_msgs if m.get("role") == "assistant" and "tool_calls" in m]
            assert len(assistant_tool_msgs) == 1, "There MUST be exactly 1 assistant message containing the parallel tool calls"
            assert len(assistant_tool_msgs[0]["tool_calls"]) == 2
            assert assistant_tool_msgs[0]["tool_calls"][0]["id"] == "call_av_1"
            assert assistant_tool_msgs[0]["tool_calls"][1]["id"] == "call_sb_2"

            # Check matching tool response messages
            tool_msgs = [m for m in second_turn_msgs if m.get("role") == "tool"]
            assert len(tool_msgs) == 2
            assert tool_msgs[0]["tool_call_id"] == "call_av_1"
            assert "ashtakavarga" in tool_msgs[0]["content"]
            assert tool_msgs[1]["tool_call_id"] == "call_sb_2"
            assert "shadbala" in tool_msgs[1]["content"]

            deltas = "".join(e.get("delta", "") for e in events)
            assert "Ashtakavarga and Shadbala" in deltas
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
