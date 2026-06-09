from __future__ import annotations

from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder


def executor_main_kb(is_online: bool = False) -> ReplyKeyboardMarkup:
    status_btn = "🔴 Офлайн" if is_online else "🟢 Онлайн"
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=status_btn)],
            [KeyboardButton(text="📋 Текущий заказ"), KeyboardButton(text="📜 История")],
            [KeyboardButton(text="📍 Обновить геолокацию", request_location=True)],
        ],
        resize_keyboard=True,
    )


def order_action_kb(order_id: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.add(
        InlineKeyboardButton(text="Принять", callback_data=f"order_accept:{order_id}"),
        InlineKeyboardButton(text="Отклонить", callback_data=f"order_decline:{order_id}"),
    )
    return builder.as_markup()


def arrived_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="📍 Я прибыл", request_location=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def in_progress_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="Работа выполнена")]],
        resize_keyboard=True,
    )
