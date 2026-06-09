from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    bot_token: str = field(default_factory=lambda: os.environ["BOT_TOKEN"])
    database_url: str = field(default_factory=lambda: os.environ.get("DATABASE_URL", ""))
    api_url: str = field(default_factory=lambda: os.getenv("API_URL", "http://localhost:8080"))
    bot_secret: str = field(default_factory=lambda: os.getenv("BOT_SECRET", "super_secret_bot_key_dev"))
    redis_url: str = field(default_factory=lambda: os.getenv("REDIS_URL", "redis://localhost:6379"))
    admin_ids: list[int] = field(default_factory=lambda: [
        int(i) for i in os.getenv("ADMIN_IDS", "").split(",") if i.strip()
    ])
    cancel_rate_threshold: float = field(
        default_factory=lambda: float(os.getenv("CANCEL_RATE_THRESHOLD", "0.20"))
    )
    maps_api_key: str = field(default_factory=lambda: os.getenv("MAPS_API_KEY", ""))

    # Matching settings
    matching_radius_km: float = 50.0
    accept_timeout_sec: int = 60
    arrival_threshold_m: float = 200.0
    location_update_interval_sec: int = 30


config = Config()
