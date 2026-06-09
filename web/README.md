# RoadHelp Platform

Roadside assistance platform: .NET 8 API, Next.js frontend, Telegram bot.

## Architecture

```
RoadHelp.Domain          — entities, enums, OrderFsm
RoadHelp.Application     — DTOs, interfaces, MatchingService
RoadHelp.Infrastructure  — EF Core, Redis, JWT, OTP, S3, payments
RoadHelp.Api             — controllers, SignalR hubs, migrations
RoadHelp.Tests           — xUnit integration & unit tests
web/apps/web             — Next.js 16 frontend
project/bot              — Telegram bot (API-only via httpx)
```

## Quick start

```bash
cd web
cp .env.example .env   # BOT_TOKEN optional for site-only demo
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| Website | http://localhost:3000 |
| API + Swagger | http://localhost:8080/swagger |
| MinIO console | http://localhost:9001 |

**Dev login OTP for all phones:** `1234`

## Demo accounts (auto-seeded on first start)

| Роль | Телефон | Куда ведёт |
|------|---------|------------|
| Админ | +79000000001 | /admin |
| Оperator | +79000000002 | /operator |
| Клиент | +79000000003 | /app (есть демо-карта и история) |
| Исполнитель 1 | +79000000004 | /executor (онлайн, Москва) |
| Исполнитель 2 | +79000000005 | /executor |

Карты: бесплатная OpenStreetMap (без API-ключа). Оплата — mock Visa •••• 4242.

## Сценарий демонстрации (5–7 мин)

1. **Главная** → http://localhost:3000
2. **Клиент** — вход `+79000000003`, OTP `1234` → создать заказ → выбрать **Сергея**
3. **Авто-демо** — через 5 сек Сергей «откликается», далее сценарий до оплаты (~45 сек) без второго браузера
4. **Клиент** — «Подтвердить и оплатить» (mock) → отзыв
5. **Оператор** — `+79000000002` → `/operator` (метрики, активные заказы на карте)
6. **Админ** — `+79000000001` → `/admin` (пользователи, исполнители, приглашения)
7. **Telegram** — `/start`, `/history` (если настроен BOT_TOKEN)

*Вручную через исполнителя:* `+79000000005` — принять заказ в `/executor` (авто-демо отключится, если выбран другой мастер).

## Tests

```bash
dotnet test apps/RoadHelp.Tests
cd apps/web && npm install && npm test
docker exec web-bot-1 python -m pytest tests/ -q
```

## Environment variables

See `web/.env.example`. Required for production: `JWT__Secret`, `BOT_TOKEN`, `BOT_SECRET`.

Optional: `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` — если нужны Яндекс.Карты вместо OSM.
