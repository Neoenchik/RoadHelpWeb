"""create-admin — создаёт первого ADMIN-пользователя по email из .env.

Запуск: docker compose exec api python -m app.cli create-admin
"""
from __future__ import annotations

import asyncio
import getpass

from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal
from app.models import Role, User
from app.services.security import hash_password


async def _create() -> None:
    email = settings.admin_bootstrap_email
    print(f"Создание ADMIN с email: {email}")
    password = getpass.getpass("Пароль (минимум 8 символов): ").strip()
    if len(password) < 8:
        print("Пароль слишком короткий.")
        return
    confirm = getpass.getpass("Повтор: ").strip()
    if password != confirm:
        print("Пароли не совпали.")
        return

    async with SessionLocal() as db:
        existing = await db.scalar(select(User).where(User.email == email))
        if existing is not None:
            if existing.role == Role.ADMIN and existing.password_hash:
                print(f"ADMIN c email {email} уже существует.")
                return
            existing.role = Role.ADMIN
            existing.password_hash = hash_password(password)
            await db.commit()
            print(f"Существующий пользователь повышен до ADMIN: {email}")
            return

        user = User(
            email=email,
            first_name="Admin",
            role=Role.ADMIN,
            password_hash=hash_password(password),
        )
        db.add(user)
        await db.commit()
        print(f"ADMIN создан: {email}")


def run() -> None:
    asyncio.run(_create())
