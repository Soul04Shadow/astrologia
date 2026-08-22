# ॐ Vedic AI Astrologer

A private-first, full-stack Vedic astrology web app: exact Swiss-Ephemeris kundli generation plus an AI astrologer chat grounded in the calculated chart — built for professional consultation use.

## What it does

- **Exact calculations** (Lahiri sidereal, Swiss Ephemeris): D1 rasi chart with lagna, nakshatra/pada, dignities, retrograde & combust flags · Vimshottari maha/antardasha timeline with current-period detection · Navamsa D9 with vargottama marking · live transits (gochar) · panchang (tithi/nakshatra/yoga/karana/var) · yoga detection (Gajakesari, Budhaditya, Neecha Bhanga Raja, Panch Mahapurush, Dhana)
- **Grounded AI consultations** in English / हिंदी / Hinglish via any OpenAI-compatible provider (Gemini free tier, Groq, OpenRouter, LM Studio, Ollama) with strict safety guardrails
- **Saved profiles** for returning clients, persisted chat history per person
- **PDF report downloads** (full kundli report) + SVG/PNG chart downloads

## Quick start

### Backend (Python 3.13 venv already created)

```powershell
cd backend
copy .env.example .env        # then add a free API key (see docs/providers.md)
.venv\Scripts\activate
pip install -r requirements.txt   # skip if already installed
uvicorn app.main:app --port 8000
```

### Frontend

```powershell
cd frontend
npm install                   # skip if node_modules exists
npm run dev
```

Open **http://localhost:3000** → create a birth profile → view chart → consult.

## Accuracy verification

Golden-value tests: `cd backend && .venv\Scripts\python.exe -m pytest tests -q`
Cross-check any generated chart against Drik Panchang or Jagannatha Hora before trusting it professionally — see `docs/providers.md` for the model-evaluation notes.

## Architecture

```
backend/   FastAPI · app/engine (pyswisseph math) · app/services (geo, llm, prompt, pdf)
frontend/  Next.js 16 App Router · Tailwind v4 flat orange/white theme
```

Design rules: flat solid colors only (orange #EA580C family on white, cream #FFF8E7 accents), **no gradients**, mobile-first responsive.
