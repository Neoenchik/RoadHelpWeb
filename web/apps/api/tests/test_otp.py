"""Тесты OTP-сервиса. Используем fakeredis."""
from __future__ import annotations

import pytest
import pytest_asyncio

from app.services import otp as otp_module
from app.services.otp import OtpInvalidError, OtpRateLimitError, send_otp, verify_otp


class FakeRedis:
    """Минимальный fake redis с TTL — игнорим, т.к. тесты быстрые."""

    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    async def incr(self, key: str) -> int:
        v = int(self.store.get(key, "0")) + 1
        self.store[key] = str(v)
        return v

    async def expire(self, key: str, sec: int) -> None:
        pass

    async def set(self, key: str, value: str, ex: int | None = None) -> None:
        self.store[key] = value

    async def get(self, key: str) -> str | None:
        return self.store.get(key)

    async def delete(self, *keys: str) -> int:
        n = 0
        for k in keys:
            if k in self.store:
                del self.store[k]
                n += 1
        return n


class FakeSms:
    def __init__(self) -> None:
        self.last: tuple[str, str] | None = None

    async def send(self, phone: str, text: str) -> None:
        self.last = (phone, text)


@pytest_asyncio.fixture
async def redis_and_sms(monkeypatch):
    fake = FakeRedis()
    sms = FakeSms()
    monkeypatch.setattr(otp_module, "get_redis", lambda: fake)
    monkeypatch.setattr(otp_module, "get_sms_provider", lambda: sms)
    return fake, sms


async def test_send_and_verify_happy_path(redis_and_sms) -> None:
    fake, sms = redis_and_sms
    await send_otp("+79991234567")
    assert sms.last is not None
    assert sms.last[0] == "+79991234567"
    code = fake.store["otp:+79991234567"]
    assert len(code) == 4 and code.isdigit()

    ok = await verify_otp("+79991234567", code)
    assert ok is True
    # Код удалён после успешной верификации
    assert "otp:+79991234567" not in fake.store


async def test_wrong_code_returns_false(redis_and_sms) -> None:
    fake, _ = redis_and_sms
    await send_otp("+79991234567")
    ok = await verify_otp("+79991234567", "0000")
    # Может совпасть случайно — повторим до отличия
    if ok:
        await send_otp("+79991234567")
        real = fake.store["otp:+79991234567"]
        wrong = "1111" if real != "1111" else "2222"
        ok = await verify_otp("+79991234567", wrong)
    assert ok is False


async def test_rate_limit_3_in_window(redis_and_sms) -> None:
    await send_otp("+79991234567")
    await send_otp("+79991234567")
    await send_otp("+79991234567")
    with pytest.raises(OtpRateLimitError):
        await send_otp("+79991234567")


async def test_expired_code_raises(redis_and_sms) -> None:
    fake, _ = redis_and_sms
    # Просто очистим — эмулирует истечение TTL
    await send_otp("+79991234567")
    fake.store.pop("otp:+79991234567")
    with pytest.raises(OtpInvalidError):
        await verify_otp("+79991234567", "1234")


async def test_too_many_attempts_invalidates(redis_and_sms) -> None:
    fake, _ = redis_and_sms
    await send_otp("+79991234567")
    # 5 неверных попыток = блокировка
    real = fake.store["otp:+79991234567"]
    wrong = "0000" if real != "0000" else "9999"
    for _ in range(5):
        await verify_otp("+79991234567", wrong)
    with pytest.raises(OtpInvalidError):
        await verify_otp("+79991234567", real)
