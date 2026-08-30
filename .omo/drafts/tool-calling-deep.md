---
slug: tool-calling-deep
status: awaiting-approval
intent: clear
pending-action: write .omo/plans/tool-calling-deep.md
approach: Branch fix/tools-deep from fix/chat-sessions:bb12201 — add OpenAI function-tools registry (6 tools on existing engine: get_transit, get_panchang, get_dasha_at, get_yogas, get_navamsa, get_chart_snapshot), wire chat router to tool-loop (auto tool_choice, intercept tool_calls → execute engine → append tool results → restream), expose streaming tool chips to frontend, keep grounding prompt unchanged.
---

# Draft: tool-calling-deep

## Components (topology ledger)

| id | outcome | status | evidence |
|----|---------|--------|----------|
| C1 Tool registry + engine wrappers | File `app/services/tools.py` defines 6 OpenAI function specs + python executors using existing engine (no new math) | active | backend/app/engine/core.py, transits.py, panchang.py, dasha.py, yogas.py, navamsa.py; llm.py stream_chat payload |
| C2 Chat tool-loop | `routers/chat.py` handles `tool_calls` streaming, executes locally, re-streams with tool outputs until stop; updates session updated_at; preserves SSE | active | backend/app/routers/chat.py:52 event_stream, backend/app/services/llm.py:19 stream_chat |
| C3 Frontend tool chips | Chat UI shows `🔧 consulted X` chip per tool call, collapsible raw args, no break to existing markdown | active | frontend/src/app/chat/[id]/page.tsx: streaming |
| C4 Deep reasoning prompt tweak | System prompt adds "Think step-by-step, call a tool if you need a calculation at another date before answering" — no new instruction beyond tool use | active | backend/app/services/prompt.py:42 persona+guardrails |

## Open assumptions (announced defaults)

| assumption | adopted default | rationale | reversible? |
|---|---|---|---|
| branch | fix/tools-deep from fix/chat-sessions:bb12201 | stepwise, A green | yes |
| tool set v1 | 6 tools only on already-verified engine (transit, panchang, dasha_at, yogas, navamsa, chart_snapshot) — dosha tools deferred to Track B | zero new astro correctness risk | yes |
| LLM tool_choice | "auto" | lets model decide deep vs direct answer | yes |
| streaming | tool_calls may arrive as non-delta chunks; backend yields `event: tool_call` then re-streams final answer as normal deltas | keeps frontend simple | yes |

## Findings (cited - path:lines)
- `backend/app/services/llm.py:19 stream_chat(messages, provider)` builds `payload {model, messages, temperature, stream:true}` but never sends `tools` — OpenAI compat providers (Gemini via https://generativelanguage.googleapis.com/v1beta/openai, Groq, OpenRouter) support `tools`+`tool_choice` + `tool_calls` in streaming deltas per OpenAI spec (Gemini OpenAI compat docs verify).
- `backend/app/routers/chat.py:48 messages=[system,*history,user]` is static snapshot at request start; no way to ask for transit on another date without new calculation. Fix is tool-loop.
- Engine already provides all needed calcs: `core.py:102 raw_positions(jd)` + `compute_d1`, `transits.py:10 compute_transits(when_utc)`, `panchang.py:53 panchang_for`, `dasha.py:58 current_period`, `yogas.py:21 detect_yogas`, `navamsa.py:4 navamsa_table` — wrappers just serialize with `tz_name/lat/lon` already in `Chart.birth_details`.
- Frontend `chat/[id]/page.tsx:99 send()` streams `data: {delta}` and `event: done/error`; no handling for `tool_call` today — additive change is a new event type.

## Decisions (with rationale)
1. 6 tools only, all engine-backed — no LLM hallucination; dosha tools added later when Track B merges, no prompt change then.
2. Backend tool-loop in `routers/chat.py:event_stream` not in `services/llm.py` — keeps `stream_chat` generic (add `tools` param), router owns decision to re-stream.
3. Frontend chips are UI-only, no state change to session continuity.

## Scope IN
- backend/app/services/tools.py (specs + executors)
- backend/app/routers/chat.py tool-loop + tools param to llm
- backend/app/services/llm.py add tools passthrough
- backend/app/services/prompt.py one-line deep-reasoning hint
- frontend tool chip rendering

## Scope OUT (Must NOT have)
- NO dosha/Shadbala math (Track B)
- NO vector DB/RAG
- NO hosting/auth

## Open questions
- none

## Approval gate
status: awaiting-approval
pending action: write .omo/plans/tool-calling-deep.md per approach above.

