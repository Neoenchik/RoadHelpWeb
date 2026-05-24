"""Тесты валидации телефона в auth-схемах."""
import pytest

from app.schemas.auth import PhoneRequest, VerifyOtpRequest


def test_phone_valid_e164() -> None:
    pr = PhoneRequest(phone="+79991234567")
    assert pr.phone == "+79991234567"


def test_phone_strips_spaces() -> None:
    pr = PhoneRequest(phone="+7 999 123 4567")
    assert pr.phone == "+79991234567"


def test_phone_rejects_invalid() -> None:
    with pytest.raises(ValueError):
        PhoneRequest(phone="not-a-phone")
    with pytest.raises(ValueError):
        PhoneRequest(phone="89991234567")  # без +


def test_otp_only_4_digits() -> None:
    with pytest.raises(ValueError):
        VerifyOtpRequest(phone="+79991234567", code="abcd", role="USER")
    with pytest.raises(ValueError):
        VerifyOtpRequest(phone="+79991234567", code="12345", role="USER")
    ok = VerifyOtpRequest(phone="+79991234567", code="0001", role="USER")
    assert ok.code == "0001"
