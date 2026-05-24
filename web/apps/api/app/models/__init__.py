"""Импорт всех моделей — нужен Alembic для autogenerate и сборки metadata."""
from app.models.admin_invite import AdminInvite
from app.models.enums import (
    ExecutorOnlineStatus,
    ExecutorVerificationStatus,
    InviteRole,
    OrderStatus,
    PaymentMethodType,
    Role,
    ServiceType,
    StatusChangeTargetType,
)
from app.models.executor_profile import ExecutorProfile
from app.models.order import Order
from app.models.payment_method import PaymentMethod
from app.models.push_subscription import PushSubscription
from app.models.review import Review
from app.models.status_change_log import StatusChangeLog
from app.models.user import User

__all__ = [
    "AdminInvite",
    "ExecutorOnlineStatus",
    "ExecutorProfile",
    "ExecutorVerificationStatus",
    "InviteRole",
    "Order",
    "OrderStatus",
    "PaymentMethod",
    "PaymentMethodType",
    "PushSubscription",
    "Review",
    "Role",
    "ServiceType",
    "StatusChangeLog",
    "StatusChangeTargetType",
    "User",
]
