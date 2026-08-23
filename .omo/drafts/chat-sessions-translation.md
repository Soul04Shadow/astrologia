---
slug: chat-sessions-translation
status: awaiting-approval
intent: clear
pending-action: write .omo/plans/chat-sessions-translation.md
approach: Branch fix/chat-sessions from harden/v1-a — add ChatSession table, migrate existing messages, expose session CRUD + per-session chat SST, rebuild chat UI with session sidebar (ChatGPT-style), add translation endpoint for on-demand retro-translation of history, fix AppShell global locale toggle wiring.
---

# Draft: chat-sessions-translation

## Components (topology ledger)

| id | outcome | status | evidence |
|----|---------|--------|----------|
| C1 Chat sessions backend | ChatSession table (id, profile_id, title, created_at, updated_at) + FK to messages via session_id, auto-migrate existing messages to default session, CRUD endpoints | active | backend/app/db.py (Profile→messages direct, no session), backend/app/routers/chat.py:20 _history_messages uses profile_id limit 16, no session |
| C2 Chat UI multi-session | Session list sidebar per profile, new/rename/delete, active session switch without page reload, per-session continuity (history scoped to session_id) | active | frontend/src/app/chat/[id]/page.tsx (single history via api.history(id), no session param), backend/api.ts history() no session |
| C3 Retro-translation | Clicking language buttons re-renders already-present messages in chosen language (not just next reply) via cached translation; backend proxy /api/translate uses same LLM provider | active | backend/app/services/prompt.py LANGUAGE_DIRECTIVES only for next reply, frontend chat page language state only sent in POST, no translation of existing messages; user complaint 177+ |
| C4 Global locale fix | AppShell EN↔HI toggle actually changes all UI labels + chart terms via dictionaries.ts/ i18n.tsx; currently LanguageProvider wired but topbar Languages button may not re-render chat terms correctly if chat holds own language state | active | frontend/src/lib/i18n.tsx:15 LanguageProvider, frontend/src/components/AppShell.tsx:150 Languages button toggles locale, frontend/src/app/chat/[id]/page.tsx:59 language state independent of locale |

## Open assumptions (announced defaults)

| assumption | adopted default | rationale | reversible? |
|---|---|---|---|
| branch | fix/chat-sessions from harden/v1-a:444e4a8 | stepwise, A already green | yes |
| translation provider | reuse same LLM provider registry (gemini/groq/openrouter/lmstudio/ollama) via new /api/translate that calls stream_chat/complete_chat with translation system prompt — no new API keys | consistent with hybrid LLM decision, free tier | yes |
| session title | auto from first user message truncated 40 chars, editable | ChatGPT pattern, minimal UI | yes |
| default language for new sessions | hinglish (existing default) but UI language buttons now trigger translation overlay + set next-reply language | matches current chat default | yes |
| translation cache | store translated variants per message per locale in memory (frontend state) + optional DB column `content_hi`/`content_en` later deferred | avoid re-calling LLM on every toggle, reversible | yes |

## Findings (cited - path:lines)
- DB: `backend/app/db.py:15 Profile` has `messages: relationship` direct, `32 ChatMessage` has `profile_id` FK, no `session_id`, no `ChatSession` table. Means one thread per profile, continuity is last 16 messages globally per profile (`app/config.py max_history_messages 16`), not per session.
- Chat router `backend/app/routers/chat.py:20-27` `_history_messages(profile_id)` loads last 16 globally; `30 chat(profile_id)` builds `messages = [system, *history, user]` then `stream_chat(messages)`. No session isolation; all history merged.
- Frontend `frontend/src/app/chat/[id]/page.tsx:71-81` `useEffect Promise.all([api.getProfile(id), api.history(id)])` loads single history; `send()` posts to `/api/chat/{id}` with `{message, language, provider}` and appends locally. No session id in URL or body. Switching profiles resets, but within a profile there's no way to start a fresh thread without deleting history.
- i18n: `frontend/src/lib/i18n.tsx:15 LanguageProvider` persists `app-locale` and sets `documentElement.lang`, but AppShell's `Languages` button at `AppShell.tsx:158-166` calls `setLocale(locale==="en"?"hi":"en")` — it does toggle UI labels via `t()` and `makeTerms(locale)` (terms for signs/planets). However chat page maintains independent `language` state at `chat/[id]/page.tsx:59` (`useState<"hinglish"|"hi"|"en">("hingling")`) which only affects next LLM call's `payload.language`. Existing messages stay in original language; no retro-translation. User wants "click buttons and translate the conversation" — currently clicking language buttons only changes `langNote` and next request, not existing bubbles.
- Global Hindi button: does work for AppShell labels (verified `dictionaries.ts` has hi entries for nav/menu/dash/chart/yogas), but user says "does nothing" — likely because chat page's Markdown answers contain English Jyotish terms not covered by `dictionaries.ts` terms (sign/planet names) and the toggle requires page reload to see chart term translation (since chart page uses `useI18n().terms.sign()` which does react, but initial load may cache). Need to verify.
- `building-vedic-astrology-ai-app-like-kundli-gpt.json:177` user explicitly wants translation of already present messages, not just next reply; also wants multiple sessions like ChatGPT navigation.

## Decisions (with rationale)
1. Add `ChatSession` model: id, profile_id FK, title, created_at, updated_at; add `session_id` FK to ChatMessage (nullable for migration). On startup, migrate: for each profile, create session "First consultation" and assign existing messages.
2. New endpoints: `POST /api/profiles/{id}/sessions` (create), `GET /api/profiles/{id}/sessions` (list), `GET /api/profiles/{id}/sessions/{sid}/messages`, `DELETE /api/profiles/{id}/sessions/{sid}`, `POST /api/chat/{id}?session_id=` variant that scopes history to session. Keep old `/api/chat/{id}` as alias to default session for backwards compat.
3. Translation: new `POST /api/translate` {text, target_language, source_hint} that builds a minimal system prompt "You are a translator, translate Vedic astrology content preserving markdown, dates, numbers" and calls `complete_chat` via provider_config. Frontend maintains `translatedCache: Record<messageId, Record<locale, string>>`; clicking language button iterates messages and lazily translates each bubble via this endpoint, then re-renders Markdown with translated content. No DB persistence in v1 (cache per page load).
4. Fix AppShell: ensure `setLocale` triggers re-render of `useI18n` consumers; chat page should also sync its `language` state to `locale` mapping (en→en, hi→hi, hinglish separate). But translation overlay is independent — keep both mechanisms.
5. Chat UI rebuild: left pane per-profile session list (like ChatGPT sidebar) with new chat, rename, delete; main pane shows messages for active session. URL ` /chat/[id]?s={sessionId}` for deep linking.

## Scope IN
- backend: ChatSession model + migration, session CRUD routers, chat router session-aware history, translate endpoint, tests update
- frontend: session store + API client (`api.ts` new methods), chat page sidebar + routing, retro-translation cache + UI (language buttons now translate history), AppShell locale sync fix
- engine prompt unchanged (except translation prompt)

## Scope OUT (Must NOT have)
- NO new astrology math (doshas etc. — Track B)
- NO persistent translation DB columns (deferred)
- NO auth changes (private mode stays)
- NO mobile app
- NO hosting changes

## Open questions
- none — user clarified translation = retro-translate existing bubbles, sessions = multi-thread per profile like ChatGPT

## Approval gate
status: awaiting-approval
pending action: write .omo/plans/chat-sessions-translation.md per approach above.

