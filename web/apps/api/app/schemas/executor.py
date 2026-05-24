"""Схемы профиля и заработка исполнителя."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from app.models.enums import (
    ExecutorOnlineStatus,
    ExecutorVerificationStatus,
    ServiceType,
)


class ExecutorProfileResponse(BaseModel):
    online_status: ExecutorOnlineStatus
    verification_status: ExecutorVerificationStatus
    service_types: list[ServiceType] = Field(default_factory=list)
    vehicle_make: str | None = None
    vehicle_plate: str | None = None
    documents_url: list[str] = Field(default_factory=list)
    rating: float
    completed_count: int
    decline_count: int
    lat: float | None = None
    lng: float | None = None

    model_config = {"from_attributes": True}


class StatusUpdate(BaseModel):
    status: ExecutorOnlineStatus


class LocationUpdate(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class ProfileUpdate(BaseModel):
    service_types: list[ServiceType] | None = None
    vehicle_make: str | None = Field(None, max_length=80)
    vehicle_plate: str | None = Field(None, max_length=20)


class EarningsResponse(BaseModel):
    range: Literal["day", "week", "month"]
    total: Decimal
    completed_orders: int
    points: list["EarningsPoint"]


class EarningsPoint(BaseModel):
    date: datetime
    amount: Decimal
    orders: int


EarningsResponse.model_rebuild()
