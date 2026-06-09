import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.redis import RedisStorage
from redis.asyncio import Redis

from bot.config import config
from bot.handlers.admin import router as admin_router
from bot.handlers.executor import router as executor_router
from bot.handlers.user import router as user_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

async def main() -> None:
    logger.info("Starting bot pointing to C# API: %s", config.api_url)
    
    redis = Redis.from_url(config.redis_url)
    storage = RedisStorage(redis=redis)
    
    bot = Bot(token=config.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher(storage=storage)
    
    dp.include_router(admin_router)
    dp.include_router(executor_router)
    dp.include_router(user_router)
    
    try:
        await bot.delete_webhook(drop_pending_updates=True)
        await dp.start_polling(bot)
    finally:
        await bot.session.close()
        await redis.close()

if __name__ == "__main__":
    asyncio.run(main())

