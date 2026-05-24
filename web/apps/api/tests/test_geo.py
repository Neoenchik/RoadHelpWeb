"""Тесты haversine."""
from app.services.geo import haversine_km, haversine_m


def test_zero_distance() -> None:
    assert haversine_m(55.75, 37.6, 55.75, 37.6) == 0


def test_known_distance_moscow_spb() -> None:
    # Москва ≈ 55.7558, 37.6173 ; Спб ≈ 59.9343, 30.3351 — около 634 км
    d = haversine_km(55.7558, 37.6173, 59.9343, 30.3351)
    assert 620 < d < 650


def test_arrival_radius_check() -> None:
    # 200 метров — на границе. Подтверждаем, что округление работает корректно.
    base_lat, base_lng = 55.7558, 37.6173
    # Сдвиг ~100м
    close = haversine_m(base_lat, base_lng, base_lat + 0.0009, base_lng)
    assert close < 200
    # Сдвиг ~500м
    far = haversine_m(base_lat, base_lng, base_lat + 0.0045, base_lng)
    assert far > 200
