# Free LLM Provider Setup

The backend talks to **any OpenAI-compatible chat-completions endpoint**. Pick one or more free providers; switch anytime with `LLM_PROVIDER` in `backend/.env`. No code changes ever needed.

## 1. Google Gemini (recommended default)

1. Get a free API key: <https://aistudio.google.com/apikey>
2. In `backend/.env`:
   ```
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=AIza...
   GEMINI_MODEL=gemini-2.5-flash
   ```
Free tier limits are generous for personal use (~daily request quota per model).

## 2. Groq (fastest free option)

1. Free key: <https://console.groq.com/keys>
2. `backend/.env`:
   ```
   LLM_PROVIDER=groq
   GROQ_API_KEY=gsk_...
   GROQ_MODEL=llama-3.3-70b-versatile
   ```

## 3. OpenRouter (free model variants)

1. Key: <https://openrouter.ai/keys>
2. `backend/.env`:
   ```
   LLM_PROVIDER=openrouter
   OPENROUTER_API_KEY=sk-or-...
   OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
   ```

## 4. LM Studio (fully offline fallback)

Your machine has no dedicated GPU, so expect slow generation — treat as emergency-only.

1. Open LM Studio → load any instruct GGUF (stock `Qwen2.5-7B-Instruct` recommended over astrology fine-tunes)
2. Start the local server (Developer tab → Start Server, port 1234)
3. `backend/.env`:
   ```
   LLM_PROVIDER=lmstudio
   LMSTUDIO_MODEL=<model name shown in LM Studio>
   ```

## 5. Ollama (offline alternative)

```
ollama pull qwen2.5:7b
```
```
LLM_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5:7b
```

## Why not the HuggingFace astrology fine-tunes?

We evaluated all four candidates you shortlisted (Feb–Aug 2026 cards):
| Model | Verdict |
|---|---|
| DevjeetMandal/qwen2.5-7b-vedaz | Trained on only 55 chats; card admits "not a real astrology engine". Its *safety persona* is worth copying into prompts (we did). |
| aungzaythant/gemma-4-E2B-astrology-v4 | Western sun-sign + tarot, EN/Burmese only; "No Vedic knowledge" |
| carlosmm26/qwopus-esoteric-9b-gguf | Western esoterica (tarot/kabbalah), not Vedic |
| 11-47/SmolLM-135M-Tarot-Zodiac | 135M toy model |

A strong general model grounded with exact Swiss-Ephemeris chart data outperforms all of them — this matches your own POC testing (Gemini Flash beat the fine-tunes).
