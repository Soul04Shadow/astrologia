---
slug: chat-model-selector
status: awaiting-approval
intent: clear
pending-action: write .omo/plans/chat-model-selector.md
approach: Branch fix/chat-model-picker from fix/tools-deep:3eda3ea — add curated free model catalog per provider (zen/nvidia/groq/openrouter) in backend, expose GET /api/models?provider=, accept per-request model override in POST /api/chat, rebuild chat header to two selects (Provider → Model) with best-free list, persist choice per session.
---

# Draft: chat-model-selector

## Components (topology ledger)

| id | outcome | status | evidence |
|----|---------|--------|----------|
| C1 Model catalog backend | `app/services/catalog.py` curated list per provider + `GET /api/models` filtered by provider | active | backend/app/config.py provider_config, docs/providers.md live lists, frontend chat provider dropdown alone |
| C2 Chat model override | `POST /api/chat/{id}` accepts `{"provider","model"}` and uses `provider_config` override for that call | active | backend/app/routers/chat.py:44 chat(), backend/app/services/llm.py:19 stream_chat |
| C3 Chat UI provider+model picker | Header two selects: Provider then Model (model list filtered to chosen provider, shows free tag, ctx) | active | frontend/src/app/chat/[id]/page.tsx: provider select line 60, api.ts |

## Open assumptions (announced defaults)

| assumption | adopted default | rationale | reversible? |
|---|---|---|---|
| branch | fix/chat-model-picker from 3eda3ea | stepwise | yes |
| catalog source | hard-coded curated list in backend (not live fetch) per provider — 3-5 best free per provider | avoids external call latency, matches docs/providers.md live scan | yes |
| model choice | user picks per chat session (combo), sent per request as `model` field — not sticky env | allows A/B testing per question | yes |

## Findings (cited - path:lines)
- `frontend/src/app/chat/[id]/page.tsx:60` provider `<select>` only, model is `config.py:provider_config(provider)["model"]` from env — cannot pick `ox-alpha-free` vs `big-pickle` per chat without env change.
- `backend/app/config.py:45 provider_config` builds `base_url/api_key/model` from `Settings` — model override not supported; need `provider_config(provider, model_override)`.
- `backend/app/routers/chat.py:44` `ChatRequest` has `provider` but no `model`; `frontend/src/app/chat/[id]/page.tsx:114` `payload {message, language, provider}` sends provider only.
- Curated best free per provider from 2026-08 scan: zen: `ox-alpha-free` (1M), `big-pickle`, `mimo-v2.5-free` (1M), `nemotron-3-ultra-free`; nvidia: `nvidia/nemotron-3-ultra-550b-a55b`, `meta/llama-3.3-70b-instruct`, `deepseek/deepseek-v4`; groq: `llama-3.3-70b-versatile`, `qwen/qwen3-32b`, `openai/gpt-oss-120b`, `llama-3.1-8b-instant` (14K RPD); openrouter: `stealth/ox-alpha:free`, `nvidia/nemotron-3-ultra:free`, `qwen/qwen3-coder:free`.

## Decisions (with rationale)
1. Curated hard-coded catalog in `catalog.py` per provider (5 each) with `{id, label, ctx, free: true, tools: true}` — live `GET /api/models?provider=zen` filters, no external fetch.
2. ChatRequest add optional `model: str|None`, `provider_config(provider, model_override)` returns overridden model for that call only, keep env fallback.
3. UI: two selects side-by-side, Model list updates when Provider changes, shows `ctx` + `FREE` badge, persists `provider+model` in `localStorage` per profile.

## Scope IN
- backend catalog + models endpoint + chat model override
- frontend api.ts listModels + chat header provider+model picker

## Scope OUT (Must NOT have)
- NO new engine/math
- NO hosting/auth

## Open questions
- none

## Approval gate
status: awaiting-approval
pending action: write .omo/plans/chat-model-selector.md per approach above.

