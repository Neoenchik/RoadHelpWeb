from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message

router = Router()

@router.message(Command("operator"))
async def cmd_operator(message: Message):
    await message.answer("Operator module")

