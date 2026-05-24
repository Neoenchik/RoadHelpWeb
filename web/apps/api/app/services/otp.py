"""OTP-сервис: генерация, хранение в Redis, проверка с лимитом попыток."""
from __future__ import annotations

import logging
import secrets
from datetime import timedelta

from app.services.redis_client import get_redis
from app.services.sms import get_sms_provider

logger = logging.getLogger(__name__)

OTP_TTL = timedelta(minutes=5)
OTP_MAX_ATTEMPTS = 5
OTP_RATE_WINDOW = timedelta(minutes=10)
OTP_RATE_MAX = 3  # 3 OTP в 10 минут на телефон


class OtpRateLimitError(Exception):
    pass


class OtpInvalidError(Exception):
    pass


def _otp_key(phone: str) -> str:
    return f"otp:{phone}"


def _otp_attempts_key(phone: str) -> str:
    return f"otp:attempts:{phone}"


def _otp_rate_key(phone: str) -> str:
    return f"otp:rate:{phone}"


async def send_otp(phone: str) -> None:
    """Генерирует код, сохраняет в Redis, отправляет через провайдера."""
    redis = get_redis()

    # Лимит на отправку
    rate_key = _otp_rate_key(phone)
    sent = await redis.incr(rate_key)
    if sent == 1:
        await redis.expire(rate_key, int(OTP_RATE_WINDOW.total_seconds()))
    if sent > OTP_RATE_MAX:
        raise OtpRateLimitError("Слишком много попыток. Попробуйте через 10 минут.")

    code = f"{secrets.randbelow(10000):04d}"
    await redis.set(_otp_key(phone), code, ex=int(OTP_TTL.total_seconds()))
    await redis.delete(_otp_attempts_key(phone))

    provider = get_sms_provider()
    await provider.send(phone, f"Road Help: код подтверждения {code}")


async def verify_otp(phone: str, code: str) -> bool:
    """True — код верный. После верификации код удаляется."""
    redis = get_redis()
    key = _otp_key(phone)
    attempts_key = _otp_attempts_key(phone)

    # Проверяем число попыток
    attempts = await redis.incr(attempts_key)
    if attempts == 1:
        await redis.expire(attempts_key, int(OTP_TTL.total_seconds()))
    if attempts > OTP_MAX_ATTEMPTS:
        await redis.delete(key)
        raise OtpInvalidError("Превышен лимит попыток. Запросите новый код.")

    stored = await redis.get(key)
    if stored is None:
        raise OtpInvalidError("Код истёк. Запросите новый.")
    if stored != code:
        return False

    # Успех — чистим
    await redis.delete(key, attempts_key)
    return True
