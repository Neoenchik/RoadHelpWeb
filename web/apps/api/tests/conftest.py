"""Базовые фикстуры pytest. Будут расширяться по мере роста тестов."""
import pytest


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"
