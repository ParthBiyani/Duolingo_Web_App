"""Application settings, read from environment variables or an optional ``backend/.env`` file."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
"""The ``backend/`` folder. Defaults are built from it so they work from any working directory."""

DEFAULT_DATABASE_URL = f"sqlite:///{(BACKEND_DIR / 'data' / 'app.db').as_posix()}"

LogLevel = Literal["debug", "info", "warning", "error", "critical"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    database_url: str = DEFAULT_DATABASE_URL
    app_env: Literal["development", "test", "production"] = "development"
    demo_tools: bool = False  # enables /api/v1/demo/* (simulated clock and data reset)
    log_level: LogLevel = "info"

    @field_validator("log_level", mode="before")
    @classmethod
    def _lowercase_log_level(cls, value: object) -> object:
        # Accept LOG_LEVEL=INFO as well as LOG_LEVEL=info.
        return value.lower() if isinstance(value, str) else value


@lru_cache
def get_settings() -> Settings:
    """Return the settings, read once per process. Tests replace it with a dependency override."""
    return Settings()
