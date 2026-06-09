from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from bot.services.api_client import api

router = Router()

@router.message(Command("start"))
async def cmd_start(message: Message):
    try:
        user = await api.bot_login(
            telegram_id=message.from_user.id,
            first_name=message.from_user.first_name,
            last_name=message.from_user.last_name,
        )
        name = user.get("first_name") or "друг"
        await message.answer(
            f"Привет, {name}! 👋\n\n"
            "RoadHelp — помощь на дороге.\n\n"
            "Команды:\n"
            "/history — история заказов\n"
            "/help — справка\n\n"
            "Создать заказ удобнее на сайте: http://localhost:3000"
        )
    except Exception as e:
        await message.answer(f"Ошибка авторизации: {e}")


@router.message(Command("help"))
async def cmd_help(message: Message):
    await message.answer(
        "🚗 RoadHelp Bot (демо)\n\n"
        "• /start — вход через Telegram\n"
        "• /history — ваши заказы\n\n"
        "Полный функционал (создание заказа, карта, оплата) — на сайте:\n"
        "http://localhost:3000\n\n"
        "OTP для входа на сайте: 1234"
    )


@router.message(Command("history"))
async def cmd_history(message: Message):
    try:
        orders = await api.get_user_orders(message.from_user.id)
        if not orders:
            await message.answer("История заказов пуста.")
            return
        lines = []
        for o in orders[:10]:
            lines.append(f"• {o.get('service_type', '?')} — {o.get('status', 'n/a')} ({o.get('address', '')[:30]})")
        await message.answer("Ваши заказы:\n" + "\n".join(lines))
    except Exception as e:
        await message.answer(f"Не удалось загрузить заказы: {e}")
