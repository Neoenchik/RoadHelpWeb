"""Тесты JWT issue/decode и протухания."""
from __future__ import annotations

import time
import uuid
from datetime import timedelta
from unittest.mock import patch

import pytest

from app.services.jwt import decode_token, issue_access_token, issue_refresh_token


def test_issue_and_decode_access() -> None:
    uid = uuid.uuid4()
    token = issue_access_token(uid, "USER")
    payload = decode_token(token)
    assert payload.sub == str(uid)
    assert payload.role == "USER"
    assert payload.type == "access"


def test_issue_and_decode_refresh() -> None:
    uid = uuid.uuid4()
    token = issue_refresh_token(uid, "EXECUTOR")
    payload = decode_token(token)
    assert payload.sub == str(uid)
    assert payload.type == "refresh"


def test_invalid_token_raises() -> None:
    with pytest.raises(ValueError):
        decode_token("nonsense.not.a.jwt")


def test_token_expiry() -> None:
    uid = uuid.uuid4()
    # Сэмулируем мгновенно истёкший токен через мок ttl.
    with patch("app.services.jwt.timedelta") as mock_td:
        mock_td.return_value = timedelta(seconds=-1)
        token = issue_access_token(uid, "USER")
    # Через секунду точно истёк
    time.sleep(0.05)
    with pytest.raises(ValueError):
        decode_token(token)
