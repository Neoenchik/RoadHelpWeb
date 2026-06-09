import httpx
import logging
from typing import Dict, Any, Optional
from cachetools import TTLCache
from bot.config import config

logger = logging.getLogger(__name__)

class ApiClient:
    def __init__(self, base_url: str, secret_key: str):
        self.base_url = base_url.rstrip("/")
        self.secret_key = secret_key
        # Reuse robust HTTP connection pool
        self.client = httpx.AsyncClient(base_url=self.base_url)
        # Thread-safe TTL cache for tokens (max 10000 entries, expires inside 1 hour)
        self.tokens = TTLCache(maxsize=10000, ttl=3600)
        
    async def close(self):
        await self.client.aclose()

    def _get_headers(self, telegram_id: Optional[int] = None) -> dict:
        headers = {"X-Bot-Secret": self.secret_key}
        if telegram_id and telegram_id in self.tokens:
            headers["Authorization"] = f"Bearer {self.tokens[telegram_id]}"
        return headers

    async def bot_login(self, telegram_id: int, phone: Optional[str] = None, first_name: Optional[str] = None, last_name: Optional[str] = None, role: str = "USER") -> Dict[str, Any]:
        """Login or register the user via backend BotAuthController"""
        payload = {
            "telegramId": telegram_id,
            "phone": phone,
            "firstName": first_name,
            "lastName": last_name,
            "role": role
        }
        resp = await self.client.post("/api/bot/auth/login", json=payload, headers=self._get_headers())
        resp.raise_for_status()
        data = resp.json()
        self.tokens[telegram_id] = data["access_token"]
        return data["user"]

    async def create_order(self, telegram_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
        resp = await self.client.post("/api/orders", json=payload, headers=self._get_headers(telegram_id))
        resp.raise_for_status()
        return resp.json()

    async def get_user_orders(self, telegram_id: int) -> list:
        resp = await self.client.get("/api/orders/history", headers=self._get_headers(telegram_id))
        if resp.status_code == 200:
            data = resp.json()
            return data if isinstance(data, list) else data.get("items", [])
        return []
            
    async def cancel_order(self, telegram_id: int, order_id: str) -> None:
        resp = await self.client.post(
            f"/api/orders/{order_id}/cancel",
            json={"reason": "Отменено через Telegram"},
            headers=self._get_headers(telegram_id),
        )
        resp.raise_for_status()

# Default shared instance
api = ApiClient(config.api_url, config.bot_secret)

