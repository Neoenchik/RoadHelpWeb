"""initial schema

Revision ID: 20260505_1200
Revises:
Create Date: 2026-05-05 12:00:00

Создаёт все таблицы и enum-типы в одной миграции. На follow-up изменения схемы
делаем точечные миграции через `alembic revision --autogenerate`.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260505_1200"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    user_role = sa.Enum("USER", "EXECUTOR", "ADMIN", "OPERATOR", name="user_role")
    online_status = sa.Enum("ONLINE", "OFFLINE", name="executor_online_status")
    verification_status = sa.Enum(
        "PENDING", "VERIFIED", "SUSPENDED", "DISABLED",
        name="executor_verification_status",
    )
    service_type = sa.Enum(
        "tow", "tire", "fuel", "lockout", "battery",
        name="service_type",
    )
    order_status = sa.Enum(
        "PENDING", "MATCHED", "ACCEPTED", "EN_ROUTE", "ARRIVED",
        "IN_PROGRESS", "AWAITING_CONFIRMATION", "COMPLETED",
        "CANCELLED", "DISPUTED",
        name="order_status",
    )
    payment_method_type = sa.Enum("card", "wallet", name="payment_method_type")
    status_change_target_type = sa.Enum(
        "executor", "order", name="status_change_target_type"
    )
    invite_role = sa.Enum("ADMIN", "OPERATOR", name="invite_role")

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("first_name", sa.String(80), nullable=False, server_default=""),
        sa.Column("last_name", sa.String(80), nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column("role", user_role, nullable=False, server_default="USER"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("phone"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_phone", "users", ["phone"])
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_role", "users", ["role"])

    op.create_table(
        "executor_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("online_status", online_status, nullable=False, server_default="OFFLINE"),
        sa.Column("verification_status", verification_status, nullable=False, server_default="PENDING"),
        sa.Column("service_types", postgresql.ARRAY(sa.String(20)), nullable=False, server_default="{}"),
        sa.Column("vehicle_make", sa.String(80), nullable=True),
        sa.Column("vehicle_plate", sa.String(20), nullable=True),
        sa.Column("documents_url", postgresql.ARRAY(sa.String(512)), nullable=False, server_default="{}"),
        sa.Column("rating", sa.Float, nullable=False, server_default="0"),
        sa.Column("completed_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("decline_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("lat", sa.Float, nullable=True),
        sa.Column("lng", sa.Float, nullable=True),
        sa.Column("location_updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_executor_profiles_online_status", "executor_profiles", ["online_status"])
    op.create_index("ix_executor_profiles_verification_status", "executor_profiles", ["verification_status"])
    # Композитный индекс для быстрого матчинга — онлайн + верифицирован
    op.create_index(
        "ix_executor_profiles_matching",
        "executor_profiles",
        ["online_status", "verification_status"],
    )

    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("executor_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("service_type", service_type, nullable=False),
        sa.Column("status", order_status, nullable=False, server_default="PENDING"),
        sa.Column("lat", sa.Float, nullable=False),
        sa.Column("lng", sa.Float, nullable=False),
        sa.Column("address", sa.String(512), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("estimated_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("final_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("cancel_reason", sa.String(255), nullable=True),
        sa.Column("transaction_id", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("matched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("arrived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_orders_user_id", "orders", ["user_id"])
    op.create_index("ix_orders_executor_id", "orders", ["executor_id"])
    op.create_index("ix_orders_status", "orders", ["status"])
    op.create_index("ix_orders_created_at", "orders", ["created_at"])
    # Активный заказ юзера ищется часто: status NOT IN ('COMPLETED', 'CANCELLED')
    op.create_index(
        "ix_orders_active_per_user",
        "orders",
        ["user_id", "status"],
    )

    op.create_table(
        "reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("to_user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("score", sa.Integer, nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("score BETWEEN 1 AND 5", name="reviews_score_range"),
    )
    op.create_index("ix_reviews_order_id", "reviews", ["order_id"])
    op.create_index("ix_reviews_to_user_id", "reviews", ["to_user_id"])

    op.create_table(
        "payment_methods",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", payment_method_type, nullable=False),
        sa.Column("last4", sa.String(4), nullable=False),
        sa.Column("brand", sa.String(40), nullable=True),
        sa.Column("is_default", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("provider_token", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_payment_methods_user_id", "payment_methods", ["user_id"])

    op.create_table(
        "push_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("endpoint", sa.String(1024), nullable=False, unique=True),
        sa.Column("p256dh", sa.String(255), nullable=False),
        sa.Column("auth", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_push_subscriptions_user_id", "push_subscriptions", ["user_id"])

    op.create_table(
        "status_change_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("target_type", status_change_target_type, nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("old_status", sa.String(40), nullable=True),
        sa.Column("new_status", sa.String(40), nullable=False),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("changed_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_status_change_logs_target_id", "status_change_logs", ["target_id"])
    op.create_index("ix_status_change_logs_created_at", "status_change_logs", ["created_at"])

    op.create_table(
        "admin_invites",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("role", invite_role, nullable=False),
        sa.Column("token", sa.String(128), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_admin_invites_email", "admin_invites", ["email"])
    op.create_index("ix_admin_invites_token", "admin_invites", ["token"])


def downgrade() -> None:
    op.drop_table("admin_invites")
    op.drop_table("status_change_logs")
    op.drop_table("push_subscriptions")
    op.drop_table("payment_methods")
    op.drop_table("reviews")
    op.drop_table("orders")
    op.drop_table("executor_profiles")
    op.drop_table("users")

    for enum_name in (
        "invite_role",
        "status_change_target_type",
        "payment_method_type",
        "order_status",
        "service_type",
        "executor_verification_status",
        "executor_online_status",
        "user_role",
    ):
        sa.Enum(name=enum_name).drop(op.get_bind(), checkfirst=True)
