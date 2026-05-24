"""Сводные метрики для дашборда оператора."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Order, OrderStatus

ACTIVE_STATUSES = (
    OrderStatus.PENDING,
    OrderStatus.MATCHED,
    OrderStatus.ACCEPTED,
    OrderStatus.EN_ROUTE,
    OrderStatus.ARRIVED,
    OrderStatus.IN_PROGRESS,
    OrderStatus.AWAITING_CONFIRMATION,
)


async def compute_metrics(db: AsyncSession) -> dict[str, Any]:
    now = datetime.now(tz=timezone.utc)
    last_24h = now - timedelta(hours=24)

    active = await db.scalar(
        select(func.count()).select_from(Order).where(Order.status.in_(ACTIVE_STATUSES))
    ) or 0

    completed_24h = await db.scalar(
        select(func.count()).select_from(Order).where(
            Order.status == OrderStatus.COMPLETED,
            Order.completed_at >= last_24h,
        )
    ) or 0

    cancelled_24h = await db.scalar(
        select(func.count()).select_from(Order).where(
            Order.status == OrderStatus.CANCELLED,
            Order.created_at >= last_24h,
        )
    ) or 0

    total_24h = completed_24h + cancelled_24h
    cancel_rate = (cancelled_24h / total_24h) if total_24h > 0 else 0.0

    disputes_open = await db.scalar(
        select(func.count()).select_from(Order).where(Order.status == OrderStatus.DISPUTED)
    ) or 0

    # Усреднённый ETA (грубо: matched_at → accepted_at)
    avg_eta_sec = await db.scalar(
        select(func.avg(func.extract("epoch", Order.accepted_at) - func.extract("epoch", Order.matched_at)))
        .where(
            Order.matched_at.isnot(None),
            Order.accepted_at.isnot(None),
            Order.created_at >= last_24h,
        )
    )
    avg_eta_min = round(float(avg_eta_sec or 0) / 60, 1)

    # Точки графика заказов за 24 часа по часам
    rows = (
        await db.execute(
            select(
                func.date_trunc("hour", Order.created_at).label("hour"),
                func.count().label("count"),
            )
            .where(Order.created_at >= last_24h)
            .group_by("hour")
            .order_by("hour")
        )
    ).all()
    points = [
        {"hour": r.hour.isoformat() if r.hour else None, "count": int(r.count)}
        for r in rows
    ]

    alerts: list[dict[str, str]] = []
    if cancel_rate > settings.cancel_rate_threshold:
        alerts.append({
            "kind": "cancel_rate_high",
            "message": f"Cancel rate за 24ч: {cancel_rate:.0%} (порог {settings.cancel_rate_threshold:.0%})",
        })

    return {
        "active_orders": int(active),
        "completed_24h": int(completed_24h),
        "cancelled_24h": int(cancelled_24h),
        "cancel_rate": round(cancel_rate, 4),
        "avg_eta_min": avg_eta_min,
        "disputes_open": int(disputes_open),
        "points": points,
        "alerts": alerts,
        "ts": int(now.timestamp()),
    }
