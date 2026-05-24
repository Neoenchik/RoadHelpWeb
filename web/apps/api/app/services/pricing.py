"""Простая модель ценообразования для оценки 'от X ₽'."""
from __future__ import annotations

from app.models.enums import ServiceType

BASE_PRICE: dict[ServiceType, int] = {
    ServiceType.tow:     1500,
    ServiceType.tire:    800,
    ServiceType.fuel:    600,
    ServiceType.lockout: 1200,
    ServiceType.battery: 700,
}

# Доплата на километр от исполнителя до клиента, ₽/км
PER_KM = 30


def estimate_price(service: ServiceType, distance_km: float | None = None) -> int:
    base = BASE_PRICE.get(service, 1000)
    if distance_km is None:
        return base
    return int(base + max(0, distance_km - 5) * PER_KM)
