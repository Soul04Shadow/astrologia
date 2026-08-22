# vedic-ai-astrologer-v1 - Work Plan

## TL;DR (For humans)
Build "Vedic AI Astrologer v1": a private-first full-stack web app for a grandfather-astrologer to generate exact Vedic kundlis for people and consult an AI astrologer grounded in those charts.
**Why this approach:** deterministic Swiss-Ephemeris math (never trust an LLM to calculate) decoupled from a strong general LLM fed precise chart context — the architecture KundliGPT-class products use, and the one the user's own POC proved superior to fine-tuned astrology models.
**It will NOT do:** auth/logins, gun-milan/ashtakavarga/KP/full vargas, model fine-tuning, payments, mobile app code (but API-first so mobile drops in later).
**Effort:** full monorepo build (backend FastAPI+engine+tests, frontend Next.js UI, PDF export).
**Risk:** calculation correctness → mitigated by golden-value tests cross-checkable against Drik Panchang/Jagannatha Hora and grandpa.
**Decisions locked:** hybrid LLM (cloud free-tier primary via OpenAI-compatible adapter; local LM Studio/Ollama fallback) · EN/HI/Hinglish toggle · North Indian chart · SQLite persistence · flat orange/white theme (NO gradients) · PDF exports per person.

## Scope
### Backend (`backend/`)
- FastAPI app, Pydantic settings via `.env`
- `app/engine/`: pyswisseph (Lahiri sidereal, Moshier ephemeris fallback so no data files required)
  - `core.py` D1: Sun..Saturn+Rahu(+Ketu), lagna (houses_ex b'E'), nakshatra+pada+lord, dignity (exalt/debilit/own/moolatrikona), retrograde via speed, combust, deg_to_dms, house assignment
  - `dasha.py` Vimshottari: maha+antardasha timeline, float-day precision (365.25-day year), current period lookup at query time
  - `navamsa.py` D9 sign mapping
  - `transits.py` current planetary positions at query instant (tz-aware)
  - `panchang.py` tithi/nakshatra/yoga/karana/var for a date at place
  - `yogas.py` Gajakesari, Budhaditya, Neecha Bhanga Raja, Panch Mahapurush (5)
  - NO hardcoded fallback chart anywhere — failures raise loudly
- `app/services/geo.py`: Nominatim geocode + timezonefinder tz name (+dict cache table)
- `app/services/llm.py`: OpenAI-compatible chat-completions adapter; provider registry from env (gemini/groq/openrouter/lmstudio/ollama/custom); SSE streaming passthrough
- `app/services/prompt.py`: grounded system-prompt builder from chart JSON + language directive + safety guardrails (no death dates, no medical/financial guarantees, red-flag gemstone promises, redirect to professionals)
- `app/db.py` SQLAlchemy SQLite: profiles, chat_messages tables
- Endpoints: health, geocode?q=, profiles CRUD, chart compute per profile (+preview), chat SSE per profile w/ history, providers list, GET /profiles/{id}/report.pdf
- `tests/`: pytest golden-values (invariant anchors + real births), engine units, API smoke, PDF smoke, mock-provider chat test

### Frontend (`frontend/`)
- Next.js App Router + TypeScript + Tailwind v4 design tokens
- Theme: orange #EA580C/#F97316 primary, white surfaces, cream #FFF8E7 accents; FLAT solids only — gradients banned; consistent spacing/radius scale; mobile-first responsive
- Pages: `/` dashboard (profile list), `/profiles/new`, `/profiles/[id]` (chart view: North Indian SVG kundli component, planet table, dasha timeline, transits, panchang, yogas, downloads PDF/PNG/SVG), `/chat/[id]` streaming chat with language selector
- API client typed to backend schemas

### Docs (`README.md`, `docs/providers.md`)
Run instructions, free-key setup (Gemini/Groq/OpenRouter), LM Studio/Ollama notes, grandpa verification checklist.

## Verification strategy
Tests-after per module; pytest suite must pass green before moving on. Golden values: (a) invariant anchors (J2000 sidereal Sun 256.5157° Lahiri; Ketu=Rahu+180; nakshatra lord cycle; dasha sums=120y; D9 formula; panchang tithi continuity), (b) real-birth spot checks documented for grandpa/Drik Panchang comparison. Frontend: `next build` clean + manual smoke checklist. Final wave: backend tests, engine sanity script, next build, README accuracy.

## Execution strategy
Sequential waves, each committed: (1) scaffold+engine core → (2) dasha/navamsa/transits/panchang/yogas → (3) services+API → (4) PDF → (5) frontend shell/theme → (6) frontend pages/chat/downloads → (7) docs+E2E. Windows note: use npm.cmd / uv-managed venv; execution policy blocks .ps1 shims.

## Todos
(filled by builder during execution)

## Final verification wave
1. `backend/.venv` pytest all green (evidence: terminal output)
2. Engine demo script prints a full chart JSON without errors
3. `npm.cmd run build` in frontend succeeds
4. Manual smoke: start uvicorn + next dev, create profile, see chart, ask chat question (mock or live key), download PDF

## Commit strategy
One commit per wave on main; conventional messages (`feat(engine): ...`). Never commit .env or *.db.

## Success criteria
Grandpa can enter a birth detail set, get a correct-looking North Indian kundli + dasha + panchang, chat in Hindi/Hinglish/English grounded in that chart, and download a PDF report — entirely offline except cloud LLM calls (optional if using local provider).
