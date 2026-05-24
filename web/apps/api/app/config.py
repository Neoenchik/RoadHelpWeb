"""App config — все env-переменные в одном месте, через pydantic-settings."""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    node_env: Literal["development", "production", "test"] = "development"

    # Backend
    database_url: str = "postgresql+asyncpg://road:road@localhost:5432/roadhelp"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "dev-secret-change-me"
    jwt_access_ttl_min: int = 15
    jwt_refresh_ttl_days: int = 30
    allowed_origins: str = "http://localhost:3000"

    # SMS
    sms_provider: Literal["mock", "sms_ru"] = "mock"
    sms_ru_api_id: str = ""

    # S3 / MinIO
    s3_endpoint: str = "http://localhost:9000"
    s3_public_endpoint: str = "http://localhost:9000"
    s3_bucket: str = "roadhelp"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_region: str = "us-east-1"

    # Web Push
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = "mailto:admin@roadhelp.local"

    # Бизнес-параметры
    matching_radius_km: float = 50.0
    executor_accept_timeout_sec: int = 60
    arrival_radius_m: float = 200.0
    cancel_rate_threshold: float = 0.20

    # Email
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@roadhelp.local"
    invite_base_url: str = "http://localhost:3000"

    # Bootstrap
    admin_bootstrap_email: str = "admin@roadhelp.local"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.node_env == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
