from __future__ import annotations

import math

EARTH_RADIUS_M = 6_371_000.0


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return distance in metres between two WGS-84 coordinates."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def verify_arrival(
    executor_lat: float,
    executor_lng: float,
    order_lat: float,
    order_lng: float,
    threshold_m: float = 200.0,
) -> bool:
    return haversine(executor_lat, executor_lng, order_lat, order_lng) <= threshold_m


def eta_minutes(dist_m: float, speed_kmh: float = 40.0) -> int:
    return max(1, round(dist_m / (speed_kmh * 1000 / 60)))
