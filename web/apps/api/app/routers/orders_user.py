"""Orders API — USER-часть (создание, отмена, подтверждение, отзыв, история)."""
from __future__ import annotations

import base64
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth import require_role
from app.models import (
    ExecutorProfile,
    Order,
    OrderStatus,
    Review,
    Role,
    User,
)
from app.schemas.orders import (
    CursorPage,
    ExecutorMini,
    OrderCancelRequest,
    OrderCreateRequest,
    OrderDisputeRequest,
    OrderResponse,
    OrderReviewRequest,
    OrderUpdateRequest,
)
from app.services.geo import haversine_km
from app.services.matching import cancel_match, enqueue_order, force_assign
from app.services.pricing import estimate_price

router = APIRouter(prefix="/api/orders", tags=["orders-user"])

# Активным считаем заказ, который ещё не финализирован
ACTIVE_STATUSES = (
    OrderStatus.PENDING,
    OrderStatus.MATCHED,
    OrderStatus.ACCEPTED,
    OrderStatus.EN_ROUTE,
    OrderStatus.ARRIVED,
    OrderStatus.IN_PROGRESS,
    OrderStatus.AWAITING_CONFIRMATION,
    OrderStatus.DISPUTED,
)

# Статусы, в которых USER ещё может выбрать другого исполнителя
SELECTABLE_STATUSES = (OrderStatus.PENDING, OrderStatus.MATCHED)


def _attach_executor(order: Order, executor: User | None) -> dict[str, Any]:
    base = OrderResponse.model_validate(order).model_dump()
    if executor and executor.executor_profile:
        ep = executor.executor_profile
        base["executor"] = ExecutorMini(
            id=executor.id,
            first_name=executor.first_name,
            last_name=executor.last_name,
            avatar_url=executor.avatar_url,
            rating=ep.rating,
            completed_count=ep.completed_count,
            vehicle_make=ep.vehicle_make,
            vehicle_plate=ep.vehicle_plate,
            lat=ep.lat,
            lng=ep.lng,
        ).model_dump()
    return base


@router.post("", response_model=OrderResponse)
async def create_order(
    body: OrderCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(Role.USER)),
) -> OrderResponse:
    # Проверяем — нет ли уже активного заказа
    existing = await db.scalar(
        select(Order).where(
            Order.user_id == user.id,
            Order.status.in_(ACTIVE_STATUSES),
        )
    )
    if existing is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "У вас уже есть активный заказ",
        )

    order = Order(
        user_id=user.id,
        service_type=body.service_type,
        status=OrderStatus.PENDING,
        lat=body.lat,
        lng=body.lng,
        address=body.address,
        description=body.description,
        estimated_price=estimate_price(body.service_type),
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    # Кидаем в matching engine — он построит очередь и предложит первому.
    await enqueue_order(order, db)
    await db.refresh(order)
    return OrderResponse.model_validate(order)


@router.get("/active", response_model=OrderResponse | None)
async def active_order(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(Role.USER)),
) -> OrderResponse | None:
    order = await db.scalar(
        select(Order)
        .where(Order.user_id == user.id, Order.status.in_(ACTIVE_STATUSES))
        .order_by(desc(Order.created_at))
        .limit(1)
    )
    if order is None:
        return None
    executor = None
    if order.executor_id:
        executor = await db.scalar(
            select(User)
            .where(User.id == order.executor_id)
            .options(selectinload(User.executor_profile))
        )
    return _attach_executor(order, executor)  # type: ignore[return-value]


@router.get("/history", response_model=CursorPage)
async def history(
    cursor: str | None = Query(None),
    limit: int = Query(20, le=50, ge=1),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(Role.USER)),
) -> CursorPage:
    q = (
        select(Order)
        .where(
            Order.user_id == user.id,
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


async def _get_user_order(order_id: uuid.UUID, user: User, db: AsyncSession) -> Order:
    order = await db.get(Order, order_id)
    if order is None or order.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Заказ не найден")
    return order


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(Role.USER)),
) -> Any:
    order = await _get_user_order(order_id, user, db)
    executor = None
    if order.executor_id:
        executor = await db.scalar(
            select(User)
            .where(User.id == order.executor_id)
            .options(selectinload(User.executor_profile))
        )
    return _attach_executor(order, executor)


@router.get("/{order_id}/executors", response_model=list[ExecutorMini])
async def order_executors(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(Role.USER)),
) -> list[ExecutorMini]:
    order = await _get_user_order(order_id, user, db)
    if order.status not in SELECTABLE_STATUSES:
        return []

    # Базовая выборка кандидатов: онлайн, верифицированные, поддерживают услугу.
    # На шаге 9 этот же запрос будет вызываться matching engine.
    q = (
        select(ExecutorProfile, User)
        .join(User, User.id == ExecutorProfile.user_id)
        .where(
            ExecutorProfile.online_status == "ONLINE",
            ExecutorProfile.verification_status == "VERIFIED",
            ExecutorProfile.service_types.any(order.service_type.value),
            ExecutorProfile.lat.isnot(None),
            ExecutorProfile.lng.isnot(None),
        )
    )
    rows = (await db.execute(q)).all()
    result: list[ExecutorMini] = []
    for ep, u in rows:
        dist = haversine_km(order.lat, order.lng, ep.lat, ep.lng)
        if dist > 50:  # MATCHING_RADIUS_KM по умолчанию
            continue
        eta = max(2, int(dist / 0.5))  # очень грубо: 30 км/ч в городе
        price = estimate_price(order.service_type, dist)
        result.append(ExecutorMini(
            id=u.id,
            first_name=u.first_name,
            last_name=u.last_name,
            avatar_url=u.avatar_url,
            rating=ep.rating,
            completed_count=ep.completed_count,
            vehicle_make=ep.vehicle_make,
            vehicle_plate=ep.vehicle_plate,
            lat=ep.lat,
            lng=ep.lng,
            distance_km=round(dist, 2),
            eta_min=eta,
            estimated_price=price,
        ))
    # Ранжируем: ближе → выше рейтинг → больше выполненных
    result.sort(key=lambda e: (e.distance_km or 999, -(e.rating or 0), -(e.completed_count or 0)))
    return result[:10]


@router.patch("/{order_id}", response_model=OrderResponse)
async def assign_executor(
    order_id: uuid.UUID,
    body: OrderUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(Role.USER)),
) -> OrderResponse:
    order = await _get_user_order(order_id, user, db)
    if order.status not in SELECTABLE_STATUSES:
        raise HTTPException(status.HTTP_409_CONFLICT, "Нельзя сменить исполнителя на этом этапе")

    # USER явно выбрал мастера — переадресуем оффер ему через matching engine.
    await force_assign(order.id, body.executor_id, db)
    await db.refresh(order)
    return OrderResponse.model_validate(order)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: uuid.UUID,
    body: OrderCancelRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(Role.USER)),
) -> OrderResponse:
    order = await _get_user_order(order_id, user, db)
    # Можно отменить только до того, как исполнитель принял
    if order.status not in (OrderStatus.PENDING, OrderStatus.MATCHED):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Заказ уже принят исполнителем — отменяйте через спор",
        )
    order.status = OrderStatus.CANCELLED
    order.cancel_reason = body.reason
    await db.commit()
    await cancel_match(order.id)
    await db.refresh(order)
    return OrderResponse.model_validate(order)


@router.post("/{order_id}/confirm", response_model=OrderResponse)
async def confirm_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(Role.USER)),
) -> OrderResponse:
    order = await _get_user_order(order_id, user, db)
    if order.status != OrderStatus.AWAITING_CONFIRMATION:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Подтверждение возможно только после выполнения работы",
        )
    order.status = OrderStatus.COMPLETED
    order.completed_at = datetime.now(tz=timezone.utc)
    await db.commit()
    await db.refresh(order)
    return OrderResponse.model_validate(order)


@router.post("/{order_id}/dispute", response_model=OrderResponse)
async def open_dispute(
    order_id: uuid.UUID,
    body: OrderDisputeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(Role.USER)),
) -> OrderResponse:
    order = await _get_user_order(order_id, user, db)
    if order.status != OrderStatus.AWAITING_CONFIRMATION:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Спор открывается на этапе подтверждения",
        )
    order.status = OrderStatus.DISPUTED
    order.cancel_reason = body.reason
    await db.commit()
    await db.refresh(order)
    return OrderResponse.model_validate(order)


@router.post("/{order_id}/review", status_code=status.HTTP_201_CREATED)
async def leave_review(
    order_id: uuid.UUID,
    body: OrderReviewRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(Role.USER)),
) -> dict[str, str]:
    order = await _get_user_order(order_id, user, db)
    if order.status != OrderStatus.COMPLETED or order.executor_id is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Отзыв возможен только после завершённого заказа",
        )
    existing = await db.scalar(
        select(Review).where(Review.order_id == order.id, Review.from_user_id == user.id)
    )
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Вы уже оставили отзыв")

    review = Review(
        order_id=order.id,
        from_user_id=user.id,
        to_user_id=order.executor_id,
        score=body.score,
        comment=body.comment,
    )
    db.add(review)

    # Обновляем средний рейтинг исполнителя
    profile = await db.scalar(
        select(ExecutorProfile).where(ExecutorProfile.user_id == order.executor_id)
    )
    if profile:
        avg = await db.scalar(
            select(__import__("sqlalchemy").func.avg(Review.score))
            .where(Review.to_user_id == order.executor_id)
        )
        # avg сюда не приходит для нового review — учтём вручную:
        all_scores = (
            await db.scalars(select(Review.score).where(Review.to_user_id == order.executor_id))
        ).all()
        all_scores = list(all_scores) + [body.score]
        profile.rating = round(sum(all_scores) / len(all_scores), 2)

    await db.commit()
    return {"status": "ok"}
