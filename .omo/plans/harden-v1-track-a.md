# harden-v1-track-a - Work Plan

## TL;DR (For humans)
**What you'll get:** A clean, committable branch where your current app builds and passes all tests again — the interrupted chat/i18n work from your last session gets properly saved, the TypeScript build error is fixed, and both backend and frontend start cleanly for grandpa's use.

**Why this approach:** Your last agent already built the chat markdown / optimistic-send / instant language fixes and the Hindi i18n system — they're sitting on disk uncommitted and blocking `npm run build`. Committing them as-is on a new branch (no rewrites) is the safest way to not break working functionality.

**What it will NOT do:** No new astrology calculations, no dosha/Shadbala/D10 math, no hosting/mobile changes — those are Track B. No redesign of the orange/cream theme.

**Effort:** Short (half-day, 6 todos + final wave)
**Risk:** Low - revertible branch, no calc changes, 21 existing tests guard correctness
**Decisions to sanity-check:** Branch name `harden/v1-a` ok? Fix is typed `Components` (strict TS) not disabling checks?

Your next move: approve this plan to let the worker create the branch, fix the 14 TS errors, commit the dirty tree, and green the builds. Or ask for a high-accuracy review first.

---

> TL;DR (machine): Short/Low - branch harden/v1-a, fix TS7006 in chat page, commit 12-file dirty worktree, verify 21 pytest + next build + E2E

## Scope
### Must have
- Branch `harden/v1-a` created from `master` (or `main` if detected) before any file edits
- TypeScript prod build passes (`next build` clean, 0 errors) — specifically `frontend/src/app/chat/[id]/page.tsx:28-50` `mdComponents` implicit any fixed
- Dirty worktree committed: `backend/app/services/prompt.py`, `frontend/next.config.ts`, `frontend/package.json` + `package-lock.json` (react-markdown/remark-gfm), `frontend/src/app/globals.css`, `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`, `frontend/src/app/profiles/[id]/page.tsx`, `frontend/src/app/chat/[id]/page.tsx` + untracked `frontend/src/components/AppShell.tsx`, `frontend/src/lib/dictionaries.ts`, `frontend/src/lib/i18n.tsx` — as a single logical commit preserving prior agent's work
- Backend still green: `backend/.venv` `pytest tests -q` 21 passed, `smoke_engine.py` prints lagna/planets/yogas and writes PDF
- Frontend + backend start via `start-backend.bat` / `start-frontend.bat` without port collision (kill stale 8000 if needed), manual smoke: create profile → view D1/D9 → chat SSE → PDF download works
- No regressions: existing yogas/dasha/navamsa logic untouched

### Must NOT have (guardrails, anti-slop, scope boundaries)
- NO new engine calculations (no Mangal/KaalSarp/Pitra dosha, no Shadbala/Ashtakavarga, no D10/Bhava Chalit, no KP/Gun-milan) — frozen for Track B
- NO changes to Swiss Ephemeris flags or ayanamsa — `backend/app/engine/core.py:32` `FLG_MOSEPH|FLG_SIDEREAL|FLG_SPEED` stays
- NO hosting, auth, payment, or mobile app code
- NO `.env` or `app.db` committed, NO secrets in git
- NO disabling `noImplicitAny` or `strict` as a fix — must type properly
- NO UI redesign or theme token changes beyond what is already dirty

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: tests-after (existing suite) + `next build` as type gate
- Framework: `pytest` (backend, 21 tests) + `next build` (TSC strict) + manual E2E smoke via `TestClient` and live servers
- Evidence: `.omo/evidence/task-<N>-harden-v1-track-a.log` per todo (pytest output, build log, smoke output)
- Pre-condition: worker must `git status --porcelain` before/after each wave; no untracked except `.omo/*` left after final commit (evidence dir stays untracked; pycache/.next ignored)

## Execution strategy
### Parallel execution waves
Wave 1 (setup + type fix): T1 branch creation, T2 TS fix + local build check — sequential (T2 depends T1). Wave 2 (verify + commit): T3 pytest+smoke, T4 commit dirty tree, T5 clean-build verify — T3/T4 parallel after T2, T5 after T3 and T4. Wave 3 (closeout): T6 evidence + README sanity — after T5.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 Branch creation | — | 2,3,4,5,6 | — |
| 2 TS mdComponents typing + next build | 1 | 3,4,5,6 | — |
| 3 Backend pytest + smoke_engine | 2 | 5,6 | 4 |
| 4 Commit dirty worktree | 2 | 5,6 | 3 |
| 5 Clean verify (build + smoke after commit) | 3,4 | 6 | — |
| 6 Evidence bundle + docs sanity | 5 | — | — |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [ ] 1. Branch harden/v1-a + baseline inventory
  What to do: `git status --porcelain`, `git branch --show-current` (expect master), create branch `git checkout -b harden/v1-a`, verify clean switch, record diff stat as evidence. Must NOT edit files yet.
  Parallelization: Wave 1 | Blocked by: — | Blocks: 2,3,4,5,6
  References: repo root, frontend/package.json, backend/app/engine/__init__.py (compute_full_chart), .omo/plans/vedic-ai-astrologer-v1.md scope
  Acceptance criteria: `git branch --show-current` outputs `harden/v1-a`; `git log --oneline -1` is 37c443a parent; `git status` still shows same 9M+3?? (+ .omo) as before branch; if branch already exists use `git checkout harden/v1-a`
  QA scenarios: happy — branch exists and tracks master; failure — branch already exists → use `git checkout harden/v1-a` instead; Evidence .omo/evidence/task-1-harden-v1-track-a.log (git status/branch/log)
  Commit: N | —

- [ ] 2. Fix TS implicit any in chat markdown + next build green
  What to do: In `frontend/src/app/chat/[id]/page.tsx:28-50` add `import type {Components} from 'react-markdown'` and define `const mdComponents: Components = { p: (props) => <p ... {...props} />, strong: (props) => <strong ... {...props} />, ... hr: (props) => <hr ... {...props} /> }` — each key inferred via `Components` (no `any`, no `noImplicitAny` disable). Run `npm.cmd run build` with `workdir: frontend` until 0 errors. Must NOT change runtime logic or disable strict.
  Parallelization: Wave 1 | Blocked by: 1 | Blocks: 3,4,5,6
  References: frontend/src/app/chat/[id]/page.tsx (mdComponents 14x TS7006), frontend/tsconfig.json (strict true → noImplicitAny), frontend/next.config.ts, frontend/package.json (react-markdown 10.x + remark-gfm), frontend/src/app/chat/[id]/page.tsx:38 hr handler
  Acceptance criteria: `workdir: frontend` `npm.cmd run build` exits 0, `Creating an optimized production build ... Compiled successfully` and no TS7006; `workdir: frontend` `npm.cmd exec -- tsc --noEmit` also 0
  QA scenarios: happy — build passes; failure — add `// @ts-nocheck` rejected (must use proper Components type); Evidence .omo/evidence/task-2-harden-v1-track-a.log (full build stdout)
  Commit: N | — (commit in T4)

- [ ] 3. Backend regression gate — pytest + smoke_engine
  What to do: With `workdir: backend` run `.\.venv\Scripts\python.exe -m pytest tests -v` (expect 21 passed, 9 warnings), then `.\.venv\Scripts\python.exe smoke_engine.py` (compute_full_chart for 1990-05-21 14:30 Asia/Kolkata, prints Lagna Virgo, 9 planets, current dasha, yogas, writes PDF >5KB). Save outputs. Must NOT modify engine files.
  Parallelization: Wave 2 | Blocked by: 2 | Blocks: 5,6 | Can parallelize with: 4
  References: backend/tests/test_api.py, backend/tests/test_dasha.py, backend/tests/test_navamsa_panchang_yogas.py, backend/smoke_engine.py (compute_full_chart), backend/app/engine/core.py (compute_d1), backend/requirements.txt (pyswisseph==2.10.3.2)
  Acceptance criteria: pytest 21 passed 0 failed; smoke prints `Lagna: Virgo` and `Planets:` dict and `Current dasha:` line and `PDF written` with bytes >5000
  QA scenarios: happy — all 21 pass; failure — mock if port 8000 busy (pytest uses TestClient, no port); Evidence .omo/evidence/task-3-harden-v1-track-a.log
  Commit: N | —

- [ ] 4. Commit dirty worktree as single logical fix
  What to do: First `git restore --worktree backend/app/services/__pycache__/prompt.cpython-313.pyc` (remove pyc noise), then stage exactly the 12-file diff: `git add backend/app/services/prompt.py frontend/next.config.ts frontend/package.json frontend/package-lock.json frontend/src/app/globals.css frontend/src/app/layout.tsx frontend/src/app/page.tsx frontend/src/app/profiles/[id]/page.tsx frontend/src/app/chat/[id]/page.tsx frontend/src/components/AppShell.tsx frontend/src/lib/dictionaries.ts frontend/src/lib/i18n.tsx` (includes chat page TS fix from T2). Commit with message `fix(chat,i18n): commit interrupted session — markdown chat, instant language, Hindi i18n + AppShell, typed mdComponents`. Verify `git status --porcelain` shows only `.omo/*` untracked (ignored/pycache/.next). Must NOT add .env, app.db, __pycache__, .next.
  Parallelization: Wave 2 | Blocked by: 2 | Blocks: 5,6 | Can parallelize with: 3
  References: git diff --stat (9M+3?? + .omo), frontend/src/components/AppShell.tsx, frontend/src/lib/dictionaries.ts, frontend/src/lib/i18n.tsx, backend/app/services/prompt.py (LANGUAGE_DIRECTIVES+PRESENTATION), frontend/src/app/chat/[id]/page.tsx (mdComponents typed)
  Acceptance criteria: `git log --oneline -1` shows new commit on harden/v1-a; `git show --stat HEAD` lists 12 files; `git status --porcelain` shows only `.omo/*` (and ignored pycache/.next); branch still harden/v1-a
  QA scenarios: happy — commit succeeds; failure — commit hook blocks secrets (check .env not staged); Evidence .omo/evidence/task-4-harden-v1-track-a.log (git show --stat)
  Commit: Y | fix(chat,i18n): commit interrupted session — markdown chat, instant language, Hindi i18n + AppShell

- [ ] 5. Clean verify after commit (build + API smoke)
  What to do: On committed HEAD, re-run `workdir: frontend` `npm.cmd run build` (must still pass), `workdir: backend` `.\.venv\Scripts\python.exe -m pytest tests -q` (21 passed), and a one-off API smoke via `TestClient`: POST /api/profiles, GET /api/charts/{id} asserts lagna sign exists, POST /api/charts/preview, GET /api/providers ready>0. Prefer TestClient to avoid port 8000 flakiness. Must NOT change code to pass.
  Parallelization: Wave 2→3 | Blocked by: 3,4 | Blocks: 6
  References: backend/app/main.py (lifespan init_db), backend/tests/test_api.py (health+preview+chat mocked), frontend/src/lib/api.ts (BASE http://localhost:8000), frontend/next-env.d.ts
  Acceptance criteria: build exit 0, pytest 21 passed, TestClient health 200 + providers contains gemini/groq/openrouter/lmstudio/ollama + preview returns moon_rashi, all commands logged
  QA scenarios: happy — all green; failure — stale port 8000 causes bind error → verified via TestClient bypass; Evidence .omo/evidence/task-5-harden-v1-track-a.log
  Commit: N | —

- [ ] 6. Evidence bundle + README sanity
  What to do: Create `.omo/evidence/harden-v1-track-a-summary.md` listing branch, commits, pytest/build logs paths, manual check that `README.md: quick start` still matches `start-backend.bat` / `start-frontend.bat` and `docs/providers.md` matches `backend/app/config.py:provider_config` for gemini/groq/openrouter/lmstudio/ollama. Fix README only if drift >1 line (otherwise note verified). Must NOT add new features.
  Parallelization: Wave 3 | Blocked by: 5 | Blocks: —
  References: README.md (Quick start), docs/providers.md (free keys), backend/app/config.py (Settings), frontend/AGENTS.md
  Acceptance criteria: summary md exists with 3 bullet findings; README still instructs `start-backend.bat` port 8000 + `start-frontend.bat` port 3000; no broken links
  QA scenarios: happy — summary written; failure — README still references old port → fix; Evidence .omo/evidence/task-6-harden-v1-track-a.log + summary.md
  Commit: N | docs: verify README/providers for harden track if needed (otherwise no commit)

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit — every Must have committed on harden/v1-a, no Must NOT have (no dosha/math/hosting) leaked, branch isolation verified
- [ ] F2. Code quality review — mdComponents uses Components type not any-suppression, no secrets committed, pycache/.next/.env ignored, prompt.py guardrails intact
- [ ] F3. Real manual QA — `uvicorn app.main:app --port 8000` + `npm run dev -- --port 3000` start, create profile Delhi 1990-05-21, see D1 Virgo + D9, chat in Hinglish then switch to Hindi gets immediate Hindi, PDF downloads as %PDF
- [ ] F4. Scope fidelity — harden/v1-a is revertible, original master untouched, stepwise promise kept (A first, B later), interrupted msgs 178-185 fully landed

## Commit strategy
- One commit on `harden/v1-a` in T4: `fix(chat,i18n): commit interrupted session — markdown chat, instant language, Hindi i18n + AppShell, typed mdComponents` (includes T2 fix). Optional second `docs:` only if README drift found in T6. Never commit `.env`, `app.db`, `__pycache__`, `.next`, `.omo/evidence` (evidence outside git).

## Success criteria
- `git branch --show-current` == `harden/v1-a`, `git log --oneline` shows 1 new commit on top of 37c443a, `git status --porcelain` clean (tracked)
- `npm.cmd run build` in frontend exits 0 with `Compiled successfully` (0 TS errors)
- `backend/.venv pytest tests -q` 21 passed, `smoke_engine.py` prints Virgo lagna + PDF >5KB
- User can `start-backend.bat` + `start-frontend.bat`, create a new kundli, see D1/D9, switch chat language Hinglish↔Hindi and get instant correctly-languaged answers with rendered markdown (no raw **), and download PDF — exactly the fixes promised in msgs 178-185, without breaking existing yogas/dasha/navamsa
