from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Vedic AI Astrologer"
    database_url: str = "sqlite:///./app.db"
    cors_origins: str = "http://localhost:3000"

    llm_provider: str = "gemini"
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_api_key: str = ""
    openrouter_model: str = "google/gemini-2.0-flash-exp:free"

    lmstudio_base_url: str = "http://localhost:1234/v1"
    lmstudio_api_key: str = "lm-studio"
    lmstudio_model: str = ""

    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_api_key: str = "ollama"
    ollama_model: str = "qwen2.5:7b"

    temperature: float = 0.4
    max_history_messages: int = 16

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def provider_config(provider: str | None = None) -> dict:
    s = get_settings()
    name = (provider or s.llm_provider).lower()
    base_url = getattr(s, f"{name}_base_url", None)
    api_key = getattr(s, f"{name}_api_key", None)
    model = getattr(s, f"{name}_model", None)
    if not base_url:
        raise ValueError(f"Unknown provider '{name}'")
    return {"name": name, "base_url": base_url.rstrip("/"), "api_key": api_key or "", "model": model or ""}


def available_providers() -> list[dict]:
    out = []
    for name in ["gemini", "groq", "openrouter", "lmstudio", "ollama"]:
        try:
            cfg = provider_config(name)
            ready = bool(cfg["model"]) and (bool(cfg["api_key"]) or name in ("lmstudio", "ollama"))
            out.append({"id": name, "ready": ready})
        except ValueError:
            out.append({"id": name, "ready": False})
    return out
