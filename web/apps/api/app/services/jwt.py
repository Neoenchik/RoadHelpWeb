"""JWT issue/verify."""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from jose import JWTError, jwt
from pydantic import BaseModel

from app.config import settings

ALGORITHM = "HS256"


class TokenPayload(BaseModel):
    sub: str  # user_id
    role: str
    type: Literal["access", "refresh"]
    jti: str
    exp: int


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def _build_token(
    user_id: uuid.UUID,
    role: str,
    token_type: Literal["access", "refresh"],
    ttl: timedelta,
) -> str:
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "type": token_type,
        "jti": secrets.token_urlsafe(16),
        "exp": int((_now() + ttl).timestamp()),
        "iat": int(_now().timestamp()),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def issue_access_token(user_id: uuid.UUID, role: str) -> str:
    return _build_token(
        user_id, role, "access",
        timedelta(minutes=settings.jwt_access_ttl_min),
    )


def issue_refresh_token(user_id: uuid.UUID, role: str) -> str:
    return _build_token(
        user_id, role, "refresh",
        timedelta(days=settings.jwt_refresh_ttl_days),
    )


def decode_token(token: str) -> TokenPayload:
    try:
        raw = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}") from e
    return TokenPayload.model_validate(raw)
