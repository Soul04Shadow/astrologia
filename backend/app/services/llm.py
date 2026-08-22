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
                      temperature: float | None = None) -> AsyncGenerator[str, None]:
    cfg = provider_config(provider)
    s = get_settings()
    payload = {"model": cfg["model"], "messages": messages,
               "temperature": temperature if temperature is not None else s.temperature,
               "stream": True}
    url = f"{cfg['base_url']}/chat/completions"
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", url, json=payload, headers=_headers(cfg)) as resp:
                if resp.status_code != 200:
                    body = (await resp.aread()).decode(errors="replace")[:500]
                    raise LLMError(f"Provider '{cfg['name']}' HTTP {resp.status_code}: {body}")
                async for line in resp.aiter_lines():
                    line = line.strip()
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0].get("delta", {}).get("content")
                        if delta:
                            yield delta
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
    except httpx.HTTPError as e:
        raise LLMError(f"Could not reach provider '{cfg['name']}' at {url}: {e}") from e


async def complete_chat(messages: list[dict], provider: str | None = None,
                        temperature: float | None = None) -> str:
    cfg = provider_config(provider)
    url = f"{cfg['base_url']}/chat/completions"
    payload = {"model": cfg["model"], "messages": messages,
               "temperature": temperature if temperature is not None else get_settings().temperature}
    try:
        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(url, json=payload, headers=_headers(cfg))
            if resp.status_code != 200:
                raise LLMError(f"Provider '{cfg['name']}' HTTP {resp.status_code}: {resp.text[:500]}")
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except httpx.HTTPError as e:
        raise LLMError(f"Could not reach provider '{cfg['name']}' at {url}: {e}") from e
