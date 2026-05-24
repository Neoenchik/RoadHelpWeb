"""Тесты геопроверки прибытия — алгоритм без БД."""
from app.config import settings
from app.services.geo import haversine_m


def test_within_radius() -> None:
    base_lat, base_lng = 55.7558, 37.6173
    # ~ 100 м к северу
    here_lat = base_lat + 0.0009
    distance = haversine_m(base_lat, base_lng, here_lat, base_lng)
    assert distance <= settings.arrival_radius_m


def test_outside_radius() -> None:
    base_lat, base_lng = 55.7558, 37.6173
    # ~ 500 м к северу
    here_lat = base_lat + 0.0045
    distance = haversine_m(base_lat, base_lng, here_lat, base_lng)
    assert distance > settings.arrival_radius_m
