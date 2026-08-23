# Free LLM Provider Setup

The backend talks to **any OpenAI-compatible chat-completions endpoint**. Pick one or more free providers; switch anytime with `LLM_PROVIDER` in `backend/.env`. No code changes ever needed. **Recommended order: zen → nvidia → groq → openrouter → gemini** (fastest free first).

## 1. OpenCode Zen (recommended default — Ox Alpha free)

1. Zen key: <https://opencode.ai/auth> → Get API key (no card, 8 free models: `ox-alpha-free`, `big-pickle`, `mimo-v2.5-free`, `hy3-free`, `nemotron-3-ultra-free`, `nemotron-3.5-lightning-free`, `deepseek-v4-flash-free`, `muse-spark`…), endpoint `https://opencode.ai/zen/v1`
2. In `backend/.env`:
   ```
   LLM_PROVIDER=zen
   ZEN_API_KEY=zen_...
   ZEN_MODEL=ox-alpha-free
   ```
Free tier: `GET /zen/v1/models` lists live frees; Ox Alpha = 1M ctx, best general free at `0 $/1M` via Zen.

## 2. Nvidia NIM (free prototyping — Nemotron)

1. Free key: <https://build.nvidia.com/settings/api-keys> → Generate `nvapi-` (no card, 1K credits starter → 5K on request, 40 RPM, filter catalog “Free Endpoint”)
2. In `backend/.env`:
   ```
   LLM_PROVIDER=nvidia
   NVIDIA_API_KEY=nvapi-...
   NVIDIA_MODEL=nvidia/nemotron-3-ultra-550b-a55b
   ```
Endpoint `https://integrate.api.nvidia.com/v1` — OpenAI compat, supports `tools` for deep reasoning loop.

## 3. Groq (fastest free — tool-calling ready)

1. Free key: <https://console.groq.com/keys> (no card, 30 RPM / 1K RPD most models)
2. In `backend/.env`:
   ```
   LLM_PROVIDER=groq
   GROQ_API_KEY=gsk_...
   GROQ_MODEL=llama-3.3-70b-versatile
   ```

## 4. OpenRouter (free :free variants — Ox Alpha too)

1. Key: <https://openrouter.ai/keys> (free account 50 RPD → 1K RPD after $10 credit)
2. In `backend/.env`:
   ```
   LLM_PROVIDER=openrouter
   OPENROUTER_API_KEY=sk-or-...
   OPENROUTER_MODEL=stealth/ox-alpha:free
   ```
Or `openrouter/free` auto-router.

## 5. Google Gemini (fallback — static, no tool-loop)

1. Free key: <https://aistudio.google.com/apikey>
2. In `backend/.env`:
   ```
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=AIza...
   GEMINI_MODEL=gemini-2.5-flash
   ```
Tool-loop disabled for Gemini (thought_signature required) — uses static grounded prompt only. Use Groq/OpenRouter/Zen/Nvidia for deep `🔧 tool_call` reasoning.

## 6. LM Studio (fully offline fallback)

Your machine has no dedicated GPU, so expect slow generation — treat as emergency-only.

1. Open LM Studio → load any instruct GGUF (stock `Qwen2.5-7B-Instruct` recommended over astrology fine-tunes)
2. Start the local server (Developer tab → Start Server, port 1234)
3. `backend/.env`:
   ```
   LLM_PROVIDER=lmstudio
   LMSTUDIO_MODEL=<model name shown in LM Studio>
   ```

## 7. Ollama (offline alternative)

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

## Translation & sessions (no extra key)

Chat retro-translation (`POST /api/translate`) re-uses the same `LLM_PROVIDER` key/model via `provider_config` + `complete_chat` — no new service or key needed. Per-profile chat sessions (`/api/profiles/{id}/sessions`, `?session_id=` on `/api/chat/{id}`) share the same DB and auth model.
