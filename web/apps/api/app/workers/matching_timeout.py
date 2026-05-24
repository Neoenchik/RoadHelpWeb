"""Фоновый воркер: каждые 5с обходит просроченные офферы."""
from __future__ import annotations

import asyncio
import logging

from app.database import SessionLocal
from app.services.matching import decline_offer, expired_offers

logger = logging.getLogger(__name__)


async def tick() -> None:
    expired = await expired_offers()
    if not expired:
        return
    async with SessionLocal() as db:
        for order_id, executor_id in expired:
            logger.info("offer expired: order=%s executor=%s", order_id, executor_id)
            await decline_offer(order_id, executor_id, db)


async def run_loop(interval_sec: float = 5.0) -> None:
    while True:
        try:
            await tick()
        except Exception:
            logger.exception("matching tick failed")
        await asyncio.sleep(interval_sec)
