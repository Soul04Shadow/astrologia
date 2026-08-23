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
        {"id": "llama-3.3-70b-versatile", "label": "Llama 3.3 70B Versatile", "ctx": "128K", "free": True, "tools": True},
        {"id": "qwen/qwen3-32b", "label": "Qwen3 32B", "ctx": "128K", "free": True, "tools": True},
        {"id": "openai/gpt-oss-120b", "label": "GPT-OSS 120B", "ctx": "128K", "free": True, "tools": True},
        {"id": "llama-3.1-8b-instant", "label": "Llama 3.1 8B Instant", "ctx": "128K", "free": True, "tools": True},
        {"id": "meta-llama/llama-4-scout-17b-16e-instruct", "label": "Llama 4 Scout", "ctx": "128K", "free": True, "tools": True},
    ],
    "openrouter": [
        {"id": "stealth/ox-alpha:free", "label": "Ox Alpha Free", "ctx": "1M", "free": True, "tools": True},
        {"id": "nvidia/nemotron-3-ultra:free", "label": "Nemotron 3 Ultra Free", "ctx": "1M", "free": True, "tools": True},
        {"id": "qwen/qwen3-coder:free", "label": "Qwen3 Coder", "ctx": "1M", "free": True, "tools": True},
        {"id": "openai/gpt-oss-20b:free", "label": "GPT-OSS 20B Free", "ctx": "131K", "free": True, "tools": True},
    ],
    "gemini": [
        {"id": "gemini-2.0-flash", "label": "Gemini 2.0 Flash", "ctx": "1M", "free": True, "tools": False},
        {"id": "gemini-1.5-flash", "label": "Gemini 1.5 Flash", "ctx": "1M", "free": True, "tools": False},
        {"id": "gemini-2.0-flash-lite", "label": "Gemini 2.0 Flash Lite", "ctx": "1M", "free": True, "tools": False},
        {"id": "gemini-1.5-pro", "label": "Gemini 1.5 Pro", "ctx": "2M", "free": True, "tools": False},
    ],
    "lmstudio": [
        {"id": "lm-studio", "label": "LM Studio Local", "ctx": "32K", "free": True, "tools": False},
    ],
    "ollama": [
        {"id": "qwen2.5:7b", "label": "Qwen2.5 7B", "ctx": "32K", "free": True, "tools": False},
    ],
}
