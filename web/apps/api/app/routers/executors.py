"""Профиль исполнителя — статус online/offline, локация, услуги."""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_role
from app.models import (
    ExecutorProfile,
    Order,
    OrderStatus,
    Role,
    User,
)
from app.schemas.executor import (
    EarningsPoint,
    EarningsResponse,
    ExecutorProfileResponse,
    LocationUpdate,
    ProfileUpdate,
    StatusUpdate,
)

router = APIRouter(prefix="/api/executor/me", tags=["executor-profile"])


async def _profile(db: AsyncSession, me: User) -> ExecutorProfile:
    profile = await db.scalar(
        select(ExecutorProfile).where(ExecutorProfile.user_id == me.id)
    )
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Профиль исполнителя не найден")
    return profile


@router.get("", response_model=ExecutorProfileResponse)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    me: User = Depends(require_role(Role.EXECUTOR)),
) -> ExecutorProfileResponse:
    profile = await _profile(db, me)
    return ExecutorProfileResponse.model_validate(profile)


@router.patch("/status", response_model=ExecutorProfileResponse)
async def set_status(
    body: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(require_role(Role.EXECUTOR)),
) -> ExecutorProfileResponse:
    profile = await _profile(db, me)
    profile.online_status = body.status
    await db.commit()
    await db.refresh(profile)
    return ExecutorProfileResponse.model_validate(profile)


@router.patch("/location", response_model=ExecutorProfileResponse)
async def set_location(
    body: LocationUpdate,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(require_role(Role.EXECUTOR)),
) -> ExecutorProfileResponse:
    profile = await _profile(db, me)
    profile.lat = body.lat
    profile.lng = body.lng
    profile.location_updated_at = datetime.now(tz=timezone.utc)
    await db.commit()
    await db.refresh(profile)
    return ExecutorProfileResponse.model_validate(profile)


@router.patch("", response_model=ExecutorProfileResponse)
async def update_profile(
    body: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(require_role(Role.EXECUTOR)),
) -> ExecutorProfileResponse:
    profile = await _profile(db, me)
    if body.service_types is not None:
        profile.service_types = [s.value for s in body.service_types]
    if body.vehicle_make is not None:
        profile.vehicle_make = body.vehicle_make
    if body.vehicle_plate is not None:
        profile.vehicle_plate = body.vehicle_plate
    await db.commit()
    await db.refresh(profile)
    return ExecutorProfileResponse.model_validate(profile)


# Заработок исполнителя
earnings_router = APIRouter(prefix="/api/executor", tags=["executor-earnings"])


@earnings_router.get("/earnings", response_model=EarningsResponse)
async def earnings(
    range: str = Query("week", pattern="^(day|week|month)$"),
    db: AsyncSession = Depends(get_db),
    me: User = Depends(require_role(Role.EXECUTOR)),
) -> EarningsResponse:
    days = {"day": 1, "week": 7, "month": 30}[range]
    from datetime import timedelta
    since = datetime.now(tz=timezone.utc) - timedelta(days=days)

    rows = list(
        (
            await db.scalars(
                select(Order).where(
                    Order.executor_id == me.id,
                    Order.status == OrderStatus.COMPLETED,
                    Order.completed_at.isnot(None),
                    Order.completed_at >= since,
                )
            )
        ).all()
    )

    bucket: dict[str, tuple[Decimal, int]] = {}
    for o in rows:
        if o.completed_at is None:
            continue
        key = o.completed_at.date().isoformat()
        amt, cnt = bucket.get(key, (Decimal("0"), 0))
        bucket[key] = (amt + (o.final_price or Decimal("0")), cnt + 1)

    points = [
        EarningsPoint(
            date=datetime.fromisoformat(d).replace(tzinfo=timezone.utc),
            amount=amt,
            orders=cnt,
        )
        for d, (amt, cnt) in sorted(bucket.items())
    ]
    total = sum((p.amount for p in points), Decimal("0"))
    return EarningsResponse(
        range=range,  # type: ignore[arg-type]
        total=total,
        completed_orders=len(rows),
        points=points,
    )
