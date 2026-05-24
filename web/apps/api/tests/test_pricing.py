"""Тесты pricing."""
from app.models.enums import ServiceType
from app.services.pricing import estimate_price


def test_base_price() -> None:
    assert estimate_price(ServiceType.tow) == 1500
    assert estimate_price(ServiceType.tire) == 800
    assert estimate_price(ServiceType.battery) == 700


def test_distance_premium_kicks_in_after_5km() -> None:
    base = estimate_price(ServiceType.tow, 5)
    further = estimate_price(ServiceType.tow, 10)
    # 5 км × 30 ₽ = 150 ₽
    assert further - base == 150


def test_short_distance_no_premium() -> None:
    assert estimate_price(ServiceType.tow, 3) == estimate_price(ServiceType.tow, 5)
