"""Auth endpoints: SMS-OTP для USER/EXECUTOR, password для ADMIN/OPERATOR."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import limiter
from app.models import AdminInvite, ExecutorProfile, Role, User
from app.schemas.auth import (
    AuthResponse,
    LoginPasswordRequest,
    MessageResponse,
    PhoneRequest,
    SetPasswordRequest,
    UserPublic,
    VerifyOtpRequest,
)
from app.services.jwt import decode_token, issue_access_token, issue_refresh_token
from app.services.otp import OtpInvalidError, OtpRateLimitError, send_otp, verify_otp
from app.services.security import hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

REFRESH_COOKIE = "rh_refresh"


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=not settings.is_dev,
        samesite="lax",
        max_age=settings.jwt_refresh_ttl_days * 24 * 3600,
        path="/api/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE, path="/api/auth")


@router.post("/send-otp", response_model=MessageResponse)
@limiter.limit("10/minute")
async def send_otp_route(request: Request, body: PhoneRequest) -> MessageResponse:
    try:
        await send_otp(body.phone)
    except OtpRateLimitError as e:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, str(e)) from e
    return MessageResponse(message="Код отправлен")


@router.post("/verify-otp", response_model=AuthResponse)
@limiter.limit("20/minute")
async def verify_otp_route(
    request: Request,
    body: VerifyOtpRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    try:
        ok = await verify_otp(body.phone, body.code)
    except OtpInvalidError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e
    if not ok:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Неверный код")

    user = await db.scalar(select(User).where(User.phone == body.phone))
    if user is None:
        # Регистрация
        user = User(
            phone=body.phone,
            first_name="",
            role=Role(body.role),
        )
        db.add(user)
        await db.flush()
        if user.role == Role.EXECUTOR:
            db.add(ExecutorProfile(user_id=user.id))
        await db.commit()
        await db.refresh(user)
    elif user.role in (Role.ADMIN, Role.OPERATOR):
        # Этим ролям SMS-вход запрещён — у них password.
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Используйте вход по email и паролю")

    access = issue_access_token(user.id, user.role.value)
    refresh = issue_refresh_token(user.id, user.role.value)
    _set_refresh_cookie(response, refresh)

    return AuthResponse(access_token=access, user=UserPublic.model_validate(user))


@router.post("/refresh", response_model=AuthResponse)
async def refresh_route(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token missing")
    try:
        payload = decode_token(token)
    except ValueError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(e)) from e
    if payload.type != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong token type")

    user = await db.get(User, __import__("uuid").UUID(payload.sub))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")

    access = issue_access_token(user.id, user.role.value)
    new_refresh = issue_refresh_token(user.id, user.role.value)
    _set_refresh_cookie(response, new_refresh)

    return AuthResponse(access_token=access, user=UserPublic.model_validate(user))


@router.post("/logout", response_model=MessageResponse)
async def logout_route(response: Response) -> MessageResponse:
    _clear_refresh_cookie(response)
    return MessageResponse(message="Logged out")


@router.post("/login-password", response_model=AuthResponse)
@limiter.limit("10/minute")
async def login_password_route(
    request: Request,
    body: LoginPasswordRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    user = await db.scalar(select(User).where(User.email == body.email))
    if user is None or not user.password_hash:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный email или пароль")
    if user.role not in (Role.ADMIN, Role.OPERATOR):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Этот вход только для админов и операторов")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный email или пароль")

    access = issue_access_token(user.id, user.role.value)
    refresh = issue_refresh_token(user.id, user.role.value)
    _set_refresh_cookie(response, refresh)

    return AuthResponse(access_token=access, user=UserPublic.model_validate(user))


@router.get("/accept-invite/{token}", response_model=MessageResponse)
async def accept_invite_route(token: str, db: AsyncSession = Depends(get_db)) -> MessageResponse:
    invite = await db.scalar(select(AdminInvite).where(AdminInvite.token == token))
    if invite is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invite не найден")
    if invite.used_at:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invite уже использован")
    if invite.expires_at < datetime.now(tz=timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invite просрочен")
    return MessageResponse(message="Invite валиден — установите пароль")


@router.post("/set-password", response_model=AuthResponse)
async def set_password_route(
    body: SetPasswordRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    invite = await db.scalar(select(AdminInvite).where(AdminInvite.token == body.token))
    if invite is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invite не найден")
    if invite.used_at:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invite уже использован")
    if invite.expires_at < datetime.now(tz=timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invite просрочен")

    existing = await db.scalar(select(User).where(User.email == invite.email))
    if existing is None:
        user = User(
            email=invite.email,
            first_name="",
            role=Role(invite.role.value),
            password_hash=hash_password(body.password),
        )
        db.add(user)
    else:
        user = existing
        user.password_hash = hash_password(body.password)
        user.role = Role(invite.role.value)

    invite.used_at = datetime.now(tz=timezone.utc)
    await db.commit()
    await db.refresh(user)

    access = issue_access_token(user.id, user.role.value)
    refresh = issue_refresh_token(user.id, user.role.value)
    _set_refresh_cookie(response, refresh)

    return AuthResponse(access_token=access, user=UserPublic.model_validate(user))


@router.get("/me", response_model=UserPublic)
async def me_route(user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic.model_validate(user)
