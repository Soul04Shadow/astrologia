from __future__ import annotations

CATALOG: dict[str, list[dict]] = {
    "zen": [
        {"id": "ox-alpha-free", "label": "Ox Alpha", "ctx": "1M", "free": True, "tools": True},
        {"id": "big-pickle", "label": "Big Pickle", "ctx": "1M", "free": True, "tools": True},
        {"id": "mimo-v2.5-free", "label": "MiMo-V2.5", "ctx": "1M", "free": True, "tools": True},
        {"id": "hy3-free", "label": "Hy3", "ctx": "256K", "free": True, "tools": True},
        {"id": "nemotron-3-ultra-free", "label": "Nemotron 3 Ultra", "ctx": "1M", "free": True, "tools": True},
    ],
    "nvidia": [
        {"id": "nvidia/nemotron-3-ultra-550b-a55b", "label": "Nemotron 3 Ultra 550B", "ctx": "1M", "free": True, "tools": True},
        {"id": "meta/llama-3.3-70b-instruct", "label": "Llama 3.3 70B", "ctx": "128K", "free": True, "tools": True},
        {"id": "deepseek/deepseek-v4", "label": "DeepSeek V4", "ctx": "1M", "free": True, "tools": True},
        {"id": "z-ai/glm-5.2", "label": "GLM-5.2", "ctx": "1M", "free": True, "tools": True},
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
