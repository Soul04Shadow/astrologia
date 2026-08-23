from __future__ import annotations

import asyncio
import inspect
import json
from datetime import datetime, timezone
from typing import AsyncGenerator

from app.db import ChatMessage, ChatSession, SessionLocal
from app.services.llm import LLMError, stream_chat
from app.services.tools import TOOLS, execute


class SessionStream:
    def __init__(self, profile_id: int, session_id: int):
        self.profile_id = profile_id
        self.session_id = session_id
        self.history: list[str] = []
        self.is_done = False
        self.error_msg: str | None = None
        self.queue: asyncio.Queue[str | None] = asyncio.Queue()
        self.created_at = datetime.now(timezone.utc)
        self.task: asyncio.Task | None = None

    def push_event(self, event_data: dict):
        line = f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
        self.history.append(line)
        self.queue.put_nowait(line)

    def finish(self):
        if not self.is_done:
            self.is_done = True
            done_line = f"data: {json.dumps({'event': 'done'})}\n\n"
            self.history.append(done_line)
            self.queue.put_nowait(done_line)
            self.queue.put_nowait(None)

    def error(self, err_msg: str):
        if not self.is_done:
            self.is_done = True
            self.error_msg = err_msg
            err_line = f"data: {json.dumps({'event': 'error', 'detail': err_msg}, ensure_ascii=False)}\n\n"
            self.history.append(err_line)
            self.queue.put_nowait(err_line)
            self.queue.put_nowait(None)

    async def stream_events(self) -> AsyncGenerator[str, None]:
        for line in self.history:
            yield line
        if self.is_done:
            return
        while True:
            item = await self.queue.get()
            if item is None:
                break
            yield item


class StreamHub:
    def __init__(self):
        self._streams: dict[str, SessionStream] = {}

    def key(self, profile_id: int, session_id: int) -> str:
        return f"{profile_id}:{session_id}"

    def get_stream(self, profile_id: int, session_id: int) -> SessionStream | None:
        self._cleanup_old_streams()
        return self._streams.get(self.key(profile_id, session_id))

    def create_or_get_stream(self, profile_id: int, session_id: int) -> SessionStream:
        self._cleanup_old_streams()
        k = self.key(profile_id, session_id)
        stream = self._streams.get(k)
        if stream and not stream.is_done:
            return stream
        new_stream = SessionStream(profile_id, session_id)
        self._streams[k] = new_stream
        return new_stream

    def is_active(self, profile_id: int, session_id: int) -> bool:
        stream = self._streams.get(self.key(profile_id, session_id))
        return stream is not None and not stream.is_done

    def _cleanup_old_streams(self):
        now = datetime.now(timezone.utc)
        to_delete = []
        for k, stream in self._streams.items():
            if stream.is_done and (now - stream.created_at).total_seconds() > 300:
                to_delete.append(k)
        for k in to_delete:
            self._streams.pop(k, None)

    def remove_stream(self, profile_id: int, session_id: int):
        self._streams.pop(self.key(profile_id, session_id), None)


hub = StreamHub()


def _get_stream_chat_fn():
    import app.routers.chat as chat_module
    return getattr(chat_module, "stream_chat", stream_chat)


async def _safe_stream(
    msgs: list[dict],
    provider: str | None = None,
    model: str | None = None,
    tools: list[dict] | None = None,
    tool_choice: str | None = None,
    force_no_tool: bool = False,
):
    sc_fn = _get_stream_chat_fn()
    sig = inspect.signature(sc_fn)
    params = sig.parameters
    kwargs: dict = {}
    if "provider" in params:
        kwargs["provider"] = provider
    if "model" in params and model is not None:
        kwargs["model"] = model
    if not force_no_tool:
        if "tools" in params and tools is not None:
            kwargs["tools"] = tools
        if "tool_choice" in params and tool_choice is not None:
            kwargs["tool_choice"] = tool_choice
    elif "tool_choice" in params:
        kwargs["tool_choice"] = "none"

    try:
        async for ev in sc_fn(msgs, **kwargs):
            yield ev
    except TypeError:
        # Fallback for minimal mocks
        fallback_kwargs: dict = {}
        if "provider" in params:
            fallback_kwargs["provider"] = provider
        async for ev in sc_fn(msgs, **fallback_kwargs):
            yield ev


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
                        async for event in _safe_stream(outer_messages, provider=provider, model=saved_model, force_no_tool=True):
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

                # Group all parallel tool calls according to OpenAI spec:
                # 1. ONE assistant message containing all tool_calls in the list
                # 2. Respective tool response messages for each tool_call_id
                assistant_tool_calls = []
                tool_response_messages = []

                for tc in got_tool_calls:
                    tc_id = tc.get("id") or f"call_{len(assistant_tool_calls)}"
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

                    assistant_tool_calls.append({
                        "id": tc_id,
                        "type": "function",
                        "function": {
                            "name": name,
                            "arguments": raw_args if isinstance(raw_args, str) else json.dumps(raw_args),
                        },
                    })
                    tool_response_messages.append({
                        "role": "tool",
                        "tool_call_id": tc_id,
                        "content": result,
                    })

                outer_messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": assistant_tool_calls,
                })
                outer_messages.extend(tool_response_messages)
                continue
            else:
                break

        content = "".join(full_reply)
        # Commit assistant reply to database only if non-empty
        if content.strip():
            db2 = SessionLocal()
            try:
                assistant_msg = ChatMessage(
                    profile_id=saved_profile_id,
                    session_id=saved_session_id,
                    role="assistant",
                    content=content,
                    provider=provider,
                    language=saved_language,
                )
                db2.add(assistant_msg)
                sess = db2.query(ChatSession).filter(ChatSession.id == saved_session_id).first()
                if sess:
                    sess.updated_at = datetime.now(timezone.utc)
                db2.commit()
            finally:
                db2.close()

        stream.finish()

    except LLMError as e:
        stream.error(str(e))
    except Exception as e:
        stream.error(f"Unexpected error: {e}")
