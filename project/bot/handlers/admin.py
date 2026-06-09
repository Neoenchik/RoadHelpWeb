from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message

router = Router()

@router.message(Command("admin"))
async def cmd_admin(message: Message):
    await message.answer("Admin module")

