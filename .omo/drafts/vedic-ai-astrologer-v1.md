---
slug: vedic-ai-astrologer-v1
status: awaiting-approval
intent: clear
pending-action: write .omo/plans/vedic-ai-astrologer-v1.md
approach: Monorepo — FastAPI backend (Python, pyswisseph engine evolved from user's POC astro_engine.py) + Next.js frontend; OpenAI-compatible LLM adapter layer (cloud free-tier primary: Gemini/Groq/OpenRouter; local LM Studio/Ollama fallback); SQLite persistence; golden-value QA cross-checked with grandpa.
---

# Draft: vedic-ai-astrologer-v1

## Components (topology ledger)
<!-- id | outcome (one line) | status | evidence path -->

| id | outcome | status | evidence |
|----|---------|--------|----------|
| C1 Astro-compute engine | Deterministic sidereal math: D1 + D9 charts, nakshatras, Vimshottari dasha/antardasha, transits (gochar), yoga detection, panchang basics, North-Indian chart data. Evolves `astro_engine.py` from POC. | active | c:\Users\aayub\.gemini\antigravity\scratch\vedic_astro_app\astro_engine.py |
| C2 AI astrologer layer | OpenAI-compatible chat-completions adapter; provider registry (Gemini free tier / Groq / OpenRouter / LM Studio / Ollama); grounded system-prompt builder from engine output; language toggle EN/HI/Hinglish; safety guardrails (no death/medical/financial guarantees). | active | POC app.py lines 204-217, 277-313 |
| C3 Backend API | FastAPI app: REST endpoints for geocoding, chart generation, profile CRUD, chat sessions (SSE streaming). SQLite via SQLAlchemy. Private-first but deployable publicly later (CORS, env-based config). | active | decision interview |
| C4 Web frontend | Next.js (App Router) UI: birth-data form with city autocomplete, North Indian SVG kundli, dasha timeline tables, chat UI with streaming + language toggle, profile list. | active | decision interview |
| C5 Public deployment hardening | Auth, rate limits, hosted GPU/API keys | deferred (Phase 2 roadmap) | decision: "start private, go public later" |
| C6 Custom fine-tune on Vedic books | Own fine-tuned model trained on Jyotish texts | deferred (Phase 2 roadmap) | user: "if needed we can do that if not we can use these cloud api models" |

## Open assumptions (announced defaults)
| assumption | adopted default | rationale | reversible? |
|---|---|---|---|
| Local fallback model tier | 7B Q4 via LM Studio (user's Ultra 7 CPU/iGPU, 32GB RAM → slow but usable emergency-only) | no dGPU; cloud is primary | yes |
| Free cloud providers | Gemini API free tier primary; Groq/OpenRouter free as alternates; all via OpenAI-compatible endpoints | user wants "whatever is possible and available for free to test" | yes |
| DB | SQLite file DB, SQLAlchemy ORM | private phase, zero cost; swap to Postgres later if public | yes |
| Geocoding | Nominatim (geopy) server-side + timezonefinder for tz from lat/lon (fixes POC hardcoded IST) | free, no key | yes |
| Ephemeris files | Bundle Swiss Ephemeris .se1 files 1800–2400 in repo/backend | offline determinism | yes |
| Ayanamsa | Lahiri default, config constant | standard Vedic; POC used it | yes |
| Package manager | pnpm for Next.js, uv or venv+pip for Python | modern defaults | yes |
| Repo layout | monorepo: backend/ + frontend/ + docs/ | single repo, mobile app joins later | yes |

## Findings (cited - path:lines)
- VERIFIED (ai.google.dev/gemini-api/docs/openai): Gemini OpenAI-compat base URL = https://generativelanguage.googleapis.com/v1beta/openai/ , Bearer GEMINI_API_KEY auth, standard /chat/completions shape incl. SSE streaming. Current flash-tier model ids exist (e.g. gemini-3.7-flash family); worker confirms exact id at build time.
- VERIFIED (context7 /astrorigin/pyswisseph): correct modern usage = swe.set_ephe_path(); swe.set_sid_mode(swe.SIDM_LAHIRI,0,0); swe.utc_time_zone()+swe.utc_to_jd() for tz-safe JD conversion; flags swe.FLG_SWIEPH|swe.FLG_SPEED(+FLG_SIDEREAL); houses_ex(jd,lat,lon,b'W',FLG_SIDEREAL) → ascmc[swe.ASC]. This replaces POC's manual timedelta UTC math and fixes DST/historical-tz correctness when paired with timezonefinder.
- Known OpenAI-compatible endpoints for adapter registry: Gemini (above), Groq https://api.groq.com/openai/v1 (free tier, verify model ids at build), OpenRouter https://openrouter.ai/api/v1 (has :free model variants), LM Studio http://localhost:1234/v1, Ollama http://localhost:11434/v1.
- POC engine `astro_engine.py`: working pyswisseph sidereal calc (Lahiri), lagna via houses_ex, planets, Ketu derived, nakshatra+pada, exaltation/debilitation, Vimshottari maha+antardasha using 365.25-day year approximation (drift risk ~several days over decades), hardcoded tz_offset=5.5 param, silent fallback to HARDCODED demo chart on any swe failure (dangerous — must be removed), geocode fallback Indore.
- POC UI `app.py` (Streamlit): LM Studio + Ollama streaming clients both OpenAI-ish; system prompt injects serialized chart markdown; anti-repetition prompt hacks observed (model looped template sentences).
- Blueprint doc (Downloads): decoupled architecture validated — deterministic calc + grounded LLM context; recommends stellium/pyswisseph + Ollama containerization; Docker compose reference.
- Workspace `C:\Users\aayub\Desktop\development\astro-model-and-app` is EMPTY except .git/.omo — greenfield build.
- HF MODEL VERDICTS (verified from model cards, this session):
  - DevjeetMandal/qwen2.5-7b-vedaz: Qwen2.5-7B QLoRA, Hindi/Hinglish empathetic-safety persona. Trained on ONLY 55 conversations; card states "Not a real astrology engine... plausible-sounding language, not verified computations"; 79 dl/mo. VALUE: borrow its refusal/safety phrasing for OUR system prompt; not usable as the brain.
  - aungzaythant/gemma-4-E2B-astrology-v4: 2B/5B Gemma, EN+Burmese, WESTERN sun-sign+tarot; card: "Cannot calculate real birth charts", "No Vedic (Jyotish) knowledge". NOT SUITABLE.
  - carlosmm26/qwopus-esoteric-9b-gguf: Qwen3.5-9B trained on WESTERN esoterica (tarot/kabbalah/hermeticism/Lilly horary). NOT VEDIC, not suitable.
  - 11-47/SmolLM-135M-Tarot-Zodiac: 135M toy, self-admitted hallucination risk. NOT SUITABLE.
  - CONCLUSION: architecture decision validated — grounded general cloud model >> any available fine-tune. Local fallback recommendation = STOCK Qwen2.5-7B-Instruct Q4_K_M via LM Studio/Ollama (general quality), Devjeet's optional as persona experiment only.
- HF models under research by librarian (bg_f0243a03): TIMED OUT after 30m; research completed directly by planner instead (verdicts above supersede).

## Decisions (with rationale)
1. Hybrid LLM, cloud-primary: user's own test showed Gemini Flash > fine-tuned models when fed factual chart data; KundliGPT itself uses strong general model + grounded data.
2. Single OpenAI-compatible adapter interface covers Gemini (OpenAI-compat endpoint), Groq, OpenRouter, LM Studio, Ollama → provider = config, not code.
3. FastAPI + Next.js chosen by user; API-first so future mobile app reuses endpoints unchanged.
4. Core pack v1 scope: D1+D9, dasha, transits, yogas, panchang basics (user choice).
5. Languages EN/HI/Hinglish toggle (user choice).
6. North Indian chart only (user choice).
7. Golden-value testing + grandpa cross-check vs Jagannatha Hora/Drik Panchang (user choice).
8. SQLite profiles + chat persistence (user choice).
9. Remove POC's hardcoded-fallback-chart behavior entirely; fail loudly instead.
10. Fine-tuning own model = Phase 2; public deployment = Phase 2.
11. PDF export (user addition): server-side PDF generation per person — kundli report w/ North Indian chart, planetary table, dasha timeline, panchang. Pure-Python stack safe on Windows: Jinja2 HTML template + xhtml2pdf (chart drawn with CSS-positioned divs, NOT SVG, avoiding cairo/GTK DLL pain). Frontend also offers direct SVG/PNG chart download client-side. API-first so future mobile app gets same endpoints.
12. Design system (user addition): consistent flat orange/white theme — orange primary (~#F97316 family), white surfaces, off-white cream accents (~#FFF8E7/#FFFBEB) as needed. HARD BAN on gradients and mixed inconsistent styling. Implemented as Tailwind design tokens (single palette source), mobile-first responsive across all pages/components.

## Scope IN
- backend/: FastAPI service (chart calc, geocoding+tz, profiles CRUD, chat SSE proxy to LLM providers, safety guardrails, language directive)
- Engine module: refactor of POC astro_engine.py + NEW: D9 Navamsa, transit positions, yoga detection (min: Gajakesari, Budhaditya, Neecha Bhanga, Panch Mahapurush set basic), panchang (tithi/nakshatra/yoga/karana/var), proper dasha dates (365.25→ precise day-count or swe ratio fix), timezonefinder integration
- PDF export module: per-person kundli report PDF (Jinja2 + xhtml2pdf, CSS-drawn chart), download endpoint
- frontend/: Next.js App Router, orange/white flat design-token theme (no gradients), birth-data form w/ autocomplete, North Indian SVG chart component, dasha table, transits panel, profile list/create, streaming chat w/ language selector, PDF/SVG/PNG downloads
- tests/: golden-value suite (~10 known births verified vs Drik Panchang/Jagannatha Hora), engine unit tests, API smoke tests, one e2e chat mock-provider test, PDF generation test
- docs/: README run instructions, provider setup guide (free keys)

## Scope OUT (Must NOT have)
- NO auth/login system in v1 (private phase)
- NO gun-milan matching, ashtakavarga, KP, full 16 vargas (Phase 2)
- NO custom model fine-tuning/training pipeline in v1
- NO payment/subscription
- NO mobile app code in v1 (API-first design only)
- NO removal of hardcoded fallback demo chart INTO new code (explicitly banned pattern)
- NO Docker requirement to run dev (plain uvicorn+vite ok); Dockerfile optional stretch

## Open questions
(none remaining — all forks answered in interview rounds 1–3)

## Approval gate
status: awaiting-approval
pending action: write .omo/plans/vedic-ai-astrologer-v1.md per approach above.
