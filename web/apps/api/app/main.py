"""FastAPI entrypoint."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.middleware.rate_limit import limiter, rate_limit_exceeded_handler
from app.services.redis_client import close_redis
from app.workers.matching_timeout import run_loop as matching_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(matching_loop(), name="matching-loop")
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        await close_redis()


app = FastAPI(
    title="Road Help API",
    version="0.1.0",
    description="Backend для платформы экстренной дорожной помощи",
    lifespan=lifespan,
    docs_url="/docs" if settings.is_dev else None,
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


from app.routers import admin as admin_router  # noqa: E402
from app.routers import auth as auth_router  # noqa: E402
from app.routers import executors as executors_router  # noqa: E402
from app.routers import operator as operator_router  # noqa: E402
from app.routers import orders_executor as orders_executor_router  # noqa: E402
from app.routers import orders_user as orders_user_router  # noqa: E402
from app.routers import push as push_router  # noqa: E402
from app.routers import users as users_router  # noqa: E402
from app.routers import ws as ws_router  # noqa: E402

app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(orders_user_router.router)
app.include_router(orders_executor_router.router)
app.include_router(executors_router.router)
app.include_router(executors_router.earnings_router)
app.include_router(admin_router.router)
app.include_router(operator_router.router)
app.include_router(push_router.router)
app.include_router(ws_router.router)
