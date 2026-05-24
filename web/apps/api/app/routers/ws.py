"""WebSocket endpoints — tracking, incoming, operator dashboard.

Все три канала аутентифицируются через access-token в query string:
  ws://host/ws/orders/{id}/tracking?token=...
"""
from __future__ import annotations

import asyncio
import logging
import time
import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select

from app.database import SessionLocal
from app.middleware.auth import get_current_user_ws
from app.models import (
    ExecutorProfile,
    Order,
    OrderStatus,
    Role,
)
from app.services.matching import _okey
from app.services.redis_client import get_redis

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["ws"])


def _serialize_dt(d: datetime | None) -> str | None:
    return d.isoformat() if d else None


@router.websocket("/orders/{order_id}/tracking")
async def ws_order_tracking(
    websocket: WebSocket,
    order_id: uuid.UUID,
    token: str = Query(...),
) -> None:
    async with SessionLocal() as db:
        try:
            user = await get_current_user_ws(token, db)
        except Exception as e:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=str(e))
            return

        order = await db.get(Order, order_id)
        if order is None or order.user_id != user.id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await websocket.accept()
    last_status: str | None = None
    try:
        while True:
            async with SessionLocal() as db:
                order = await db.get(Order, order_id)
                if order is None:
                    break
                executor_loc = None
                if order.executor_id:
                    ep = await db.scalar(
                        select(ExecutorProfile).where(ExecutorProfile.user_id == order.executor_id)
                    )
                    if ep and ep.lat is not None and ep.lng is not None:
                        executor_loc = {"lat": ep.lat, "lng": ep.lng}

            payload = {
                "status": order.status.value,
                "executor": executor_loc and {
                    "lat": executor_loc["lat"],
                    "lng": executor_loc["lng"],
                    "eta_seconds": _eta_seconds(order, executor_loc),
                },
                "ts": int(time.time()),
            }
            await websocket.send_json(payload)
            if order.status in (OrderStatus.COMPLETED, OrderStatus.CANCELLED):
                break
            await asyncio.sleep(10)
            # status-changed события уже отдаём раз в 10с — для MVP достаточно
    except WebSocketDisconnect:
        return


@router.websocket("/executor/incoming")
async def ws_executor_incoming(websocket: WebSocket, token: str = Query(...)) -> None:
    async with SessionLocal() as db:
        try:
            user = await get_current_user_ws(token, db)
        except Exception as e:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=str(e))
            return
        if user.role != Role.EXECUTOR:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await websocket.accept()
    redis = get_redis()
    try:
        last_offer: str | None = None
        while True:
            keys = await redis.keys("match:*:offer")
            current_offer: tuple[str, str] | None = None
            for k in keys:
                ex = await redis.get(k)
                if ex == str(user.id):
                    order_id = k.split(":")[1]
                    current_offer = (order_id, ex)
                    break

            if current_offer and current_offer[0] != last_offer:
                order_id = current_offer[0]
                async with SessionLocal() as db:
                    order = await db.get(Order, uuid.UUID(order_id))
                if order is not None:
                    deadline_ts = await redis.get(f"match:{order_id}:offer_until")
                    deadline_iso = (
                        datetime.utcfromtimestamp(int(deadline_ts)).isoformat() + "Z"
                        if deadline_ts else None
                    )
                    await websocket.send_json({
                        "type": "incoming",
                        "order": {
                            "id": str(order.id),
                            "service_type": order.service_type.value,
                            "address": order.address,
                            "lat": order.lat,
                            "lng": order.lng,
                            "estimated_price": str(order.estimated_price) if order.estimated_price else None,
                            "description": order.description,
                        },
                        "deadline_at": deadline_iso,
                    })
                    last_offer = order_id
            elif not current_offer and last_offer is not None:
                await websocket.send_json({"type": "cleared"})
                last_offer = None

            await asyncio.sleep(2)
    except WebSocketDisconnect:
        return


@router.websocket("/operator/dashboard")
async def ws_operator_dashboard(websocket: WebSocket, token: str = Query(...)) -> None:
    async with SessionLocal() as db:
        try:
            user = await get_current_user_ws(token, db)
        except Exception as e:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=str(e))
            return
        if user.role != Role.OPERATOR:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await websocket.accept()
    try:
        while True:
            async with SessionLocal() as db:
                from app.services.metrics import compute_metrics
                metrics = await compute_metrics(db)
            await websocket.send_json(metrics)
            await asyncio.sleep(60)
    except WebSocketDisconnect:
        return


def _eta_seconds(order: Order, exec_loc: dict | None) -> int | None:
    if not exec_loc:
        return None
    from app.services.geo import haversine_km
    d = haversine_km(order.lat, order.lng, exec_loc["lat"], exec_loc["lng"])
    # 30 км/ч в городе
    return int(max(60, d / 30 * 3600))
