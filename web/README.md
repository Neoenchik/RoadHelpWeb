# Road Help

Платформа экстренной дорожной помощи. Полный стек: Next.js 16 (App Router) + FastAPI + PostgreSQL + Redis + MinIO.

> **Проектные документы**
> - [docs/refs.md](docs/refs.md) — конспект актуальных доков и зафиксированные версии
> - [docs/design.md](docs/design.md) — дизайн-система (цвета, типографика, компоненты)

---

## Стек

- **Frontend** Next.js 16, TypeScript strict, Tailwind v3.4, shadcn/ui (выборочно), TanStack Query v5, Zustand, Framer Motion, Yandex Maps v3, next-pwa.
- **Backend** FastAPI, SQLAlchemy 2.0 async, asyncpg, Alembic, Redis, APScheduler, pywebpush, slowapi.
- **Инфра** PostgreSQL 15, Redis 7, MinIO (S3-совместимое хранилище).

---

## Быстрый старт

### Вариант 1 — всё через Docker (рекомендуемый)

```bash
git clone <repo>
cd road-help
cp .env.example .env
# впишите NEXT_PUBLIC_YANDEX_MAPS_API_KEY и (опционально) VAPID ключи
docker compose up
```

После старта:

| Сервис | URL |
|---|---|
| Web (Next.js) | http://localhost:3000 |
| API (FastAPI) | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 (minioadmin / minioadmin) |
| Postgres | localhost:5432 (road / road) |

Создать первого администратора:
```bash
docker compose exec api python -m app.cli create-admin
```

### Вариант 2 — локально без Docker

Нужны Python 3.11+, Node 20+, Postgres 15+, Redis 7+.

```bash
# Backend
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -e '.[dev]'
alembic upgrade head
uvicorn app.main:app --reload

# Frontend (в другом терминале)
cd apps/web
npm install
npm run dev
```

---

## Скрипты

```bash
npm run dev          # docker compose up
npm run stop         # docker compose down
npm run stop:clean   # + удалить volumes
npm run logs         # tail логов всех сервисов
npm run openapi:gen  # регенерировать общие TS-типы из FastAPI OpenAPI
```

---

## VAPID-ключи для Web Push

```bash
npx web-push generate-vapid-keys --json
```

Вписать `publicKey` в `VAPID_PUBLIC_KEY` и `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
а `privateKey` — в `VAPID_PRIVATE_KEY`.

---

## Yandex Maps API key

1. Зарегистрировать ключ в [Кабинете Разработчика Яндекс.Карт](https://developer.tech.yandex.ru/services/).
2. Тип ключа — JavaScript API и HTTP Геокодер.
3. Ограничения по HTTP-referrer для prod (`https://your-domain.com/*`).
4. Вписать в `NEXT_PUBLIC_YANDEX_MAPS_API_KEY`.

Без ключа карта рендерится заглушкой с подсказкой — приложение запустится.

---

## Архитектура

```
┌─────────────────────────────────────────┐
│ Frontend — Next.js 16 (App Router)      │
│  • USER, EXECUTOR, ADMIN, OPERATOR      │
│  • PWA с web push                       │
└──────────────┬──────────────────────────┘
               │ REST + WebSocket (JWT)
┌──────────────▼──────────────────────────┐
│ Backend — FastAPI (Python 3.11)         │
│  • SMS OTP auth                         │
│  • Matching engine (Redis + APScheduler)│
│  • WebSocket gateway                    │
│  • Web Push (VAPID)                     │
└──────────────┬──────────────────────────┘
               │
   ┌───────┬───┴────┬─────────┬──────────┐
   │ PG15  │ Redis  │ MinIO   │ SMS.ru   │
   │       │ (queue,│ (S3)    │ (mock в  │
   │       │  cache)│         │  dev)    │
   └───────┴────────┴─────────┴──────────┘
```

### Ключевые SLA

| Метрика | Цель |
|---|---|
| Список исполнителей после создания заявки | ≤ 10с |
| Обновление позиции на карте | ≤ 10с |
| Окно принятия заявки исполнителем | 60с (server-driven) |
| Радиус проверки прибытия | ≤ 200м (haversine на сервере) |
| Обновление дашборда оператора | ≤ 60с |

### Структура

```
/apps
  /web        — Next.js 16 (App Router + RSC)
  /api        — FastAPI (async + SQLAlchemy 2.0)
/packages
  /shared     — общие TS-типы из OpenAPI
docker-compose.yml
.env.example
/docs
  refs.md     — конспект доков
  design.md   — дизайн-система
```

---

## Тесты

Backend:
```bash
docker compose exec api pytest
```

Frontend:
```bash
npm run test:web
```

E2E (опционально, после реализации):
```bash
npm run e2e
```

---

## Безопасность

- Refresh token — HttpOnly Secure SameSite=Lax cookie
- Access token — только в памяти (Zustand)
- CORS — конкретный origin, не `*`
- Rate limit на `/auth/*` — 10 req/min/IP
- Загрузка файлов — magic-bytes проверка, лимит 5 MB, только image/*, application/pdf
- Yandex Maps key — public, restricted by HTTP-referrer на prod
- OTP коды и токены никогда не логируются

---

## Production deploy

Полный playbook — [docs/deploy.md](docs/deploy.md).

Кратко: docker-compose с production overrides, HTTPS на Caddy, postgres за VPC,
MinIO заменить на AWS S3 / Cloudflare R2, реальные SMS.RU и VAPID ключи.

---

## Что готово (MVP-чеклист)

- [x] Auth: SMS-OTP (USER/EXECUTOR), email+пароль (ADMIN/OPERATOR), invites, JWT с refresh-cookie
- [x] USER: лендинг, регистрация, wizard заказа (3 шага), трекинг с картой, confirm/dispute, review, history, profile
- [x] EXECUTOR: toggle online/offline, входящая заявка с CountdownTimer, активный заказ с геопроверкой прибытия (≤200м), earnings с графиком, profile/services
- [x] ADMIN: dashboard, исполнители (фильтры + действия по верификации), пользователи, invites
- [x] OPERATOR: dashboard с метриками+алертами, карта активных заказов, споры с возвратом
- [x] Matching engine: Redis-очередь, ранжирование, таймер 60с, force-assign, переход к следующему
- [x] WebSocket: tracking (USER), incoming (EXECUTOR), dashboard (OPERATOR)
- [x] Web Push: VAPID, регистрация SW, server send через pywebpush
- [x] PWA: manifest, offline-страница, SW с runtime caching
- [x] Дизайн-система: токены §4, базовые UI-компоненты, mobile-first sticky CTA, a11y focus rings, prefers-reduced-motion
- [x] Тесты: jwt, otp, geo, pricing, phone-validation, matching-pure, Button, OtpInput, CountdownTimer, api

## Что НЕ сделано в MVP (см. [docs/deploy.md §8](docs/deploy.md))

- [ ] Платёжный провайдер (ЮKassa/Stripe) — сейчас интерфейс + mock
- [ ] Реальная загрузка документов исполнителя на S3 — заглушка
- [ ] SMTP для email-инвайтов — сейчас ссылки в stdout
- [ ] PNG-иконки PWA (есть SVG-fallback, см. [docs/deploy.md §6](docs/deploy.md))
- [ ] Интеграционные тесты с pytest-postgresql и Playwright E2E — опционально
