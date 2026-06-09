from __future__ import annotations

from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder


def main_menu_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📋 Новая заявка"), KeyboardButton(text="📍 Мой заказ")],
            [KeyboardButton(text="📜 История"), KeyboardButton(text="❓ Помощь")],
        ],
        resize_keyboard=True,
    )


def role_selection_kb() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.add(
        InlineKeyboardButton(text="Я клиент", callback_data="role:user"),
        InlineKeyboardButton(text="Я исполнитель", callback_data="role:executor"),
    )
    return builder.as_markup()


def service_type_kb() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="🚗 Эвакуатор", callback_data="service:tow"),
        InlineKeyboardButton(text="🔧 Шиномонтаж", callback_data="service:tire"),
    )
    builder.row(
        InlineKeyboardButton(text="⛽ Топливо", callback_data="service:fuel"),
        InlineKeyboardButton(text="🔑 Вскрытие", callback_data="service:lockout"),
    )
    builder.row(InlineKeyboardButton(text="🔋 Аккумулятор", callback_data="service:battery"))
    return builder.as_markup()


def location_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="📍 Отправить моё местоположение", request_location=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def confirm_order_kb() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.add(
        InlineKeyboardButton(text="Да", callback_data="order_confirm:yes"),
        InlineKeyboardButton(text="Изменить", callback_data="order_confirm:edit"),
    )
    return builder.as_markup()


def executor_selection_kb(executors: list[dict]) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for i, ex in enumerate(executors, 1):
        builder.row(
            InlineKeyboardButton(
                text=f"Выбрать #{i}",
                callback_data=f"select_executor:{ex['executor_id']}",
            )
        )
    return builder.as_markup()


def retry_search_kb() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.add(InlineKeyboardButton(text="Повторить поиск", callback_data="retry_search"))
    return builder.as_markup()


def confirm_completion_kb() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.add(
        InlineKeyboardButton(text="Подтвердить", callback_data="completion:confirm"),
        InlineKeyboardButton(text="Есть проблема", callback_data="completion:dispute"),
    )
    return builder.as_markup()


def review_kb() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for i in range(1, 6):
        builder.add(InlineKeyboardButton(text=f"{'⭐' * i}", callback_data=f"review:{i}"))
    builder.adjust(5)
    return builder.as_markup()


def skip_comment_kb() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.add(InlineKeyboardButton(text="Пропустить", callback_data="review_comment:skip"))
    return builder.as_markup()


def remove_kb() -> ReplyKeyboardRemove:
    return ReplyKeyboardRemove()
