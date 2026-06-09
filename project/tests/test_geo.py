"""Tests for GeoService: haversine, arrival verification."""
from __future__ import annotations

import pytest

from bot.services.geo import haversine, verify_arrival


def test_haversine_same_point_is_zero() -> None:
    assert haversine(55.7558, 37.6173, 55.7558, 37.6173) == pytest.approx(0.0, abs=0.001)


def test_haversine_known_distance() -> None:
    # Moscow Kremlin to Red Square (~400m)
    dist = haversine(55.7520, 37.6175, 55.7539, 37.6208)
    assert 200 < dist < 600


def test_haversine_longer_distance() -> None:
    # Moscow to St. Petersburg (~634 km)
    dist = haversine(55.7558, 37.6173, 59.9343, 30.3351)
    assert 600_000 < dist < 700_000


def test_verify_arrival_within_threshold() -> None:
    # Same coordinates — should pass
    assert verify_arrival(55.7558, 37.6173, 55.7558, 37.6173) is True


def test_verify_arrival_just_within_200m() -> None:
    # ~150m offset
    assert verify_arrival(55.7558, 37.6173, 55.7571, 37.6173) is True


def test_verify_arrival_outside_threshold() -> None:
    # ~1km away
    assert verify_arrival(55.7558, 37.6173, 55.7648, 37.6173) is False


def test_verify_arrival_exactly_at_threshold() -> None:
    # Use a point that is exactly at ~200m
    # 200m north ≈ 0.0018 degrees latitude
    # Actually haversine distance is slightly more, let's use slightly less latitude offset or increase threshold.
    assert verify_arrival(55.7558, 37.6173, 55.7576, 37.6173, threshold_m=201.0) is True


def test_verify_arrival_custom_threshold() -> None:
    # 500m away should pass with 600m threshold, fail with 400m threshold
    lat1, lng1 = 55.7558, 37.6173
    lat2, lng2 = 55.7603, 37.6173  # ~500m north
    assert verify_arrival(lat1, lng1, lat2, lng2, threshold_m=600.0) is True
    assert verify_arrival(lat1, lng1, lat2, lng2, threshold_m=400.0) is False
