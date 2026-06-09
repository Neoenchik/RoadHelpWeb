from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message
from bot.services.api_client import api

router = Router()

@router.message(Command("executor"))
async def cmd_executor(message: Message):
    await message.answer("Executor mode active. Requests go through the C# API.")
