"""Pydantic-схемы для orders API."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.enums import OrderStatus, ServiceType


class OrderCreateRequest(BaseModel):
    service_type: ServiceType
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    address: str = Field(..., min_length=2, max_length=512)
    description: str | None = Field(None, max_length=2000)
    payment_method_id: uuid.UUID | None = None


class ExecutorMini(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str | None = None
    avatar_url: str | None = None
    rating: float = 0.0
    completed_count: int = 0
    vehicle_make: str | None = None
    vehicle_plate: str | None = None
    lat: float | None = None
    lng: float | None = None
    distance_km: float | None = None
    eta_min: int | None = None
    estimated_price: int | None = None

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    executor_id: uuid.UUID | None = None
    service_type: ServiceType
    status: OrderStatus
    lat: float
    lng: float
    address: str
    description: str | None = None
    estimated_price: Decimal | None = None
    final_price: Decimal | None = None
    cancel_reason: str | None = None
    created_at: datetime
    matched_at: datetime | None = None
    accepted_at: datetime | None = None
    arrived_at: datetime | None = None
    completed_at: datetime | None = None
    executor: ExecutorMini | None = None

    model_config = {"from_attributes": True}


class OrderUpdateRequest(BaseModel):
    executor_id: uuid.UUID


class OrderCancelRequest(BaseModel):
    reason: str | None = Field(None, max_length=255)


class OrderDisputeRequest(BaseModel):
    reason: str = Field(..., min_length=2, max_length=2000)


class OrderReviewRequest(BaseModel):
    score: int = Field(..., ge=1, le=5)
    comment: str | None = Field(None, max_length=2000)


class CursorPage(BaseModel):
    items: list[OrderResponse]
    next_cursor: str | None = None
