from __future__ import annotations

CATALOG: dict[str, list[dict]] = {
    "cliproxy": [
        {"id": "gemini-3.8-flash", "label": "Gemini 3.8 Flash (Antigravity)", "ctx": "1M", "free": False, "tools": True},
        {"id": "gemini-3.7-flash", "label": "Gemini 3.7 Flash (Antigravity)", "ctx": "1M", "free": False, "tools": True},
        {"id": "gemini-pro-agent", "label": "Gemini Pro Agent (Antigravity)", "ctx": "1M", "free": False, "tools": True},
        {"id": "claude-sonnet-4-6", "label": "Claude Sonnet 4.6 (Antigravity)", "ctx": "200K", "free": False, "tools": True},
        {"id": "claude-opus-4-6-thinking", "label": "Claude Opus 4.6 Thinking (Antigravity)", "ctx": "200K", "free": False, "tools": True},
    ],
    "zen": [
        {"id": "ox-alpha-free", "label": "Ox Alpha", "ctx": "1M", "free": True, "tools": True},
        {"id": "big-pickle", "label": "Big Pickle", "ctx": "1M", "free": True, "tools": True},
        {"id": "mimo-v2.5-free", "label": "MiMo-V2.5", "ctx": "1M", "free": True, "tools": True},
        {"id": "hy3-free", "label": "Hy3", "ctx": "256K", "free": True, "tools": True},
        {"id": "nemotron-3-ultra-free", "label": "Nemotron 3 Ultra", "ctx": "1M", "free": True, "tools": True},
    ],
    "nvidia": [
        {"id": "nvidia/nemotron-3-nano-30b-a3b", "label": "Nemotron 3 Nano 30B (Fast)", "ctx": "1M", "free": True, "tools": True},
        {"id": "nvidia/llama-3.3-nemotron-super-49b-v1.5", "label": "Nemotron Super 49B v1.5", "ctx": "128K", "free": True, "tools": True},
        {"id": "nvidia/nemotron-3-ultra-550b-a55b", "label": "Nemotron 3 Ultra 550B", "ctx": "1M", "free": True, "tools": True},
        {"id": "meta/llama-3.3-70b-instruct", "label": "Llama 3.3 70B Instruct", "ctx": "128K", "free": True, "tools": True},
        {"id": "deepseek-ai/deepseek-v4-flash-0731", "label": "DeepSeek V4 Flash", "ctx": "1M", "free": True, "tools": True},
        {"id": "mistralai/mistral-large-2-instruct", "label": "Mistral Large 2", "ctx": "128K", "free": True, "tools": True},
    ],
    "groq": [
        {"id": "groq/compound", "label": "Groq Compound", "ctx": "128K", "free": True, "tools": True},
        {"id": "groq/compound-mini", "label": "Groq Compound Mini", "ctx": "128K", "free": True, "tools": True},
        {"id": "openai/gpt-oss-120b", "label": "GPT-OSS 120B", "ctx": "128K", "free": True, "tools": True},
        {"id": "openai/gpt-oss-20b", "label": "GPT-OSS 20B", "ctx": "128K", "free": True, "tools": True},
        {"id": "qwen/qwen3.6-27b", "label": "Qwen3.6 27B", "ctx": "128K", "free": True, "tools": True},
    ],
    "openrouter": [
        {"id": "stealth/ox-alpha:free", "label": "Ox Alpha Free", "ctx": "1M", "free": True, "tools": True},
        {"id": "nvidia/nemotron-3-ultra:free", "label": "Nemotron 3 Ultra Free", "ctx": "1M", "free": True, "tools": True},
        {"id": "qwen/qwen3-coder:free", "label": "Qwen3 Coder", "ctx": "1M", "free": True, "tools": True},
        {"id": "openai/gpt-oss-20b:free", "label": "GPT-OSS 20B Free", "ctx": "131K", "free": True, "tools": True},
    ],
    "gemini": [
        {"id": "gemini-3.7-flash", "label": "Gemini 3.7 Flash", "ctx": "1M", "free": True, "tools": False},
        {"id": "gemini-3.6-flash", "label": "Gemini 3.6 Flash", "ctx": "1M", "free": True, "tools": False},
        {"id": "gemini-3.5-flash", "label": "Gemini 3.5 Flash", "ctx": "1M", "free": True, "tools": False},
        {"id": "gemini-3.5-flash-lite", "label": "Gemini 3.5 Flash Lite", "ctx": "1M", "free": True, "tools": False},
    ],
    "lmstudio": [
        {"id": "lm-studio", "label": "LM Studio Local", "ctx": "32K", "free": True, "tools": False},
    ],
    "ollama": [
        {"id": "qwen2.5:7b", "label": "Qwen2.5 7B", "ctx": "32K", "free": True, "tools": False},
    ],
}
