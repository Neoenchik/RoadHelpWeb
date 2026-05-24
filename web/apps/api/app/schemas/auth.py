"""Pydantic-схемы для auth-роутов."""
from __future__ import annotations

import re
import uuid
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.enums import Role

PHONE_RE = re.compile(r"^\+\d{10,15}$")


class PhoneRequest(BaseModel):
    phone: str = Field(..., examples=["+79991234567"])
    purpose: Literal["login", "register"] = "login"

    @field_validator("phone")
    @classmethod
    def _phone_format(cls, v: str) -> str:
        v = v.strip().replace(" ", "")
        if not PHONE_RE.match(v):
            raise ValueError("Phone must be in E.164 format, e.g. +79991234567")
        return v


class VerifyOtpRequest(BaseModel):
    phone: str
    code: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")
    role: Literal["USER", "EXECUTOR"] = "USER"

    @field_validator("phone")
    @classmethod
    def _phone_format(cls, v: str) -> str:
        v = v.strip().replace(" ", "")
        if not PHONE_RE.match(v):
            raise ValueError("Phone must be in E.164 format")
        return v


class UserPublic(BaseModel):
    id: uuid.UUID
    phone: str | None = None
    email: str | None = None
    first_name: str
    last_name: str | None = None
    avatar_url: str | None = None
    role: Role

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    user: UserPublic


class LoginPasswordRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class SetPasswordRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=8)


class MessageResponse(BaseModel):
    message: str
