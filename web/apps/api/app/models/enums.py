"""Перечисления, синхронизированы с packages/shared/src/index.ts."""
from __future__ import annotations

import enum


class Role(str, enum.Enum):
    USER = "USER"
    EXECUTOR = "EXECUTOR"
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"


class ServiceType(str, enum.Enum):
    tow = "tow"
    tire = "tire"
    fuel = "fuel"
    lockout = "lockout"
    battery = "battery"


class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    MATCHED = "MATCHED"
    ACCEPTED = "ACCEPTED"
    EN_ROUTE = "EN_ROUTE"
    ARRIVED = "ARRIVED"
    IN_PROGRESS = "IN_PROGRESS"
    AWAITING_CONFIRMATION = "AWAITING_CONFIRMATION"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    DISPUTED = "DISPUTED"


class ExecutorOnlineStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"


class ExecutorVerificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    SUSPENDED = "SUSPENDED"
    DISABLED = "DISABLED"


class PaymentMethodType(str, enum.Enum):
    card = "card"
    wallet = "wallet"


class StatusChangeTargetType(str, enum.Enum):
    executor = "executor"
    order = "order"


class InviteRole(str, enum.Enum):
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"
