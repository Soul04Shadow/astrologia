# ॐ Vedic AI Astrologer

A private-first, full-stack Vedic astrology web app: exact Swiss-Ephemeris kundli generation plus an AI astrologer chat grounded in the calculated chart — built for professional consultation use.

## What it does

- **Exact calculations** (Lahiri sidereal, Swiss Ephemeris): D1 rasi chart with lagna, nakshatra/pada, dignities, retrograde & combust flags · Vimshottari maha/antardasha timeline with current-period detection · Navamsa D9 with vargottama marking · live transits (gochar) · panchang (tithi/nakshatra/yoga/karana/var) · yoga detection (Gajakesari, Budhaditya, Neecha Bhanga Raja, Panch Mahapurush, Dhana)
- **Grounded AI consultations** in English / हिंदी / Hinglish via any OpenAI-compatible provider (Gemini free tier, Groq, OpenRouter, LM Studio, Ollama) with strict safety guardrails
- **Saved profiles** for returning clients, per-profile **chat sessions** (multiple threads per kundli with New chat / rename / delete, `?s=` deep links, isolated histories)
- **Retro-translation**: language buttons (Hinglish / हिंदी / English) re-render all visible bubbles via `/api/translate` (uses same LLM provider, Markdown-preserving, cached per message) and global EN↔हिंदी toggle syncs `AppShell` + chart terms (`makeTerms`) and chat bubbles
- **PDF report downloads** (full kundli report) + SVG/PNG chart downloads

## Quick start

Double-click the scripts in the repo root (Windows):

- `start-backend.bat` — starts API on http://localhost:8000 (close its window to stop it)
- `start-frontend.bat` — starts UI on http://localhost:3000 (close its window to stop it)
- `stop-all.bat` — force-stops both

First time only: copy `backend/.env.example` to `backend/.env` and add a free Gemini key (see `docs/providers.md`). Changed `.env`? Just close the backend window and run `start-backend.bat` again.

### Manual commands (equivalent)

```powershell
# backend
cd backend
.venv\Scripts\activate
uvicorn app.main:app --port 8000

# frontend (second terminal)
cd frontend
npm run dev -- --port 3000
```

## Accuracy verification

Golden-value tests: `cd backend && .venv\Scripts\python.exe -m pytest tests -q`
Cross-check any generated chart against Drik Panchang or Jagannatha Hora before trusting it professionally — see `docs/providers.md` for the model-evaluation notes.

## Architecture

```
backend/   FastAPI · app/engine (pyswisseph math) · app/services (geo, llm, prompt, pdf)
frontend/  Next.js 16 App Router · Tailwind v4 flat orange/white theme
```

Design rules: flat solid colors only (orange #EA580C family on white, cream #FFF8E7 accents), **no gradients**, mobile-first responsive.
