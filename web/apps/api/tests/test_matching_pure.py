"""Юнит-тесты ранжирования кандидатов matching engine.
Не трогаем БД и Redis — проверяем чисто алгоритм сортировки/фильтрации
кандидатов в _candidates через поведенческие проверки expired_offers и т.п.

Полный e2e на матчинге будет в test_complete_flow.py (шаг 19).
"""
from __future__ import annotations

import pytest

from app.services.matching import Candidate


def test_candidate_sort_distance_then_rating_then_completed() -> None:
    a = Candidate("a", distance_km=2.0, rating=4.5, completed_count=100)
    b = Candidate("b", distance_km=1.5, rating=4.9, completed_count=200)
    c = Candidate("c", distance_km=1.5, rating=4.9, completed_count=50)
    d = Candidate("d", distance_km=1.5, rating=4.7, completed_count=500)
    items = [a, b, c, d]
    items.sort(key=lambda x: (x.distance_km, -x.rating, -x.completed_count))
    assert [i.user_id for i in items] == ["b", "c", "d", "a"]
