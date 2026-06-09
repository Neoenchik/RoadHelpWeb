from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from aiogram import Bot


async def notify_executor_new_order(bot: "Bot", executor_tg_id: int, order_data: dict, kb) -> None:
    service_labels = {
        "tow": "Эвакуатор",
        "tire": "Шиномонтаж",
        "fuel": "Топливо",
        "lockout": "Вскрытие",
        "battery": "Аккумулятор",
    }
    service = service_labels.get(order_data.get("service_type", ""), order_data.get("service_type", ""))
    dist_km = order_data.get("distance_km", "?")
    price = order_data.get("price", "?")
    await bot.send_message(
        executor_tg_id,
        f"📋 Новая заявка!\n"
        f"Услуга: {service}\n"
        f"Расстояние: {dist_km} км\n"
        f"Стоимость: ~{price} ₽\n"
        f"⏱ У вас 60 секунд",
        reply_markup=kb,
    )


async def notify_user_matched(bot: "Bot", user_tg_id: int, ranked_executors: list[dict], kb) -> None:
    lines = ["Найдено исполнителей:\n"]
    for i, ex in enumerate(ranked_executors[:3], 1):
        lines.append(
            f"{i}. {ex['name']} ⭐ {ex['rating']:.1f} | ETA: {ex['eta_min']} мин | ~{ex['price']} ₽"
        )
    await bot.send_message(user_tg_id, "\n".join(lines), reply_markup=kb)


async def notify_user_assigned(bot: "Bot", user_tg_id: int, executor_data: dict) -> None:
    await bot.send_message(
        user_tg_id,
        f"Исполнитель найден!\n"
        f"{executor_data['name']} ⭐ {executor_data['rating']:.1f}\n"
        f"ETA: {executor_data['eta_min']} минут\n"
        f"Он уже едет к вам",
    )


async def notify_user_no_executors(bot: "Bot", user_tg_id: int, kb) -> None:
    await bot.send_message(
        user_tg_id,
        "Исполнители не найдены.\nПопробовать снова?",
        reply_markup=kb,
    )


async def notify_user_arrived(bot: "Bot", user_tg_id: int) -> None:
    await bot.send_message(user_tg_id, "Исполнитель прибыл! Работа начата.")


async def notify_user_awaiting_confirm(bot: "Bot", user_tg_id: int, amount: float, kb) -> None:
    await bot.send_message(
        user_tg_id,
        f"Исполнитель сообщает о завершении работы.\n"
        f"Стоимость: {amount:.0f} ₽\n"
        f"Подтверждаете?",
        reply_markup=kb,
    )


async def notify_both_completed(bot: "Bot", user_tg_id: int, executor_tg_id: int, amount: float) -> None:
    await bot.send_message(user_tg_id, f"Оплата {amount:.0f} ₽ прошла успешно!")
    await bot.send_message(executor_tg_id, "Заказ завершён! Оплата получена.")


async def notify_operator_dispute(bot: "Bot", operator_ids: list[int], order_id: uuid.UUID) -> None:
    text = f"Спор по заказу {order_id}. Требуется вмешательство."
    for op_id in operator_ids:
        try:
            await bot.send_message(op_id, text)
        except Exception:
            pass


async def notify_operator_alert(bot: "Bot", operator_ids: list[int], message: str) -> None:
    for op_id in operator_ids:
        try:
            await bot.send_message(op_id, f"АЛЕРТ: {message}")
        except Exception:
            pass


async def update_user_tracking(
    bot: "Bot",
    user_tg_id: int,
    message_id: int,
    dist_km: float,
    eta_min: int,
    updated_time: str,
) -> None:
    text = (
        f"Исполнитель едет к вам\n"
        f"Расстояние: {dist_km:.1f} км\n"
        f"ETA: ~{eta_min} минут\n"
        f"Обновлено: {updated_time}"
    )
    try:
        await bot.edit_message_text(text, chat_id=user_tg_id, message_id=message_id)
    except Exception:
        pass
