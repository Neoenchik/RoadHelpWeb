"""Tests for bot API client."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from bot.services.api_client import ApiClient


@pytest.mark.asyncio
async def test_bot_login_sends_secret_header() -> None:
    client = ApiClient(base_url="http://test-api", secret_key="test-secret")

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "access_token": "tok",
        "user": {"id": "1", "first_name": "Test", "role": "USER"},
    }
    mock_response.raise_for_status = MagicMock()

    with patch.object(client.client, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        result = await client.bot_login(telegram_id=123, first_name="Test")

    mock_post.assert_called_once()
    headers = mock_post.call_args.kwargs["headers"]
    assert headers["X-Bot-Secret"] == "test-secret"
    assert result["first_name"] == "Test"
    assert client.tokens[123] == "tok"


@pytest.mark.asyncio
async def test_cancel_order_uses_correct_url() -> None:
    client = ApiClient(base_url="http://test-api", secret_key="secret")
    client.tokens[789] = "token"

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()

    with patch.object(client.client, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        await client.cancel_order(789, "order-uuid")

    mock_post.assert_called_once()
    assert mock_post.call_args.args[0] == "/api/orders/order-uuid/cancel"
    assert mock_post.call_args.kwargs["json"] == {"reason": "Отменено через Telegram"}


@pytest.mark.asyncio
async def test_get_user_orders_uses_auth_header() -> None:
    client = ApiClient(base_url="http://test-api", secret_key="secret")
    client.tokens[456] = "my-token"

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"items": []}

    with patch.object(client.client, "get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        result = await client.get_user_orders(456)

    headers = mock_get.call_args.kwargs["headers"]
    assert headers["Authorization"] == "Bearer my-token"
    assert result == []
