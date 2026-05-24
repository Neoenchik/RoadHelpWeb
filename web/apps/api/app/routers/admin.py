"""ADMIN API."""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth import require_role
from app.models import (
    AdminInvite,
    ExecutorProfile,
    Role,
    StatusChangeLog,
    StatusChangeTargetType,
    User,
)
from app.schemas.admin import (
    AdminExecutorListItem,
    AdminUserListItem,
    CreateInviteRequest,
    InviteResponse,
    UpdateExecutorStatus,
    UpdateUserRole,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/executors", response_model=list[AdminExecutorListItem])
async def list_executors(
    verification_status: str | None = Query(None),
    q: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role(Role.ADMIN)),
) -> list[AdminExecutorListItem]:
    stmt = (
        select(ExecutorProfile, User)
        .join(User, User.id == ExecutorProfile.user_id)
    )
    if verification_status:
        stmt = stmt.where(ExecutorProfile.verification_status == verification_status)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(User.first_name.ilike(like), User.phone.ilike(like)))
    stmt = stmt.limit(100)
    rows = (await db.execute(stmt)).all()
    return [
        AdminExecutorListItem(
            user_id=u.id,
            first_name=u.first_name,
            last_name=u.last_name,
            phone=u.phone,
            online_status=ep.online_status,
            verification_status=ep.verification_status,
            rating=ep.rating,
            completed_count=ep.completed_count,
        )
        for ep, u in rows
    ]


@router.get("/executors/{user_id}", response_model=AdminExecutorListItem)
async def executor_detail(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role(Role.ADMIN)),
) -> AdminExecutorListItem:
    row = (
        await db.execute(
            select(ExecutorProfile, User)
            .join(User, User.id == ExecutorProfile.user_id)
            .where(User.id == user_id)
        )
    ).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Не найден")
    ep, u = row
    return AdminExecutorListItem(
        user_id=u.id,
        first_name=u.first_name,
        last_name=u.last_name,
        phone=u.phone,
        online_status=ep.online_status,
        verification_status=ep.verification_status,
        rating=ep.rating,
        completed_count=ep.completed_count,
    )


@router.patch("/executors/{user_id}/status", response_model=AdminExecutorListItem)
async def update_executor_status(
    user_id: uuid.UUID,
    body: UpdateExecutorStatus,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(Role.ADMIN)),
) -> AdminExecutorListItem:
    profile = await db.scalar(
        select(ExecutorProfile).where(ExecutorProfile.user_id == user_id)
    )
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Профиль не найден")
    old = profile.verification_status.value
    profile.verification_status = body.verification_status
    db.add(StatusChangeLog(
        target_type=StatusChangeTargetType.executor,
        target_id=user_id,
        old_status=old,
        new_status=body.verification_status.value,
        reason=body.reason,
        changed_by=admin.id,
    ))
    await db.commit()
    user = await db.get(User, user_id)
    return AdminExecutorListItem(
        user_id=user.id, first_name=user.first_name, last_name=user.last_name,
        phone=user.phone, online_status=profile.online_status,
        verification_status=profile.verification_status, rating=profile.rating,
        completed_count=profile.completed_count,
    )


@router.get("/users", response_model=list[AdminUserListItem])
async def list_users(
    q: str | None = Query(None),
    role: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role(Role.ADMIN)),
) -> list[AdminUserListItem]:
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(
            User.first_name.ilike(like),
            User.phone.ilike(like),
            User.email.ilike(like),
        ))
    stmt = stmt.order_by(User.created_at.desc()).limit(100)
    rows = list((await db.scalars(stmt)).all())
    return [AdminUserListItem.model_validate(r, from_attributes=True) for r in rows]


@router.patch("/users/{user_id}", response_model=AdminUserListItem)
async def update_user_role(
    user_id: uuid.UUID,
    body: UpdateUserRole,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role(Role.ADMIN)),
) -> AdminUserListItem:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    user.role = body.role
    await db.commit()
    await db.refresh(user)
    return AdminUserListItem.model_validate(user, from_attributes=True)


@router.post("/invites", response_model=InviteResponse)
async def create_invite(
    body: CreateInviteRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(Role.ADMIN)),
) -> InviteResponse:
    token = secrets.token_urlsafe(32)
    invite = AdminInvite(
        email=body.email,
        role=body.role,
        token=token,
        expires_at=datetime.now(tz=timezone.utc) + timedelta(days=7),
        created_by=admin.id,
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    invite_url = f"{settings.invite_base_url}/auth/accept-invite/{token}"
    # В dev — выводим в stdout. В prod — нужен SMTP.
    print(f"\n  ✉️  invite to {body.email} ({body.role.value}): {invite_url}\n", flush=True)
    return InviteResponse(
        id=invite.id, email=invite.email, role=invite.role, token=invite.token,
        expires_at=invite.expires_at, used_at=invite.used_at,
        invite_url=invite_url, created_at=invite.created_at,
    )


@router.get("/invites", response_model=list[InviteResponse])
async def list_invites(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role(Role.ADMIN)),
) -> list[InviteResponse]:
    rows = list((await db.scalars(
        select(AdminInvite).order_by(AdminInvite.created_at.desc()).limit(100)
    )).all())
    return [
        InviteResponse(
            id=r.id, email=r.email, role=r.role, token=r.token,
            expires_at=r.expires_at, used_at=r.used_at,
            invite_url=f"{settings.invite_base_url}/auth/accept-invite/{r.token}",
            created_at=r.created_at,
        )
        for r in rows
    ]
