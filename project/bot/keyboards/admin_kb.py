from __future__ import annotations

import uuid

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder


def executor_actions_kb(executor_id: uuid.UUID) -> InlineKeyboardMarkup:
    eid = str(executor_id)
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="Верифицировать", callback_data=f"admin:verify:{eid}"),
        InlineKeyboardButton(text="Приостановить", callback_data=f"admin:suspend:{eid}"),
        InlineKeyboardButton(text="Отключить", callback_data=f"admin:disable:{eid}"),
    )
    return builder.as_markup()


def dashboard_refresh_kb() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.add(InlineKeyboardButton(text="Обновить", callback_data="operator:refresh"))
    return builder.as_markup()
