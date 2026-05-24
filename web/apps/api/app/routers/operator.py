"""OPERATOR API."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_role
from app.models import Order, OrderStatus, Role, User
from app.schemas.admin import DisputeResolutionRequest
from app.services.metrics import compute_metrics

router = APIRouter(prefix="/api/operator", tags=["operator"])


@router.get("/metrics")
async def metrics(
    db: AsyncSession = Depends(get_db),
    _op: User = Depends(require_role(Role.OPERATOR, Role.ADMIN)),
) -> dict[str, Any]:
    return await compute_metrics(db)


@router.get("/active-orders")
async def active_orders(
    db: AsyncSession = Depends(get_db),
    _op: User = Depends(require_role(Role.OPERATOR, Role.ADMIN)),
) -> list[dict[str, Any]]:
    active = (
        OrderStatus.MATCHED, OrderStatus.ACCEPTED, OrderStatus.EN_ROUTE,
        OrderStatus.ARRIVED, OrderStatus.IN_PROGRESS, OrderStatus.AWAITING_CONFIRMATION,
    )
    orders = list(
        (await db.scalars(
            select(Order).where(Order.status.in_(active)).order_by(Order.created_at.desc()).limit(500)
        )).all()
    )
    return [
        {
            "id": str(o.id),
            "service_type": o.service_type.value,
            "status": o.status.value,
            "lat": o.lat,
            "lng": o.lng,
            "address": o.address,
            "created_at": o.created_at.isoformat(),
        }
        for o in orders
    ]


@router.get("/disputes")
async def disputes(
    db: AsyncSession = Depends(get_db),
    _op: User = Depends(require_role(Role.OPERATOR, Role.ADMIN)),
) -> list[dict[str, Any]]:
    rows = list(
        (await db.scalars(
            select(Order)
            .where(Order.status == OrderStatus.DISPUTED)
            .order_by(Order.created_at.desc())
            .limit(100)
        )).all()
    )
    return [
        {
            "id": str(o.id),
            "user_id": str(o.user_id),
            "executor_id": str(o.executor_id) if o.executor_id else None,
            "service_type": o.service_type.value,
            "address": o.address,
            "cancel_reason": o.cancel_reason,
            "created_at": o.created_at.isoformat(),
            "estimated_price": str(o.estimated_price) if o.estimated_price else None,
            "final_price": str(o.final_price) if o.final_price else None,
        }
        for o in rows
    ]


@router.patch("/disputes/{order_id}")
async def resolve_dispute(
    order_id: uuid.UUID,
    body: DisputeResolutionRequest,
    db: AsyncSession = Depends(get_db),
    _op: User = Depends(require_role(Role.OPERATOR, Role.ADMIN)),
) -> dict[str, str]:
    order = await db.get(Order, order_id)
    if order is None or order.status != OrderStatus.DISPUTED:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Спор не найден")
    if body.resolution == "refund":
        order.status = OrderStatus.CANCELLED
        order.cancel_reason = (order.cancel_reason or "") + f"\n[оператор: refund {body.refund_amount}]"
    else:
        order.status = OrderStatus.COMPLETED
        order.completed_at = datetime.now(tz=timezone.utc)
        order.cancel_reason = (order.cancel_reason or "") + "\n[оператор: rejected]"
    await db.commit()
    return {"status": "ok"}
