"""Orders API — EXECUTOR-часть."""
from __future__ import annotations

import base64
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth import require_role
from app.models import (
    Order,
    OrderStatus,
    Role,
    User,
)
from app.schemas.orders import CursorPage, OrderResponse
from app.services.geo import haversine_m
from app.services.matching import accept_offer as match_accept
from app.services.matching import decline_offer as match_decline
from app.services.redis_client import get_redis

router = APIRouter(prefix="/api/executor/orders", tags=["orders-executor"])


@router.get("/incoming", response_model=OrderResponse | None)
async def incoming(
    db: AsyncSession = Depends(get_db),
    me: User = Depends(require_role(Role.EXECUTOR)),
) -> Any:
    """Возвращает заказ, на который мне отправлен оффер сейчас (если есть).

    Используется как fallback к WS — клиент может polling'ом дёрнуть.
    """
    redis = get_redis()
    keys = await redis.keys("match:*:offer")
    for k in keys:
        ex = await redis.get(k)
        if ex == str(me.id):
            order_id = k.split(":")[1]
            order = await db.get(Order, uuid.UUID(order_id))
            if order:
                return OrderResponse.model_validate(order)
    return None


@router.post("/{order_id}/accept", response_model=OrderResponse)
async def accept(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(require_role(Role.EXECUTOR)),
) -> OrderResponse:
    ok = await match_accept(order_id, me.id, db)
    if not ok:
        raise HTTPException(status.HTTP_409_CONFLICT, "Оффер уже не активен или передан другому")
    order = await db.get(Order, order_id)
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    return OrderResponse.model_validate(order)


@router.post("/{order_id}/decline")
async def decline(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(require_role(Role.EXECUTOR)),
) -> dict[str, str]:
    await match_decline(order_id, me.id, db)
    return {"status": "ok"}


async def _get_my_order(order_id: uuid.UUID, me: User, db: AsyncSession) -> Order:
    order = await db.get(Order, order_id)
    if order is None or order.executor_id != me.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Заказ не найден")
    return order


@router.post("/{order_id}/arrive", response_model=OrderResponse)
async def arrive(
    order_id: uuid.UUID,
    body: dict,  # {"lat": float, "lng": float}
    db: AsyncSession = Depends(get_db),
    me: User = Depends(require_role(Role.EXECUTOR)),
) -> OrderResponse:
    """Геопроверка ≤ ARRIVAL_RADIUS_M. Серверная — клиенту нельзя верить."""
    order = await _get_my_order(order_id, me, db)
    if order.status not in (OrderStatus.ACCEPTED, OrderStatus.EN_ROUTE):
        raise HTTPException(status.HTTP_409_CONFLICT, "Невалидный статус для 'Я прибыл'")

    try:
        lat = float(body["lat"])
        lng = float(body["lng"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "lat/lng обязательны") from None

    distance = haversine_m(order.lat, order.lng, lat, lng)
    if distance > settings.arrival_radius_m:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Вы ещё не на месте — {int(distance)} м от точки заказа",
        )

    order.status = OrderStatus.ARRIVED
    order.arrived_at = datetime.now(tz=timezone.utc)
    await db.commit()
    await db.refresh(order)
    return OrderResponse.model_validate(order)


@router.post("/{order_id}/complete", response_model=OrderResponse)
async def complete(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(require_role(Role.EXECUTOR)),
) -> OrderResponse:
    order = await _get_my_order(order_id, me, db)
    if order.status not in (OrderStatus.ARRIVED, OrderStatus.IN_PROGRESS):
        raise HTTPException(status.HTTP_409_CONFLICT, "Невалидный статус для завершения")
    order.status = OrderStatus.AWAITING_CONFIRMATION
    if order.final_price is None:
        order.final_price = order.estimated_price
    await db.commit()
    await db.refresh(order)
    return OrderResponse.model_validate(order)


@router.get("/history", response_model=CursorPage)
async def history(
    cursor: str | None = Query(None),
    limit: int = Query(20, le=50, ge=1),
    db: AsyncSession = Depends(get_db),
    me: User = Depends(require_role(Role.EXECUTOR)),
) -> CursorPage:
    q = (
        select(Order)
        .where(
            Order.executor_id == me.id,
            Order.status.in_((OrderStatus.COMPLETED, OrderStatus.CANCELLED)),
        )
        .order_by(desc(Order.created_at))
        .limit(limit + 1)
    )
    if cursor:
        try:
            decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
            cursor_dt = datetime.fromisoformat(decoded)
        except Exception:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid cursor") from None
        q = q.where(Order.created_at < cursor_dt)

    rows = list((await db.scalars(q)).all())
    has_more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = (
        base64.urlsafe_b64encode(rows[-1].created_at.isoformat().encode()).decode()
        if has_more and rows
        else None
    )
    return CursorPage(
        items=[OrderResponse.model_validate(r) for r in rows],
        next_cursor=next_cursor,
    )
