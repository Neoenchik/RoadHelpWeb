"""Схемы для admin/operator API."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import (
    ExecutorOnlineStatus,
    ExecutorVerificationStatus,
    InviteRole,
    Role,
)


class AdminExecutorListItem(BaseModel):
    user_id: uuid.UUID
    first_name: str
    last_name: str | None = None
    phone: str | None = None
    online_status: ExecutorOnlineStatus
    verification_status: ExecutorVerificationStatus
    rating: float
    completed_count: int


class AdminUserListItem(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str | None = None
    phone: str | None = None
    email: str | None = None
    role: Role
    created_at: datetime


class CursorPage[T](BaseModel):
    items: list[T]
    next_cursor: str | None = None


class UpdateExecutorStatus(BaseModel):
    verification_status: ExecutorVerificationStatus
    reason: str | None = Field(None, max_length=500)


class UpdateUserRole(BaseModel):
    role: Role


class CreateInviteRequest(BaseModel):
    email: EmailStr
    role: InviteRole


class InviteResponse(BaseModel):
    id: uuid.UUID
    email: str
    role: InviteRole
    token: str
    expires_at: datetime
    used_at: datetime | None = None
    invite_url: str
    created_at: datetime


class DisputeResolutionRequest(BaseModel):
    resolution: Literal["refund", "reject"]
    refund_amount: float | None = None
