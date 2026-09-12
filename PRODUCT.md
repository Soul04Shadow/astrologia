# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary Users:** Professional Vedic astrologers and Jyotish practitioners conducting live, guided consultations with clients. They need credible, fast, dense, and precise reference information (chart math, planetary dignities, dasha periods, transits) that they can interpret on the fly during a session.
- **Secondary Users:** Serious astrology seekers exploring their own or family birth charts with a desire for classical rigor rather than pop-astrology horoscopes.

## Product Purpose

A private-first, full-stack Vedic astrology consultation workstation that pairs exact astronomical calculations (Swiss Ephemeris math, Lahiri sidereal) with an AI consultation assistant grounded strictly in computed planetary placements. Success means empowering practitioners to conduct accurate, ethical, and articulate consultations with high confidence, speed, and zero generic hallucination.

## Positioning

Unlike generic consumer horoscope or chatbot apps that generate ungrounded, fatalistic, or vague predictions, Vedic AI Astrologer is anchored directly in classical Parashari Jyotish principles and exact Swiss Ephemeris calculations. Every AI observation is strictly grounded in the client's computed planetary positions, dasha timeline, yogas, and transits.

## Operating Context

- **Consultation Station:** Used during one-on-one sessions (in-person or remote video/phone calls), often with client notes, multiple active profiles, and follow-up consultation threads (`?s=` deep links).
- **Multi-Language Practice:** Bilingual consultations in English, Hindi (हिंदी), and Hinglish with live message retro-translation (`/api/translate`) and synced chart terminology (`makeTerms`).
- **Deliverables:** Generating and exporting high-resolution PDF birth reports and SVG/PNG chart diagrams directly to clients.
- **Device Formats:** Desktop and laptop screens during consultation desk sessions; tablet and mobile web for quick mobile chart lookups.

## Capabilities and Constraints

- **Astrological Foundation:** Classical Parashari system as default framework (Lahiri sidereal ayanamsa, Swiss Ephemeris / pyswisseph). D1 Rasi, D9 Navamsa, Vimshottari Mahadasha/Antardasha, live Gochar transits, Panchang (tithi, vara, nakshatra, yoga, karana), and classical Yoga detection (Gajakesari, Budhaditya, Neecha Bhanga Raja, Panch Mahapurush, Dhana yogas).
- **Ethical Guardrails & Boundaries:**
  - Absolute ban on deterministic/fatalistic claims, fear-mongering (e.g., weaponizing Manglik, Sade Sati, or Kal Sarpa), or manipulative upselling.
  - Zero medical, legal, or financial guarantees.
  - Remedial suggestions (mantras, daan/charity, lifestyle adjustments) must be framed cautiously as traditional supportive practices, never as guaranteed remedies or transactions.
  - AI responses must never fabricate uncalculated planetary placements.
- **Privacy & Tech Stack:**
  - Private-first data architecture.
  - Next.js 16 App Router (React 19, Tailwind CSS v4) frontend; FastAPI backend with SQLAlchemy and pyswisseph.
  - Pluggable OpenAI-compatible LLM backends (Gemini, Groq, OpenRouter, Nvidia NIM, OpenCode Zen, LM Studio) without client data leakage.

## Brand Commitments

- **Name & Identity:** ॐ Vedic AI Astrologer (वैदिक एआई ज्योतिषी).
- **Tone & Voice:** Reverent, scholarly, objective, calm, and professional. Scholarly Jyotish terminology alongside accessible, compassionate explanations.
- **Visual Commitments:** Flat solid colors only (Saffron `#EA580C` family on white, warm cream `#FFF8E7` / `#F7F1E1`, panel `#FFFCF2`, gold accents `#C9A23F` / `#E0CB96`, ink `#292524`), strictly no gradients, clean borders, mobile-first responsive.

## Evidence on Hand

- Verified Swiss Ephemeris engine (`pyswisseph`) with golden-value test suites (`backend/tests`) cross-checked against Drik Panchang and Jagannatha Hora benchmarks.
- Production-ready dual English/Hindi dictionary mappings (`frontend/src/lib/dictionaries.ts`).
- Working PDF generation engine (`xhtml2pdf` / Jinja2 templates in backend).

## Product Principles

1. **Calculated Truth Over Intuition:** Every AI interpretation must trace back directly to calculated chart coordinates, dignities, house lordships, or classical yoga rules.
2. **Professional Rigor, Not Pop Horoscopes:** Favor information density, clarity, and precision over gamified or superficial horoscope clichés.
3. **Ethical Empowerment:** Foster client agency and clarity rather than anxiety, dependence, or fatalism; remedies are traditional reflections, not magical guarantees.
4. **Frictionless Practice Flow:** Ensure instant profile switching, thread isolation, and bilingual term toggling without interrupting the consultation rhythm.

## Accessibility & Inclusion

- Fully bilingual support (English and Hindi) with script-appropriate typography (Devanagari / Noto Sans Devanagari support alongside Inter).
- High contrast, legible typography on clean non-gradient backgrounds designed for extended reading during consultation sessions.
- WCAG-compliant touch targets and responsive layouts across desktop, tablet, and mobile.
