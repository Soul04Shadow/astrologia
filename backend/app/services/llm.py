from __future__ import annotations

import json
from collections.abc import AsyncGenerator

import httpx

from app.config import get_settings, provider_config


class LLMError(RuntimeError):
    pass


def _headers(cfg: dict) -> dict:
    return {"Authorization": f"Bearer {cfg['api_key']}", "Content-Type": "application/json"}


async def stream_chat(messages: list[dict], provider: str | None = None,
                      temperature: float | None = None,
                      tools: list[dict] | None = None,
                      tool_choice: str | None = None,
                      model: str | None = None) -> AsyncGenerator[dict, None]:
    cfg = provider_config(provider, model)
    s = get_settings()
    payload: dict = {"model": model or cfg["model"], "messages": messages,
               "temperature": temperature if temperature is not None else s.temperature,
               "stream": True}
    if tools is not None:
        payload["tools"] = tools
    if tool_choice is not None:
        payload["tool_choice"] = tool_choice
    url = f"{cfg['base_url']}/chat/completions"
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", url, json=payload, headers=_headers(cfg)) as resp:
                if resp.status_code != 200:
                    body = (await resp.aread()).decode(errors="replace")[:500]
                    raise LLMError(f"Provider '{cfg['name']}' HTTP {resp.status_code}: {body}")
                # fragment buffer for tool_calls
                buffer: dict[int, dict] = {}
                async for line in resp.aiter_lines():
                    line = line.strip()
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        choice = chunk["choices"][0] if chunk.get("choices") else {}
                        delta = choice.get("delta", {}) or {}
                        finish_reason = choice.get("finish_reason")
                        # content delta
                        content = delta.get("content")
                        if content:
                            yield {"type": "delta", "content": content}
                        # tool_calls fragments
                        tcs = delta.get("tool_calls")
                        if tcs:
                            for tc in tcs:
                                idx = tc.get("index", 0)
                                if idx not in buffer:
                                    buffer[idx] = {"id": None, "name": None, "arguments": ""}
                                if tc.get("id"):
                                    buffer[idx]["id"] = tc["id"]
                                # function may be nested
                                fn = tc.get("function") or {}
                                if fn.get("name"):
                                    buffer[idx]["name"] = fn["name"]
                                if fn.get("arguments"):
                                    buffer[idx]["arguments"] += fn["arguments"]
                                # fallback flat fields (some providers)
                                if tc.get("name"):
                                    buffer[idx]["name"] = tc["name"]
                                if isinstance(tc.get("arguments"), str) and "function" not in tc:
                                    buffer[idx]["arguments"] += tc["arguments"]
                        # on finish_reason tool_calls, yield aggregated
                        if finish_reason == "tool_calls":
                            calls = []
                            for idx in sorted(buffer.keys()):
                                b = buffer[idx]
                                arg_str = b["arguments"] or "{}"
                                # ensure valid json, if not keep raw (will be validated by executor)
                                calls.append({"id": b["id"] or f"call_{idx}", "name": b["name"] or "unknown", "arguments": arg_str})
                            if calls:
                                yield {"type": "tool_calls", "tool_calls": calls}
                            buffer.clear()
                        elif finish_reason and buffer:
                            # if finished but buffer has complete JSON, yield it (fragment-safe)
                            try:
                                # check if all buffered arguments are valid JSON
                                all_valid = True
                                for b in buffer.values():
                                    json.loads(b["arguments"] or "{}")
                                # if valid, yield
                                calls = []
                                for idx in sorted(buffer.keys()):
                                    b = buffer[idx]
                                    calls.append({"id": b["id"] or f"call_{idx}", "name": b["name"] or "unknown", "arguments": b["arguments"] or "{}"})
                                if calls and any(c["name"] != "unknown" for c in calls):
                                    yield {"type": "tool_calls", "tool_calls": calls}
                                    buffer.clear()
                            except (json.JSONDecodeError, TypeError):
                                # incomplete fragments, keep buffering (will try again next chunk or final)
                                pass
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
                # after stream end, if buffer still has pending tool_calls not yet yielded (e.g., provider didn't set finish_reason)
                if buffer:
                    # attempt to yield if we have at least one complete JSON
                    try:
                        calls = []
                        has_name = False
                        for idx in sorted(buffer.keys()):
                            b = buffer[idx]
                            arg_str = b["arguments"] or "{}"
                            # try parse; if fails, treat as incomplete
                            json.loads(arg_str)
                            if b["name"]:
                                has_name = True
                            calls.append({"id": b["id"] or f"call_{idx}", "name": b["name"] or "unknown", "arguments": arg_str})
                        if calls and has_name:
                            yield {"type": "tool_calls", "tool_calls": calls}
                    except (json.JSONDecodeError, TypeError):
                        # ignore incomplete
                        pass
    except httpx.HTTPError as e:
        raise LLMError(f"Could not reach provider '{cfg['name']}' at {url}: {e}") from e


async def complete_chat(messages: list[dict], provider: str | None = None,
                        temperature: float | None = None,
                        tools: list[dict] | None = None,
                        tool_choice: str | None = None,
                        model: str | None = None) -> str:
    cfg = provider_config(provider, model)
    url = f"{cfg['base_url']}/chat/completions"
    payload: dict = {"model": model or cfg["model"], "messages": messages,
               "temperature": temperature if temperature is not None else get_settings().temperature}
    if tools is not None:
        payload["tools"] = tools
    if tool_choice is not None:
        payload["tool_choice"] = tool_choice
    try:
        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(url, json=payload, headers=_headers(cfg))
            if resp.status_code != 200:
                raise LLMError(f"Provider '{cfg['name']}' HTTP {resp.status_code}: {resp.text[:500]}")
            data = resp.json()
            # if tool_calls present, return content anyway (caller may handle)
            msg = data["choices"][0].get("message", {})
            # handle tool_calls in non-streaming: if present, return json dumps? but keep backward compat returning content
            content = msg.get("content")
            if content is not None:
                return content
            # if no content but tool_calls, return serialized tool_calls
            if msg.get("tool_calls"):
                return json.dumps(msg["tool_calls"])
            return ""
    except httpx.HTTPError as e:
        raise LLMError(f"Could not reach provider '{cfg['name']}' at {url}: {e}") from e
