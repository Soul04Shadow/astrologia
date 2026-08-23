# chat-sessions-translation - Work Plan

## TL;DR (For humans)
**What you'll get:** Each kundli can have many separate chat threads like ChatGPT (new chat, switch, rename, delete), each thread keeps its own history so questions stay on topic. Clicking Hinglish/हिंदी/English now actually re-renders the whole visible chat in that language (not just the next reply). The top-right EN↔हिंदी toggle now properly translates the whole app including chart terms.

**Why this approach:** Today all messages for a person are one big thread and the language buttons only affect the *next* answer. Adding a `ChatSession` table per profile fixes continuity and navigation; adding a small `/translate` proxy that re-uses your Gemini/Groq key fixes retro-translation without new services.

**What it will NOT do:** No new astrology math (doshas etc. — Track B), no permanent translation storage, no auth/hosting changes.

**Effort:** Medium (7 todos + final wave, 1-2 days)
**Risk:** Medium - DB migration adds FK; mitigated by auto-migrating existing messages to a default session and keeping old endpoint as alias
**Decisions to sanity-check:** Session title = first user message 40 chars ok? Translation re-uses same LLM provider (no extra key) ok?

Your next move: approve this plan, then worker builds fix/chat-sessions from harden/v1-a. Or request high-accuracy review.

---

> TL;DR (machine): Medium/Medium - per-profile ChatSession threads + session-aware chat SSE + retro-translation proxy + AppShell locale fix, branch fix/chat-sessions

## Scope
### Must have
- Branch `fix/chat-sessions` from `harden/v1-a:444e4a8` before edits
- Backend: `ChatSession` model (`id` PK, `profile_id` FK `profiles.id` ondelete CASCADE, `title` String(80), `created_at` DateTime default utcnow, `updated_at` DateTime default utcnow onupdate utcnow) + `ChatMessage.session_id` FK `chat_sessions.id` ondelete CASCADE nullable index + `ChatSession.messages` cascade all delete-orphan + `Profile.sessions` cascade; migration helper idempotent: for each profile ensure default "First consultation" session exists, then `UPDATE chat_messages SET session_id=default WHERE session_id IS NULL`; `init_db` does `Base.metadata.create_all` plus column-exists check for existing DB
- Endpoints: `POST /api/profiles/{id}/sessions` (create, title from first 40 chars), `GET /api/profiles/{id}/sessions` (list ordered by updated_at desc), `GET /api/profiles/{id}/sessions/{sid}/messages`, `PATCH /api/profiles/{id}/sessions/{sid}` (rename title), `DELETE /api/profiles/{id}/sessions/{sid}` (cascade delete messages), `POST /api/chat/{id}?session_id=` (session-scoped history + touch session updated_at; alias without session_id creates/uses default session), plus `POST /api/translate` (`backend/app/routers/translate.py`, registered in `app/main.py`) `{text, target_language: en|hi|hinglish, provider?}` → `{translated}` via `complete_chat` + `provider_config` with translation prompt
- Frontend `lib/api.ts` new methods: `listSessions`, `createSession`, `renameSession`, `deleteSession`, `sessionHistory`, `translate`
- Frontend `app/chat/[id]/page.tsx` rebuilt with: left session list (new chat / rename / delete), imports `useSearchParams` + `useRouter` for `?s=` deep link, `activeSessionId` state synced to URL, `translatedCache: Record<number, Record<string,string>>` per message per locale, clicking `hinglish/hi/en` lazily calls `/api/translate` for each bubble and swaps rendered Markdown (original kept, cache hit on second toggle); global `AppShell` Languages toggle (`AppShell.tsx` + `i18n.tsx:15 LanguageProvider`) triggers re-render of `dictionaries.ts` `makeTerms` for chart terms without reload and, when inside `/chat/[id]`, also triggers retro-translation batch for visible session
- Tests updated: `test_api.py` new `test_session_crud`, `test_session_chat_isolation` (two sessions don't leak), `test_translate_mocked` (mock `complete_chat`)

### Must NOT have (guardrails, anti-slop, scope boundaries)
- NO engine math changes (no dosha/Shadbala/D10/KP) — Track B
- NO hosting/auth/payment/mobile code
- NO writing `content_hi/content_en` columns to DB in this track (cache only, persistence deferred)
- NO disabling strict TS or adding new heavy deps (use existing `httpx` + `react-markdown`)
- NO committing `.env`, `app.db`, `.next`, `__pycache__`


## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: tests-after + pytest (backend 21+ new session tests) + `next build` + TestClient session isolation + translate mock
- Framework: `pytest` + `next build` (TSC strict) + `httpx` TestClient
- Evidence: `.omo/evidence/task-<N>-chat-sessions-translation.log` per todo + summary md

## Execution strategy
### Parallel execution waves
Wave 1 (backend): T1 branch, T2 DB/session model+migration, T3 session-aware chat + translate endpoint — sequential (T3 depends T2). Wave 2 (frontend): T4 api.ts + chat UI session sidebar (depends T3), T5 retro-translation + AppShell fix (depends T4) — Wave 2 fully serial to enforce session isolation before translation. Wave 3: T6 tests + build green (depends T5), T7 evidence/docs (depends T6).

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 Branch creation | — | 2,3,4,5,6,7 | — |
| 2 DB ChatSession + migration | 1 | 3,6,7 | — |
| 3 Session-aware chat + translate endpoint | 2 | 4,5,6,7 | — |
| 4 Frontend session sidebar + routing | 3 | 5,6,7 | — |
| 5 Retro-translation cache + AppShell fix | 4 | 6,7 | — |
| 6 Tests + next build green | 5 | 7 | — |
| 7 Evidence + docs | 6 | — | — |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [ ] 1. Branch fix/chat-sessions from harden/v1-a
  What to do: `git status --porcelain` should show only `.omo/*`; `git branch --show-current` is `harden/v1-a`; run `git checkout -b fix/chat-sessions` (fallback `git checkout fix/chat-sessions` if exists). Record `git log --oneline -1` (444e4a8). Must NOT edit files.
  Parallelization: Wave 1 | Blocked by: — | Blocks: 2,3,4,5,6,7
  References: repo root harden/v1-a:444e4a8, .omo/plans/harden-v1-track-a.md, backend/app/db.py:15 Profile, frontend/src/app/chat/[id]/page.tsx, .omo/plans/chat-sessions-translation.md
  Acceptance criteria: `git branch --show-current` == `fix/chat-sessions`; `git log --oneline -1` parent is 444e4a8; `git status` clean except .omo
  QA scenarios: happy — branch created; failure — branch exists → checkout instead; Evidence .omo/evidence/task-1-chat-sessions-translation.log
  Commit: N | —

- [ ] 2. DB: ChatSession model + auto-migration
  What to do: In `backend/app/db.py` add `class ChatSession` with `id PK`, `profile_id FK profiles.id ondelete CASCADE`, `title String(80)`, `created_at DateTime default utcnow`, `updated_at DateTime default utcnow onupdate utcnow`, `profile` relationship cascade all delete-orphan, `messages` relationship; add to `ChatMessage` field `session_id: Mapped[int|None] = mapped_column(ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=True, index=True)` + `session` relationship. Update `init_db()` to call `Base.metadata.create_all` then column-exists check for existing app.db; add helper `_migrate_existing_messages(db)` called on lifespan startup that for each profile ensures default session exists then `UPDATE chat_messages SET session_id=default WHERE session_id IS NULL` (idempotent). Must keep existing messages intact.
  Parallelization: Wave 1 | Blocked by: 1 | Blocks: 3,6,7
  References: backend/app/db.py:15 Profile, backend/app/db.py:32 ChatMessage, backend/app/main.py lifespan init_db, backend/app/config.py Settings database_url
  Acceptance criteria: `workdir: backend` `.\.venv\Scripts\python.exe -c "from app.db import Base,engine; Base.metadata.create_all(engine); print('ok')"` succeeds; TestClient create profile then `GET /api/profiles/{id}/sessions` returns 1 default session; restart with old messages where session_id NULL results in all assigned to default after lifespan
  QA scenarios: happy — default session created; failure — FK violation if session_id not nullable (must be nullable for migration); Evidence .omo/evidence/task-2-chat-sessions-translation.log
  Commit: N | — (commit in T6)

- [ ] 3. Session-aware chat + /api/translate endpoint
  What to do: In `backend/app/routers/chat.py` change `_history_messages(db, profile_id, session_id)` to `where ChatMessage.profile_id==profile_id and ChatMessage.session_id==session_id order by created_at limit max_history`; change `chat(profile_id, payload, session_id: int|None Query(None), db)` to resolve `session_id` (if None create/lookup default session), set `ChatMessage(..., session_id=resolved)`, touch `session.updated_at = utcnow`. Keep alias without `session_id` for backwards compat. Create `backend/app/routers/translate.py` (decided file) with `class TranslateRequest(text:str, target_language: en|hi|hinglish, provider: str|None)` and `POST /api/translate` that builds prompt "Translate the following Vedic astrology markdown to {target} preserving markdown, dates, bullets, numbers; target hinglish=Roman Hindi" and calls `await complete_chat([...], provider=payload.provider)` via `provider_config`; return `{translated}`. Register `translate.router` in `backend/app/main.py` via `include_router(translate.router, prefix="/api")`.
  Parallelization: Wave 1 | Blocked by: 2 | Blocks: 4,5,6,7
  References: backend/app/routers/chat.py:20 _history_messages, backend/app/routers/chat.py:30 chat(), backend/app/services/llm.py:51 complete_chat, backend/app/services/prompt.py:5 LANGUAGE_DIRECTIVES, backend/app/main.py include_router, backend/app/config.py provider_config
  Acceptance criteria: TestClient `POST /api/profiles` then `POST /api/profiles/{id}/sessions` → 201, `GET /api/profiles/{id}/sessions` lists 1+, `POST /api/chat/{id}?session_id={sid}` stores message with session_id and next GET history returns only that session's messages (isolation), `/api/translate` with mocked LLM returns translated text
  QA scenarios: happy — session isolation verified; failure — history leaks across sessions (must filter by session_id); Evidence .omo/evidence/task-3-chat-sessions-translation.log
  Commit: N | —

- [ ] 4. Frontend session sidebar + routing
  What to do: In `frontend/src/lib/api.ts` add `listSessions(profileId)`, `createSession(profileId, title?)`, `renameSession(profileId, sid, title)`, `deleteSession(profileId, sid)`, `sessionHistory(profileId, sid)`, `translate(text, target_language, provider?)`. In `frontend/src/app/chat/[id]/page.tsx` add imports `useSearchParams, useRouter` from `next/navigation`, states `sessions`, `activeSessionId` (from `searchParams.get("s")`), `useEffect` load sessions then select; left sidebar (ChatGPT-style) shows sessions with New chat button, click switches `router.push(/chat/{id}?s={sid})`, rename inline, delete with confirm, main pane loads `sessionHistory`; `send()` posts to `/api/chat/{id}?session_id=activeSessionId` (if none, create session first). Preserve streaming, mdComponents, typing dots, copy, auto-scroll. Must keep fallback `/chat/{id}` without `?s=` → auto-select default/latest.
  Parallelization: Wave 2 | Blocked by: 3 | Blocks: 5,6,7
  Parallelization: Wave 2 | Blocked by: 3 | Blocks: 5,6,7
  References: frontend/src/lib/api.ts (api object, BASE), frontend/src/app/chat/[id]/page.tsx:52 ChatPage (useParams id, useEffect history), frontend/src/components/AppShell.tsx sidebar pattern, backend/api sessions shape
  Acceptance criteria: `workdir: frontend` `npm.cmd run build` still passes (no TS errors for new api methods); manual smoke via browser: create profile → new chat → send msg → visible in sidebar → new chat button creates second session → switching sessions shows isolated histories
  QA scenarios: happy — two sessions isolated; failure — activeSessionId null causes POST without session_id (must auto-create); Evidence .omo/evidence/task-4-chat-sessions-translation.log
  Commit: N | —

- [ ] 5. Retro-translation cache + AppShell global locale fix
  What to do: In chat page add `translatedCache: Record<number, Record<string,string>>` keyed by message id, `translating` boolean, `handleTranslate(target)` that for each message where `cache[target]` missing calls `await api.translate(message.content, target, provider)` via `Promise.all`, stores, then re-renders bubbles as `<Markdown>{translatedCache[id][target] ?? message.content}</Markdown>` (original kept). Show spinner while batch runs; second toggle hits cache (no network). Next new message `payload.language = target` (target maps en→en, hi→hi, hinglish→hinglish). Fix AppShell: verify `LanguageProvider setLocale` via `useMemo([locale])` already re-renders `makeTerms(locale)`; in chat route, `useEffect` on `i18n.locale` triggers `handleTranslate(locale==="hi"?"hi": locale==="en"?"en": "hinglish")` if chat has messages, so top-right EN↔हिंदी translates visible bubbles too.
  Parallelization: Wave 2 | Blocked by: 4 | Blocks: 6,7
  References: frontend/src/app/chat/[id]/page.tsx:59 language state, frontend/src/app/chat/[id]/page.tsx:28 mdComponents, frontend/src/lib/i18n.tsx:15 LanguageProvider setLocale, frontend/src/lib/dictionaries.ts: makeTerms, backend/app/routers/translate path /api/translate
  Acceptance criteria: Clicking hi after 3 messages shows all bubbles re-rendered in Hindi Devanagari via Markdown (no raw **), toggling back to English shows cached English without re-calling API (network tab shows only first translate batch). Global AppShell EN↔हिंदी toggle still changes nav labels, chart terms, and also triggers chat translation if inside chat route.
  QA scenarios: happy — retro-translation visible; failure — translation overwrites original content (must keep original); Evidence .omo/evidence/task-5-chat-sessions-translation.log
  Commit: N | —

- [ ] 6. Tests + next build green
  What to do: Update `backend/tests/test_api.py` with `test_session_crud`, `test_session_chat_isolation` (two sessions, messages don't leak), `test_translate_mocked` (mock `complete_chat` return). Run `workdir: backend` `.\.venv\Scripts\python.exe -m pytest tests -v` on Windows or `workdir: backend` `python -m pytest tests -v` on linux (expect 21+3=24 passed). Run `workdir: frontend` `npm.cmd run build` (Windows) or `npm run build` with `workdir: frontend` expect `Compiled successfully` 0 errors. Handle nullable session_id and stale `app.db` by `Base.metadata.create_all` + fallback `rm app.db` in test setup if migration fails.
  Parallelization: Wave 3 | Blocked by: 5 | Blocks: 7
  Parallelization: Wave 3 | Blocked by: 5 | Blocks: 7
  References: backend/tests/test_api.py, backend/.venv pytest, frontend/tsconfig.json strict, backend/app/db.py ChatSession, backend/app/routers/translate
  Acceptance criteria: pytest 24 passed (21 old + 3 new) 0 failed; next build exit 0; no TS7006
  QA scenarios: happy — all green; failure — old app.db without session table causes migrate error (init_db must create); Evidence .omo/evidence/task-6-chat-sessions-translation.log
  Commit: Y | feat(chat): per-profile sessions + retro-translation + session-aware continuity

- [ ] 7. Evidence bundle + docs
  What to do: Write `.omo/evidence/chat-sessions-translation-summary.md` with branch, commit hash, migration note, API contract, UI screenshots checklist, and update `README.md` + `docs/providers.md` if new endpoint changes run instructions (add translate note, session navigation). Verify `start-backend.bat`/`start-frontend.bat` still valid.
  Parallelization: Wave 3 | Blocked by: 6 | Blocks: —
  References: README.md, docs/providers.md, frontend/AGENTS.md
  Acceptance criteria: summary exists with 3+ bullets, README mentions session navigation and retro-translation toggle, no broken instructions
  QA scenarios: happy — summary written; failure — README still describes single-thread chat → fix; Evidence .omo/evidence/task-7-chat-sessions-translation.log + summary.md
  Commit: N | docs: update README/providers for sessions if needed

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit — all Must have on fix/chat-sessions present, no engine/math/hosting creep, .env/app.db not committed
- [ ] F2. Code quality review — ChatSession FK nullable + cascade, mdComponents still Components typed, translate uses provider_config not hardcoded key, no secrets
- [ ] F3. Real manual QA — create profile → 2 sessions → chat in hinglish in s1 → switch to s2 (history empty) → back to s1 (history restored) → click hi → all bubbles translate to Hindi → new message in hi → reply in Hindi → PDF still works
- [ ] F4. Scope fidelity — fix/chat-sessions is revertible atop harden/v1-a, master untouched, stepwise A→B still intact

## Commit strategy
- One main commit on `fix/chat-sessions` at T6: `feat(chat): per-profile sessions + retro-translation + session-aware continuity` (squashes T2-T5). Optional `docs:` at T7 if README drift.

## Success criteria
- `git branch --show-current` == `fix/chat-sessions`, `git log --oneline` shows 1 new feat commit atop 444e4a8, `git status --porcelain` clean except .omo
- `workdir: backend` pytest 24 passed, `workdir: frontend` next build 0 errors
- User can: open a profile's chat, click New chat → second session appears in sidebar, chat in session A doesn't appear in session B, click हिंदी button → *existing* bubbles re-render in Hindi (cached), click English → back without re-translating, top-right EN↔हिंदी still changes whole app labels and chart terms
- No regression: D1/D9/dasha/navamsa/yogas/prompts still correct, single-thread fallback still works for old links `/chat/{id}` without `?s=`
