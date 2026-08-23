---
slug: harden-v1-track-a
status: awaiting-approval
intent: clear
pending-action: write .omo/plans/harden-v1-track-a.md
approach: Branch harden/v1-a from master, fix TS build (mdComponents typing), commit dirty worktree as-is to preserve chat/i18n work, then verify with tests + E2E smoke without breaking existing functionality. Zero new astrology math in this track.
---

# Draft: harden-v1-track-a

## Components (topology ledger)

| id | outcome | status | evidence |
|----|---------|--------|----------|
| C1 | New branch + clean commit of dirty worktree (chat/i18n/theme files) | active | git diff --stat shows 10 files modified + 3 untracked; frontend/src/app/chat/[id]/page.tsx:29 mdComponents any, frontend/src/components/AppShell.tsx:215, frontend/src/lib/dictionaries.ts:15368, frontend/src/lib/i18n.tsx:1366 |
| C2 | TypeScript build green (fix implicit any in mdComponents, verify next build) | active | frontend/src/app/chat/[id]/page.tsx:28-50 build fails with 14 TS7006; npm run build fails |
| C3 | Backend + chat E2E still green after commits (21 pytest + smoke_engine + chat SSE) | active | backend/.venv Scripts pytest 21 passed; backend/smoke_engine.py:8 compute_full_chart; backend/tests/test_api.py::test_chat_with_mocked_provider |
| C4 | Docs & .env.example accuracy (providers.md vs config.py) | active | backend/app/config.py:6 Settings, docs/providers.md:68, backend/.env:319, README.md:2288 |

## Open assumptions (announced defaults)

| assumption | adopted default | rationale | reversible? |
|---|---|---|---|
| branch name | harden/v1-a | user asked "new git branch" for stepwise changes | yes |
| commit scope Track A | commit exactly the dirty diff as single fixup commit (no reformat) + separate typed-fix commit if needed | preserves interrupted chat/i18n work, small diff, easy revert | yes |
| TS fix style | import type {Components} from 'react-markdown' + type mdComponents: Components, no logic change | minimal, follows Next.js 16 pattern | yes |
| verification | tests-after, not TDD | hardening track, no new math | yes |

## Findings (cited - path:lines)
- Workspace now has implementation: backend 21 pytest PASS (checked 2026-08-23), frontend Next.js 16.3.2 App Router fully built except TS error blocking prod build. Previous plan .omo/plans/vedic-ai-astrologer-v1.md:57 already delivered engine+API+frontend.
- Dirty worktree: `M backend/app/services/prompt.py:42` (LANGUAGE_DIRECTIVES strengthened to HIGHEST PRIORITY, PRESENTATION block added), `M frontend/src/app/chat/[id]/page.tsx:103` (markdown+optimistic send+typing indicator), `M frontend/src/app/layout.tsx` (LanguageProvider), plus untracked AppShell/i18n/dictionaries. This is the interrupted 3-4 requests from building-vedic-astrology-ai-app-like-kundli-gpt.json msgs 178-185 (chat rebuild, language instant switch, markdown rendering). Files on disk already contain the fixes; they just need committing.
- Build blocker: `frontend/src/app/chat/[id]/page.tsx:28-50` declares `const mdComponents = { p:(props)=>..., strong:(props)=>... }` without types => 14x TS7006 `Parameter 'props' implicitly has an 'any' type` with `noImplicitAny` true, causing `npm run build` to fail (next build runs tsc).
- Backend prompt file `backend/app/services/prompt.py:5` already contains Hindi/Hinglish directives with Devanagari Jyotish terms and safety guardrails, matching the "instant language obedience" requirement from msg 177 user complaint ("changing language doesnt work fully like i changed to hindi but change happened after 3-4 msgs").
- Git: branch master has 3 commits (d6e3dcf backend, 5b81d80 frontend, 37c443a tabbed varga) — latest dirty work since 37c443a not committed.
- JSON chat history 186 messages: last user msg 184 "I think chat stopped in middle check if you missed something" + empty assistant 185 confirms interruption due to agent API high traffic; no new feature requests in last 4 turns beyond what is already on disk.
- Scope decision: user confirmed `A then B` — Track A is hardening only, Track B will add doshas/pro-grade charts. So no new yoga/dosha math in this plan.

## Decisions (with rationale)
1. Track A = harden only: create branch harden/v1-a, fix TS typing, commit dirty worktree, verify tests+build+E2E, update README if needed. No breaking changes to engine calc.
2. Use `type Components` fix for mdComponents rather than disabling noImplicitAny — keeps strict mode.
3. Keep SQLite + file DB, no migration in this track.
4. No new fine-tune or provider work — prompt.py already optimal from previous agent.

## Scope IN
- git branch harden/v1-a from master
- Fix TS build: type mdComponents in chat page (and any similar implicit any)
- Commit dirty + untracked files: prompt.py, next.config.ts, package.json/lock, globals.css, layout.tsx, page.tsx, profiles/[id]/page.tsx, AppShell.tsx, dictionaries.ts, i18n.tsx
- Verify: backend pytest 21 pass, smoke_engine.py runs, frontend npm run build succeeds, manual E2E start scripts still work
- Update .omo/evidence and README run instructions if scripts changed

## Scope OUT (Must NOT have)
- NO new engine math (no doshas, no Ashtakavarga/Shadbala, no D10, no KP)
- NO UI redesign beyond fixing build-blocking types
- NO hosting/deploy changes
- NO model fine-tuning or provider key rotation
- NO changes to calculation accuracy (engine is frozen for this track)

## Open questions
- none — all forks answered, interrupted work is on disk and just needs committing

## Approval gate
status: awaiting-approval
pending action: write .omo/plans/harden-v1-track-a.md per approach above.

