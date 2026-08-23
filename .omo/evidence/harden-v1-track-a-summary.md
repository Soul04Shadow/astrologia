# harden-v1-track-a — Evidence Summary

**Branch:** `harden/v1-a` (from `master` 37c443a)  
**Commit:** `444e4a8 fix(chat,i18n): commit interrupted session -- markdown chat, instant language, Hindi i18n + AppShell, typed mdComponents` (12 files)  
**Date:** 2026-08-23

## Commits

```
444e4a8 fix(chat,i18n): commit interrupted session -- markdown chat, instant language, Hindi i18n + AppShell, typed mdComponents
37c443a feat(ui): tabbed varga views with D9 chart, cream background, lucide icons, larger charts; server control scripts
```

`git show --stat HEAD` lists 12 files: backend/app/services/prompt.py, frontend/next.config.ts, frontend/package.json, frontend/package-lock.json, frontend/src/app/globals.css, frontend/src/app/layout.tsx, frontend/src/app/page.tsx, frontend/src/app/profiles/[id]/page.tsx, frontend/src/app/chat/[id]/page.tsx (typed mdComponents), frontend/src/components/AppShell.tsx, frontend/src/lib/dictionaries.ts, frontend/src/lib/i18n.tsx

## Verification Logs

- T1 Branch inventory: `.omo/evidence/task-1-harden-v1-track-a.log` — git status/branch/log, diff 10 files (9M+1M pycache before restore, 3 untracked)
- T2 Frontend build: `.omo/evidence/task-2-harden-v1-track-a.log` — `npm.cmd run build` Compiled successfully + `tsc --noEmit` 0 errors (Components typing)
- T3 Backend regression: `.omo/evidence/task-3-harden-v1-track-a.log` — pytest 21 passed 9 warnings, smoke_engine Lagna Virgo 07°06'59", Planets 9, dasha Venus/Ketu, PDF 43585 bytes
- T4 Commit: `.omo/evidence/task-4-harden-v1-track-a.log` — git restore pycache, git add 12 files, commit 444e4a8, status clean except .omo
- T5 Clean verify: `.omo/evidence/task-5-harden-v1-track-a.log` — frontend build pass, pytest 21 passed, TestClient smoke: health 200, providers gemini/groq/openrouter/lmstudio/ollama, create profile -> lagna Virgo, preview moon_rashi Pisces
- T6 Docs sanity: `.omo/evidence/task-6-harden-v1-track-a.log` + this summary

## Findings (3 bullets)

- **Build green:** `frontend` `npm.cmd run build` exits 0 with `Compiled successfully`; `npm.cmd exec -- tsc --noEmit` 0; no `any` suppression, `mdComponents: Components` typed correctly with `hr: (props) => <hr ... {...props} />`.
- **Backend green:** `backend/.venv pytest 21 passed`, `smoke_engine.py` prints Virgo lagna + PDF >5KB (43585), TestClient verifies lagna sign exists, preview moon_rashi Pisces, providers ready gemini+ollama.
- **Docs sanity:** `README.md: Quick start` still matches `start-backend.bat` port 8000 + `start-frontend.bat` port 3000 (manual commands `uvicorn --port 8000` / `npm run dev -- --port 3000`); `docs/providers.md` lists gemini/groq/openrouter/lmstudio/ollama matching `backend/app/config.py:provider_config` and `available_providers()` loop; no drift >1 line — no commit needed. No secrets, .env, app.db, __pycache__, .next committed; branch isolation verified, master untouched (37c443a parent).

## Branch Isolation

- `git branch --show-current` == `harden/v1-a`
- `git log --oneline` shows 1 new commit on top of 37c443a
- `git status --porcelain` clean except `.omo/*` untracked (pycache restored, .next ignored)
- Swiss flags untouched (`backend/app/engine/core.py:32 FLG_MOSEPH|FLG_SIDEREAL|FLG_SPEED`), no dosha/math/hosting changes
