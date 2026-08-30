# chat-model-selector - Work Plan

## TL;DR (For humans)
**What you'll get:** In the chat header you can pick both **Provider** (Zen / Nvidia / Groq / OpenRouter / Gemini) **and** the exact model (Ox Alpha, Nemotron, Llama 3.3, Qwen3…) from a short best-free list per provider — no more editing `.env` to try a model.

**Why this approach:** Curated hard-coded catalog per provider (5 best frees, 1M/262K ctx noted) + per-request `model` override keeps it fast and reversible; tool-calling stays live on all except Gemini.

**What it will NOT do:** No new astro math, no live catalog fetch, no hosting change.

**Effort:** Short (4 todos + final, half day)
**Risk:** Low — additive `model` param, fallback to env model if omitted
**Decisions to sanity-check:** Curated list per provider ok? Model choice per chat (not global) ok?

Your next move: approve this plan for `fix/chat-model-picker` from `3eda3ea`, or request high-accuracy review.

---

> TL;DR (machine): Short/Low — provider→model picker with curated free catalog + per-request model override, branch fix/chat-model-picker

## Scope
### Must have
- Branch `fix/chat-model-picker` from `fix/tools-deep:3eda3ea`
- `backend/app/services/catalog.py` curated `CATALOG: dict[provider, list[{id,label,ctx,free,tools}]]` for zen/nvidia/groq/openrouter/gemini (4-5 each, tool-capable flagged)
- `backend/app/routers/models.py` `GET /api/models?provider=zen` filters catalog; `GET /api/models` returns all
- `backend/app/config.py:provider_config(provider, model_override=None)` returns overridden model for that call
- `backend/app/schemas.py:ChatRequest` add `model: str|None` optional; `routers/chat.py:44` uses `provider_config(payload.provider, payload.model)` for `model` and passes `model` into `stream_chat` payload
- `frontend/src/lib/api.ts` add `listModels(provider?)` and `api.translate` keeps working; `frontend/src/app/chat/[id]/page.tsx` header two selects: Provider dropdown (from `/api/providers`) → Model dropdown populated from `/api/models?provider=` (shows label + ctx + FREE badge), persists `provider+model` in `localStorage` `chat:model:{id}`, sends `{message, language, provider, model}` per send

### Must NOT have (guardrails, anti-slop, scope boundaries)
- NO engine math/hosting/auth
- NO live fetch of OpenRouter/Nvidia catalog — curated list only
- NO committing .env/app.db

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: tests-after + pytest (catalog + model override) + next build
- Framework: `pytest` + `next build` + TestClient
- Evidence: `.omo/evidence/task-<N>-chat-model-selector.log`

## Execution strategy
### Parallel execution waves
Wave 1: T1 branch, T2 catalog + models endpoint — sequential. Wave 2: T3 chat model override (depends T2), T4 frontend picker (depends T3).

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 Branch | — | 2,3,4 | — |
| 2 Catalog + models endpoint | 1 | 3,4 | — |
| 3 Chat model override | 2 | 4 | — |
| 4 Frontend picker | 3 | — | — |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [ ] 1. Branch fix/chat-model-picker
  What to do: `git status` clean except .omo, `git branch --show-current` is `fix/tools-deep`, run `git checkout -b fix/chat-model-picker` (fallback checkout if exists). Must NOT edit files.
  Parallelization: Wave 1 | Blocked by: — | Blocks: 2,3,4
  References: fix/tools-deep:3eda3ea, .omo/plans/chat-model-selector.md
  Acceptance criteria: `git branch --show-current` == `fix/chat-model-picker`; `git log --oneline -1` parent is 3eda3ea
  QA scenarios: happy branch created; failure branch exists → checkout; Evidence .omo/evidence/task-1-chat-model-selector.log
  Commit: N | —

- [ ] 2. Catalog + models endpoint
  What to do: Create `backend/app/services/catalog.py` with `CATALOG: dict[str, list[dict]] = {"zen": [{"id":"ox-alpha-free","label":"Ox Alpha","ctx":"1M","free":True,"tools":True}, {"id":"big-pickle","label":"Big Pickle","ctx":"1M","free":True,"tools":True}, {"id":"mimo-v2.5-free","label":"MiMo-V2.5","ctx":"1M","free":True,"tools":True}, {"id":"hy3-free","label":"Hy3","ctx":"256K","free":True,"tools":True}, {"id":"nemotron-3-ultra-free","label":"Nemotron 3 Ultra","ctx":"1M","free":True,"tools":True}], "nvidia": [{"id":"nvidia/nemotron-3-ultra-550b-a55b","label":"Nemotron 3 Ultra 550B","ctx":"1M","free":True,"tools":True}, {"id":"meta/llama-3.3-70b-instruct","label":"Llama 3.3 70B","ctx":"128K","free":True,"tools":True}, {"id":"deepseek/deepseek-v4","label":"DeepSeek V4","ctx":"1M","free":True,"tools":True}, {"id":"z-ai/glm-5.2","label":"GLM-5.2","ctx":"1M","free":True,"tools":True}], "groq": [{"id":"llama-3.3-70b-versatile","label":"Llama 3.3 70B Versatile","ctx":"128K","free":True,"tools":True}, {"id":"qwen/qwen3-32b","label":"Qwen3 32B","ctx":"128K","free":True,"tools":True}, {"id":"openai/gpt-oss-120b","label":"GPT-OSS 120B","ctx":"128K","free":True,"tools":True}, {"id":"llama-3.1-8b-instant","label":"Llama 3.1 8B Instant","ctx":"128K","free":True,"tools":True}, {"id":"meta-llama/llama-4-scout-17b-16e-instruct","label":"Llama 4 Scout","ctx":"128K","free":True,"tools":True}], "openrouter": [{"id":"stealth/ox-alpha:free","label":"Ox Alpha Free","ctx":"1M","free":True,"tools":True}, {"id":"nvidia/nemotron-3-ultra:free","label":"Nemotron 3 Ultra Free","ctx":"1M","free":True,"tools":True}, {"id":"qwen/qwen3-coder:free","label":"Qwen3 Coder","ctx":"1M","free":True,"tools":True}, {"id":"openai/gpt-oss-20b:free","label":"GPT-OSS 20B Free","ctx":"131K","free":True,"tools":True}], "gemini": [{"id":"gemini-2.5-flash","label":"Gemini 2.5 Flash","ctx":"1M","free":True,"tools":False}], "lmstudio": [{"id":"lm-studio","label":"LM Studio Local","ctx":"32K","free":True,"tools":False}], "ollama": [{"id":"qwen2.5:7b","label":"Qwen2.5 7B","ctx":"32K","free":True,"tools":False}]} ` — 4-5 each, uniform dict with id/label/ctx/free/tools (tools false only for gemini/lmstudio/ollama). For lmstudio/ollama return env-driven single entry, not 400. Create `backend/app/routers/models.py` `GET /api/models?provider=` that returns `CATALOG[provider]` if provider else flattened all; register in `backend/app/main.py` via `from app.routers import models` + `app.include_router(models.router, prefix="/api")`. Unknown provider outside catalog → 400.
  Parallelization: Wave 1 | Blocked by: 1 | Blocks: 3,4
  References: backend/app/config.py:53 provider_config, docs/providers.md live lists, backend/app/main.py:11 include_router, backend/app/services/catalog.py
  Acceptance criteria: `workdir: backend` `.\.venv\Scripts\python.exe -c "from app.services.catalog import CATALOG; assert 'zen' in CATALOG and len(CATALOG['zen'])==5 and CATALOG['gemini'][0]['tools']==False"`; TestClient `GET /api/models?provider=zen` returns list with `ox-alpha-free`; `GET /api/models?provider=groq` returns 5 dicts with `tools==True`; `GET /api/models` returns >12 items
  QA scenarios: happy catalog filtered 5 zen with tools true; failure unknown provider `?provider=unknown123` → 400 with detail; Evidence .omo/evidence/task-2-chat-model-selector.log
  Commit: N | —

- [ ] 3. Chat model override
  What to do: In `backend/app/config.py:53` change `def provider_config(provider: str|None=None, model: str|None=None)` to accept optional `model` override: if `model` is not None use it else `getattr(s, f"{name}_model")`. In `backend/app/schemas.py:ChatRequest` add `model: str|None = Field(default=None)`. In `backend/app/services/llm.py:19` add `model: str|None=None` to `stream_chat(messages, provider=None, temperature=None, tools=None, tool_choice=None, model=None)` and `complete_chat` similarly: set `payload["model"] = model or cfg["model"]` (use passed model if not None else cfg model) and `payload["tools"]=tools` only if not None. In `backend/app/routers/chat.py:43` `chat()` use `cfg = provider_config(payload.provider, payload.model)` and call `_safe_stream(outer_messages, provider=payload.provider, model=cfg["model"], tools=TOOLS, tool_choice="auto")` — update `_safe_stream(msgs, provider, model, tools, tool_choice)` to forward `model`. Keep backward compat: `model=None` falls back to env.
  Parallelization: Wave 2 | Blocked by: 2 | Blocks: 4
  References: backend/app/config.py:53 provider_config, backend/app/schemas.py:43 ChatRequest, backend/app/routers/chat.py:43 chat(), backend/app/services/llm.py:19 stream_chat, backend/app/services/llm.py:51 complete_chat
  Acceptance criteria: `workdir: backend` `.\.venv\Scripts\python.exe -c "from app.config import provider_config; assert provider_config('zen','big-pickle')['model']=='big-pickle'; assert 'model' in __import__('inspect').signature(__import__('app.services.llm', fromlist=['stream_chat']).stream_chat).parameters"`; TestClient `POST /api/chat/{id}` with `{"provider":"groq","model":"qwen/qwen3-32b","message":"hi","language":"en"}` mock asserts `stream_chat` received `model=="qwen/qwen3-32b"`; without `model` uses env `llama-3.3-70b-versatile`
  QA scenarios: happy model override respected via mock inspect; failure no model still uses env model not None; Evidence .omo/evidence/task-3-chat-model-selector.log
  Commit: N | —

- [ ] 4. Frontend provider→model picker
  What to do: In `frontend/src/lib/api.ts` add `listModels(provider?: string)` → `GET /api/models?provider=...`. In `frontend/src/app/chat/[id]/page.tsx:387` replace single provider `<select>` with two side-by-side selects: left Provider (from `/api/providers`), right Model (from `listModels(provider)` filtered, shows `label ctx FREE` badge, tool flag). On Provider change, reset Model to first in new list. Persist `provider+model` combo in `localStorage` key `chat:model:{id}` and load on mount. `send()` posts `{message, language, provider, model}`. Keep existing `language`, `translatedCache`, streaming, chips. Must NOT break when `listModels` empty.
  Parallelization: Wave 2 | Blocked by: 3 | Blocks: —
  References: frontend/src/app/chat/[id]/page.tsx:387 provider select, frontend/src/lib/api.ts listModels, backend/app/routers/models.py, backend/app/config.py
  Acceptance criteria: `workdir: frontend` `npm.cmd run build` passes 0 errors; automated: grep -c '"model"' frontend/src/app/chat/\[id\]/page\.tsx verifies model in payload + TestClient POST /api/chat/\{id\} with model asserts stream_chat received model, without model uses env model not None, plus npm build 0
  QA scenarios: happy provider→model filtered; failure listModels 404 still shows provider only; Evidence .omo/evidence/task-4-chat-model-selector.log
  Commit: Y | feat(chat): provider+model picker with curated free catalog

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit — all Must have on fix/chat-model-picker present, no engine/hosting creep
- [ ] F2. Code quality review — catalog tool flags correct, provider_config override backward compat, no secrets
- [ ] F3. Real manual QA — chat header shows Provider+Model, switching model changes payload, tool chips still work, sessions/translation still work
- [ ] F4. Scope fidelity — fix/chat-model-picker is revertible atop 3eda3ea, master untouched

## Commit strategy
- One commit on `fix/chat-model-picker` at T4: `feat(chat): provider+model picker with curated free catalog`

## Success criteria
- `git branch --show-current` == `fix/chat-model-picker`, `pytest` passes (new catalog test), `next build` 0
- User can in chat header pick Provider Zen → Model Ox Alpha vs Big Pickle vs Nemotron, pick Nvidia → Nemotron vs Llama 3.3, pick Groq → llama-3.3-70b vs qwen3-32b, pick OpenRouter → ox-alpha:free vs qwen3-coder:free, and each send uses that exact model
- No regression: sessions, translation, D1/D9, tool-loop still work; `provider` only payload still falls back to env model
