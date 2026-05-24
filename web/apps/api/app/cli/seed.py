"""Сидинг dev-данных. Запуск: docker compose exec api python -m app.cli seed"""
from __future__ import annotations

import asyncio
import secrets

from sqlalchemy import select

from app.database import SessionLocal
from app.models import (
    ExecutorOnlineStatus,
    ExecutorProfile,
    ExecutorVerificationStatus,
    Role,
    User,
)


async def _seed() -> None:
    async with SessionLocal() as db:
        existing = await db.scalar(select(User).where(User.phone == "+79991110001"))
        if existing:
            print("[seed] dev-данные уже загружены — пропускаю.")
            return

        # USER
        client = User(
            phone="+79991110001",
            first_name="Алексей",
            last_name="Клиент",
            role=Role.USER,
        )
        db.add(client)

        # EXECUTORS
        executors = [
            ("+79991110002", "Иван", "Петров", ["tow", "battery"],
             "Toyota Hilux", "А123БВ77", 55.7558, 37.6173,
             ExecutorVerificationStatus.VERIFIED, ExecutorOnlineStatus.ONLINE, 4.8, 243),
            ("+79991110003", "Сергей", "Иванов", ["tire", "fuel"],
             "Ford Transit", "В456ГД77", 55.7600, 37.6200,
             ExecutorVerificationStatus.VERIFIED, ExecutorOnlineStatus.ONLINE, 4.6, 178),
            ("+79991110004", "Дмитрий", "Соколов", ["tow", "lockout"],
             "Mercedes Sprinter", "Е789ЖЗ77", 55.7400, 37.6100,
             ExecutorVerificationStatus.VERIFIED, ExecutorOnlineStatus.OFFLINE, 4.9, 521),
            ("+79991110005", "Артём", "Морозов", ["battery", "fuel"],
             "Lada Largus", "К012ЛМ77", 55.7700, 37.6300,
             ExecutorVerificationStatus.PENDING, ExecutorOnlineStatus.OFFLINE, 0.0, 0),
        ]
        for phone, first, last, services, make, plate, lat, lng, vstatus, ostatus, rating, completed in executors:
            user = User(phone=phone, first_name=first, last_name=last, role=Role.EXECUTOR)
            db.add(user)
            await db.flush()
            profile = ExecutorProfile(
                user_id=user.id,
                online_status=ostatus,
                verification_status=vstatus,
                service_types=services,
                vehicle_make=make,
                vehicle_plate=plate,
                rating=rating,
                completed_count=completed,
                lat=lat,
                lng=lng,
            )
            db.add(profile)

        await db.commit()
        print("[seed] dev-данные загружены:")
        print("  USER:     +79991110001")
        print("  EXEC #1:  +79991110002 (Иван, online, verified)")
        print("  EXEC #2:  +79991110003 (Сергей, online, verified)")
        print("  EXEC #3:  +79991110004 (Дмитрий, offline, verified)")
        print("  EXEC #4:  +79991110005 (Артём, offline, pending)")
        print("Для входа использовать SMS_PROVIDER=mock — OTP появится в логах api.")


def run() -> None:
    asyncio.run(_seed())
