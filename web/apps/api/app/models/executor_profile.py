from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ExecutorOnlineStatus, ExecutorVerificationStatus

if TYPE_CHECKING:
    from app.models.user import User


class ExecutorProfile(Base):
    __tablename__ = "executor_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    online_status: Mapped[ExecutorOnlineStatus] = mapped_column(
        Enum(ExecutorOnlineStatus, name="executor_online_status", native_enum=True),
        nullable=False,
        default=ExecutorOnlineStatus.OFFLINE,
    )
    verification_status: Mapped[ExecutorVerificationStatus] = mapped_column(
        Enum(ExecutorVerificationStatus, name="executor_verification_status", native_enum=True),
        nullable=False,
        default=ExecutorVerificationStatus.PENDING,
    )

    service_types: Mapped[list[str]] = mapped_column(
        ARRAY(String(20)), nullable=False, default=list
    )
    vehicle_make: Mapped[str | None] = mapped_column(String(80), nullable=True)
    vehicle_plate: Mapped[str | None] = mapped_column(String(20), nullable=True)
    documents_url: Mapped[list[str]] = mapped_column(
        ARRAY(String(512)), nullable=False, default=list
    )

    rating: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    completed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    decline_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_updated_at: Mapped[datetime | None] = mapped_column(nullable=True)

    user: Mapped["User"] = relationship(back_populates="executor_profile")
