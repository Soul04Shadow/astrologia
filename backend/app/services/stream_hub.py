from __future__ import annotations

import asyncio
import json
from datetime import datetime
from typing import AsyncGenerator

from app.db import ChatMessage, ChatSession, SessionLocal
from app.services.llm import LLMError, stream_chat
from app.services.tools import TOOLS, execute


class SessionStream:
    def __init__(self, key: str, profile_id: int, session_id: int):
        self.key = key
        self.profile_id = profile_id
        self.session_id = session_id
        self.events: list[dict] = []
        self.subscribers: set[asyncio.Queue] = set()
        self.is_done = False
        self.task: asyncio.Task | None = None
        self.created_at = datetime.utcnow()

    def push_event(self, ev: dict):
        self.events.append(ev)
        for q in list(self.subscribers):
            q.put_nowait(ev)

    def finish(self):
        self.is_done = True
        done_ev = {"event": "done"}
        self.events.append(done_ev)
        for q in list(self.subscribers):
            q.put_nowait(done_ev)

    def error(self, err_msg: str):
        self.is_done = True
        err_ev = {"event": "error", "detail": err_msg}
        self.events.append(err_ev)
        for q in list(self.subscribers):
            q.put_nowait(err_ev)

    async def stream_events(self) -> AsyncGenerator[str, None]:
        # 1. Replay historical events recorded so far
        for ev in list(self.events):
            yield f"data: {json.dumps(ev)}\n\n"
        if self.is_done:
            return

        # 2. Subscribe to live events
        q: asyncio.Queue = asyncio.Queue()
        self.subscribers.add(q)
        try:
            while not self.is_done:
                ev = await q.get()
                yield f"data: {json.dumps(ev)}\n\n"
                if ev.get("event") in ("done", "error"):
                    break
        finally:
            self.subscribers.discard(q)


class StreamHub:
    def __init__(self):
        self._streams: dict[str, SessionStream] = {}

    def key(self, profile_id: int, session_id: int) -> str:
        return f"{profile_id}:{session_id}"

    def get_stream(self, profile_id: int, session_id: int) -> SessionStream | None:
        k = self.key(profile_id, session_id)
        stream = self._streams.get(k)
        if stream and stream.is_done and (datetime.utcnow() - stream.created_at).total_seconds() > 300:
            self._streams.pop(k, None)
            return None
        return stream

    def is_active(self, profile_id: int, session_id: int) -> bool:
        s = self.get_stream(profile_id, session_id)
        return s is not None and not s.is_done

    def create_or_get_stream(self, profile_id: int, session_id: int) -> SessionStream:
        k = self.key(profile_id, session_id)
        existing = self._streams.get(k)
        if existing and not existing.is_done:
            return existing
        stream = SessionStream(k, profile_id, session_id)
        self._streams[k] = stream
        return stream

    def remove_stream(self, profile_id: int, session_id: int):
        self._streams.pop(self.key(profile_id, session_id), None)


hub = StreamHub()


def _get_stream_chat_fn():
    import app.routers.chat as chat_module
    return getattr(chat_module, "stream_chat", stream_chat)


async def _safe_stream(msgs, provider: str | None = None, model: str | None = None, tools: list[dict] | None = None, tool_choice: str | None = None, force_no_tool: bool = False):
    sc_fn = _get_stream_chat_fn()
    if force_no_tool:
        try:
            async for ev in sc_fn(msgs, provider=provider, model=model, tool_choice="none"):
                yield ev
            return
        except TypeError as e:
            msg = str(e)
            if "model" in msg or "tool_choice" in msg or "unexpected" in msg:
                try:
                    async for ev in sc_fn(msgs, provider=provider, tool_choice="none"):
                        yield ev
                    return
                except TypeError as e2:
                    if "tool_choice" in str(e2) or "unexpected" in str(e2):
                        async for ev in sc_fn(msgs, provider=provider):
                            yield ev
                        return
                    raise
            raise

    try:
        async for ev in sc_fn(msgs, provider=provider, model=model, tools=tools, tool_choice=tool_choice):
            yield ev
        return
    except TypeError as e:
        msg = str(e)
        if "model" in msg or "tools" in msg or "tool_choice" in msg or "unexpected" in msg:
            try:
                async for ev in sc_fn(msgs, provider=provider, tools=tools, tool_choice=tool_choice):
                    yield ev
                return
            except TypeError as e2:
                msg2 = str(e2)
                if "tools" in msg2 or "tool_choice" in msg2 or "unexpected" in msg2:
                    try:
                        async for ev in sc_fn(msgs, provider=provider, model=model):
                            yield ev
                        return
                    except TypeError as e3:
                        if "model" in str(e3) or "unexpected" in str(e3):
                            async for ev in sc_fn(msgs, provider=provider):
                                yield ev
                            return
                        raise
                raise
        raise


async def run_background_generation(
    stream: SessionStream,
    messages: list[dict],
    chart: dict,
    provider: str | None,
    model: str | None,
    language: str,
):
    saved_profile_id = stream.profile_id
    saved_session_id = stream.session_id
    saved_provider = provider or "zen"
    saved_model = model
    saved_language = language

    stream.push_event({"event": "start", "provider": saved_provider})

    full_reply: list[str] = []
    try:
        outer_messages = list(messages)
        use_tools = saved_provider != "gemini"

        for turn in range(5):
            got_tool_calls = None
            if use_tools:
                stream_iter = _safe_stream(outer_messages, provider=provider, model=saved_model, tools=TOOLS, tool_choice="auto")
            else:
                stream_iter = _safe_stream(outer_messages, provider=provider, model=saved_model)

            async for event in stream_iter:
                if isinstance(event, str):
                    full_reply.append(event)
                    stream.push_event({"delta": event})
                    continue
                if not isinstance(event, dict):
                    continue
                etype = event.get("type")
                if etype == "delta":
                    content = event.get("content") or ""
                    if content:
                        full_reply.append(content)
                        stream.push_event({"delta": content})
                elif etype == "reasoning":
                    r_content = event.get("content") or ""
                    if r_content:
                        stream.push_event({"event": "reasoning", "delta": r_content})
                elif etype == "tool_calls":
                    got_tool_calls = event.get("tool_calls") or []
                    break

            if got_tool_calls:
                if turn == 4:
                    try:
                        async for event in _safe_stream(outer_messages, provider=provider, model=saved_model, tool_choice="none", force_no_tool=True):
                            if isinstance(event, str):
                                full_reply.append(event)
                                stream.push_event({"delta": event})
                            elif isinstance(event, dict) and event.get("type") == "delta":
                                c = event.get("content") or ""
                                if c:
                                    full_reply.append(c)
                                    stream.push_event({"delta": c})
                    except LLMError as e:
                        stream.error(str(e))
                        return
                    break

                for tc in got_tool_calls:
                    tc_id = tc.get("id") or "call_0"
                    name = tc.get("name") or "unknown"
                    raw_args = tc.get("arguments") or "{}"
                    try:
                        args_obj = json.loads(raw_args) if isinstance(raw_args, str) else (raw_args or {})
                        if not isinstance(args_obj, dict):
                            args_obj = {}
                    except Exception:
                        args_obj = {}

                    stream.push_event({"event": "tool_call", "name": name, "args": args_obj})

                    try:
                        result = await execute(name, args_obj, chart)
                    except ValueError as ve:
                        stream.push_event({"event": "error_tool", "detail": str(ve)})
                        result = json.dumps({"error": str(ve)}, ensure_ascii=False)
                    except Exception as e:
                        stream.push_event({"event": "error_tool", "detail": str(e)})
                        result = json.dumps({"error": str(e)}, ensure_ascii=False)

                    try:
                        outer_messages.append({
                            "role": "assistant",
                            "tool_calls": [{"id": tc_id, "type": "function", "function": {"name": name, "arguments": raw_args if isinstance(raw_args, str) else json.dumps(raw_args)}}]
                        })
                    except Exception:
                        outer_messages.append({"role": "assistant", "content": ""})
                    outer_messages.append({"role": "tool", "tool_call_id": tc_id, "content": result})

                continue
            else:
                break

        content = "".join(full_reply)
        # Commit assistant reply to database
        db2 = SessionLocal()
        try:
            assistant_msg = ChatMessage(
                profile_id=saved_profile_id,
                session_id=saved_session_id,
                role="assistant",
                content=content,
                provider=saved_provider,
                language=saved_language,
            )
            db2.add(assistant_msg)
            sess = db2.get(ChatSession, saved_session_id)
            if sess:
                sess.updated_at = datetime.utcnow()
                db2.add(sess)
            db2.commit()
        finally:
            db2.close()

        stream.finish()
    except LLMError as e:
        stream.error(str(e))
    except Exception as e:
        stream.error(str(e))
