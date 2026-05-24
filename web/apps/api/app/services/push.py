"""Web Push отправка через pywebpush."""
from __future__ import annotations

import json
import logging
from typing import Any

from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import PushSubscription

logger = logging.getLogger(__name__)


async def send_to_user(db: AsyncSession, user_id, payload: dict[str, Any]) -> None:
    if not settings.vapid_private_key:
        logger.info("VAPID не настроен — push пропущен (user=%s)", user_id)
        return
    subs = list(
        (await db.scalars(
            select(PushSubscription).where(PushSubscription.user_id == user_id)
        )).all()
    )
    body = json.dumps(payload)
    for s in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": s.endpoint,
                    "keys": {"p256dh": s.p256dh, "auth": s.auth},
                },
                data=body,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": settings.vapid_subject},
            )
        except WebPushException as e:
            logger.warning("push failed: %s", e)
            # Подписка с 410/404 — удалим
            if e.response and e.response.status_code in (404, 410):
                await db.delete(s)
    await db.commit()
