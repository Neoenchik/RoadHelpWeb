"""Провайдеры SMS — абстрактный интерфейс + реализации mock и SMS.RU."""
from __future__ import annotations

import logging
from typing import Protocol

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class SmsProvider(Protocol):
    async def send(self, phone: str, text: str) -> None: ...


class MockSmsProvider:
    """В dev-режиме просто пишем код в логи."""

    async def send(self, phone: str, text: str) -> None:
        # ВНИМАНИЕ: сам OTP логируем ТОЛЬКО в dev-режиме (mock).
        # В prod провайдер другой — там OTP не светим.
        logger.info("[SMS MOCK] -> %s: %s", phone, text)
        print(f"\n  📱 SMS to {phone}: {text}\n", flush=True)


class SmsRuProvider:
    """SMS.RU — простейший HTTP API."""

    BASE = "https://sms.ru/sms/send"

    async def send(self, phone: str, text: str) -> None:
        if not settings.sms_ru_api_id:
            raise RuntimeError("SMS_RU_API_ID is not configured")
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                self.BASE,
                params={
                    "api_id": settings.sms_ru_api_id,
                    "to": phone.lstrip("+"),
                    "msg": text,
                    "json": 1,
                },
            )
        r.raise_for_status()
        data = r.json()
        if data.get("status") != "OK":
            raise RuntimeError(f"SMS.RU error: {data}")
        # Не логируем сам код — только факт.
        logger.info("[SMS] sent to %s", _mask_phone(phone))


def _mask_phone(phone: str) -> str:
    if len(phone) < 6:
        return "***"
    return f"{phone[:3]}***{phone[-2:]}"


def get_sms_provider() -> SmsProvider:
    if settings.sms_provider == "sms_ru":
        return SmsRuProvider()
    return MockSmsProvider()
