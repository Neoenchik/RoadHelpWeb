"""Shared pytest fixtures for bot tests."""
from __future__ import annotations

import pytest


@pytest.fixture
def sample_phone() -> str:
    return "+79070000001"
