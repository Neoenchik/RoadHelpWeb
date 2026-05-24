"""Matching engine.

Что хранится в Redis (для каждого заказа):
  match:{order_id}:queue         — list[exec_id], кандидаты по порядку
  match:{order_id}:offer         — текущий exec_id, кому отправлено предложение
  match:{order_id}:offer_until   — unix timestamp дедлайна (sec)

Жизненный цикл:
  enqueue_order(order)         — построить очередь и предложить первому
  refresh_offer(order_id)      — таймер истёк, перейти к следующему
  accept_offer(order_id, ex)   — исполнитель принял
  decline_offer(order_id, ex)  — исполнитель отказался → перейти к следующему
  cancel_match(order_id)       — заказ отменён юзером
"""
from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import (
    ExecutorOnlineStatus,
    ExecutorProfile,
    ExecutorVerificationStatus,
    Order,
    OrderStatus,
    User,
)
from app.services.geo import haversine_km
from app.services.redis_client import get_redis

logger = logging.getLogger(__name__)


def _qkey(order_id) -> str: return f"match:{order_id}:queue"
def _okey(order_id) -> str: return f"match:{order_id}:offer"
def _dkey(order_id) -> str: return f"match:{order_id}:offer_until"


@dataclass
class Candidate:
    user_id: str
    distance_km: float
    rating: float
    completed_count: int


async def _candidates(order: Order, db: AsyncSession) -> list[Candidate]:
    rows = (
        await db.execute(
            select(ExecutorProfile, User)
            .join(User, User.id == ExecutorProfile.user_id)
            .where(
                ExecutorProfile.online_status == ExecutorOnlineStatus.ONLINE,
                ExecutorProfile.verification_status == ExecutorVerificationStatus.VERIFIED,
                ExecutorProfile.service_types.any(order.service_type.value),
                ExecutorProfile.lat.isnot(None),
                ExecutorProfile.lng.isnot(None),
            )
        )
    ).all()

    out: list[Candidate] = []
    for ep, _u in rows:
        if ep.lat is None or ep.lng is None:
            continue
        d = haversine_km(order.lat, order.lng, ep.lat, ep.lng)
        if d > settings.matching_radius_km:
            continue
        out.append(Candidate(str(ep.user_id), round(d, 2), ep.rating, ep.completed_count))

    out.sort(key=lambda c: (c.distance_km, -c.rating, -c.completed_count))
    return out[:20]


async def enqueue_order(order: Order, db: AsyncSession) -> Candidate | None:
    """Ставит заказ в матчинг и шлёт оффер первому кандидату."""
    candidates = await _candidates(order, db)
    redis = get_redis()
    pipe = redis.pipeline()
    pipe.delete(_qkey(order.id), _okey(order.id), _dkey(order.id))
    if candidates:
        pipe.rpush(_qkey(order.id), *[c.user_id for c in candidates])
    await pipe.execute()
    return await _offer_next(order.id, db)


async def _offer_next(order_id, db: AsyncSession) -> Candidate | None:
    """Берёт следующего из очереди, ставит ему оффер с дедлайном."""
    redis = get_redis()
    while True:
        next_id = await redis.lpop(_qkey(order_id))
        if next_id is None:
            await redis.delete(_okey(order_id), _dkey(order_id))
            await _set_pending_again(order_id, db)
            return None
        # Проверим, что кандидат ещё ONLINE
        ep = await db.scalar(
            select(ExecutorProfile).where(ExecutorProfile.user_id == next_id)
        )
        if ep is None or ep.online_status != ExecutorOnlineStatus.ONLINE:
            continue

        deadline = int(time.time()) + settings.executor_accept_timeout_sec
        await redis.set(_okey(order_id), str(next_id), ex=settings.executor_accept_timeout_sec + 5)
        await redis.set(_dkey(order_id), deadline)

        # Обновим заказ: status=MATCHED, executor_id=кандидат
        order = await db.get(Order, order_id)
        if order is None:
            continue
        order.status = OrderStatus.MATCHED
        order.executor_id = ep.user_id
        order.matched_at = datetime.now(tz=timezone.utc)
        await db.commit()

        return Candidate(str(next_id), 0, ep.rating, ep.completed_count)


async def _set_pending_again(order_id, db: AsyncSession) -> None:
    """Очередь иссякла — заказ обратно в PENDING без исполнителя."""
    order = await db.get(Order, order_id)
    if order and order.status in (OrderStatus.MATCHED, OrderStatus.PENDING):
        order.status = OrderStatus.PENDING
        order.executor_id = None
        await db.commit()


async def accept_offer(order_id, executor_id, db: AsyncSession) -> bool:
    redis = get_redis()
    cur = await redis.get(_okey(order_id))
    if cur != str(executor_id):
        return False
    await redis.delete(_qkey(order_id), _okey(order_id), _dkey(order_id))
    order = await db.get(Order, order_id)
    if order is None:
        return False
    order.status = OrderStatus.ACCEPTED
    order.executor_id = executor_id
    order.accepted_at = datetime.now(tz=timezone.utc)
    await db.commit()
    return True


async def decline_offer(order_id, executor_id, db: AsyncSession) -> Candidate | None:
    redis = get_redis()
    cur = await redis.get(_okey(order_id))
    if cur != str(executor_id):
        return None
    profile = await db.scalar(
        select(ExecutorProfile).where(ExecutorProfile.user_id == executor_id)
    )
    if profile:
        profile.decline_count += 1
        await db.commit()
    await redis.delete(_okey(order_id), _dkey(order_id))
    return await _offer_next(order_id, db)


async def cancel_match(order_id) -> None:
    redis = get_redis()
    await redis.delete(_qkey(order_id), _okey(order_id), _dkey(order_id))


async def expired_offers() -> Iterable[tuple[str, str]]:
    """Возвращает [(order_id, executor_id)] просроченных предложений.
    Используется фоновым воркером каждые ~5с."""
    redis = get_redis()
    keys = await redis.keys("match:*:offer_until")
    now = int(time.time())
    out: list[tuple[str, str]] = []
    for k in keys:
        ts_raw = await redis.get(k)
        if ts_raw is None:
            continue
        ts = int(ts_raw)
        if ts <= now:
            order_id = k.split(":")[1]
            ex = await redis.get(f"match:{order_id}:offer")
            if ex:
                out.append((order_id, ex))
    return out


async def force_assign(order_id, executor_id, db: AsyncSession) -> bool:
    """USER явно выбрал мастера — принудительно ставим оффер ему."""
    redis = get_redis()
    deadline = int(time.time()) + settings.executor_accept_timeout_sec
    await redis.set(_okey(order_id), str(executor_id), ex=settings.executor_accept_timeout_sec + 5)
    await redis.set(_dkey(order_id), deadline)
    order = await db.get(Order, order_id)
    if order is None:
        return False
    order.status = OrderStatus.MATCHED
    order.executor_id = executor_id
    order.matched_at = datetime.now(tz=timezone.utc)
    await db.commit()
    return True
