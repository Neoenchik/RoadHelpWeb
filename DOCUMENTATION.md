# RoadHelp — полная документация проекта

**RoadHelp** — платформа экстренной помощи на дороге: веб-приложение, REST API, real-time уведомления и Telegram-бот. Проект подготовлен для демонстрации на защите диплома: работает полностью локально через Docker, без платных внешних сервисов.

**Репозиторий:** https://github.com/Neoenchik/RoadHelpWeb

---

## Содержание

1. [Назначение и возможности](#1-назначение-и-возможности)
2. [Стек технологий](#2-стек-технологий)
3. [Структура репозитория](#3-структура-репозитория)
4. [Архитектура backend](#4-архитектура-backend)
5. [Архитектура frontend](#5-архитектура-frontend)
6. [Telegram-бот](#6-telegram-бот)
7. [Инфраструктура и Docker](#7-инфраструктура-и-docker)
8. [Аутентификация и роли](#8-аутентификация-и-роли)
9. [Жизненный цикл заказа (FSM)](#9-жизненный-цикл-заказа-fsm)
10. [Подбор исполнителя и matching](#10-подбор-исполнителя-и-matching)
11. [Оплата](#11-оплата)
12. [Real-time (SignalR)](#12-real-time-signalr)
13. [Демо-режим](#13-демо-режим)
14. [API — обзор эндпоинтов](#14-api--обзор-эндпоинтов)
15. [Маршруты веб-приложения](#15-маршруты-веб-приложения)
16. [Переменные окружения](#16-переменные-окружения)
17. [Запуск и развёртывание](#17-запуск-и-развёртывание)
18. [Сценарий демонстрации](#18-сценарий-демонстрации)
19. [Тестирование](#19-тестирование)
20. [Что реализовано / ограничения](#20-что-реализовано--ограничения)

---

## 1. Назначение и возможности

Платформа связывает **клиентов**, которым нужна помощь на дороге, с **исполнителями** (эвакуаторы, шиномонтаж, доставка топлива и т.д.), а также предоставляет инструменты **оператору** и **администратору**.

### Роли пользователей

| Роль | Описание |
|------|----------|
| **USER (клиент)** | Создаёт заказы, выбирает исполнителя, отслеживает статус, оплачивает, оставляет отзыв |
| **EXECUTOR (исполнитель)** | Принимает заказы, меняет статусы (в пути → прибыл → работа → завершение), управляет профилем |
| **OPERATOR (оператор)** | Мониторинг активных заказов, метрики, разрешение споров |
| **ADMIN (администратор)** | Управление пользователями, исполнителями, приглашениями, просмотр заказов |

### Типы услуг

- `tow` — эвакуация
- `tire` — шиномонтаж / замена колеса
- `fuel` — доставка топлива
- `lockout` — вскрытие автомобиля
- `battery` — прикурить / замена АКБ

---

## 2. Стек технологий

| Слой | Технологии |
|------|------------|
| **Backend** | .NET 8, ASP.NET Core, Entity Framework Core, PostgreSQL |
| **Кэш / сессии** | Redis (OTP, refresh-токены, skip-листы исполнителей) |
| **Real-time** | SignalR |
| **Файлы** | MinIO (S3-совместимое хранилище для аватаров и документов) |
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS, Zustand, TanStack Query |
| **Карты** | OpenStreetMap + Leaflet (по умолчанию); опционально Яндекс.Карты |
| **Telegram-бот** | Python 3, aiogram 3, httpx, Redis FSM |
| **Контейнеризация** | Docker Compose |
| **Тесты** | xUnit (.NET), Vitest (frontend), pytest (bot) |

---

## 3. Структура репозитория

```
roadhelp/
├── DOCUMENTATION.md          ← этот файл
├── .gitignore
├── web/                      ← основная платформа (API + сайт + Docker)
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── README.md             ← краткий quick start
│   ├── apps/
│   │   ├── RoadHelp.Domain/        — сущности, enum'ы, OrderFsm
│   │   ├── RoadHelp.Application/   — DTO, интерфейсы, MatchingService
│   │   ├── RoadHelp.Infrastructure/— EF Core, JWT, OTP, S3, платежи
│   │   ├── RoadHelp.Api/           — контроллеры, хабы, миграции, демо-сервисы
│   │   ├── RoadHelp.Tests/         — unit/integration тесты
│   │   └── web/                    — Next.js frontend
│   └── packages/
│       └── shared/                 — общие TypeScript-типы
└── project/                  ← Telegram-бот (отдельный Python-проект)
    ├── bot/
    ├── tests/
    ├── Dockerfile
    ├── docker-compose.yml    ← запуск бота отдельно (к API на хосте)
    └── requirements.txt
```

---

## 4. Архитектура backend

Backend построен по принципам **Clean Architecture** — зависимости направлены от API к Domain.

### RoadHelp.Domain

Ядро предметной области:

- **Сущности:** `User`, `ExecutorProfile`, `Order`, `PaymentMethod`, `Review`, `StatusChangeLog`, `PushSubscription`, `Invite`
- **Перечисления:** `Role`, `ServiceType`, `OrderStatus`, `ExecutorOnlineStatus`, `ExecutorVerificationStatus` и др.
- **OrderFsm** — конечный автомат статусов заказа с валидацией переходов и записью в `StatusChangeLog`

### RoadHelp.Application

- DTO для запросов/ответов API
- Интерфейсы сервисов
- `MatchingService` — атомарная блокировка оффера через Redis (подготовлено, в контроллерах пока не используется)

### RoadHelp.Infrastructure

- `ApplicationDbContext` — EF Core + PostgreSQL
- `OtpService` — генерация и проверка OTP в Redis
- `JwtService` — access JWT (15 мин) + refresh-токены (30 дней, HttpOnly cookie)
- `MockPaymentProvider` — имитация оплаты картой
- S3-клиент для MinIO (аватары, документы исполнителей)

### RoadHelp.Api

- REST-контроллеры
- SignalR-хабы (`OrdersHub`, `ExecutorsHub`, `OperatorsHub`)
- EF Core миграции
- **`DemoDataSeeder`** — начальные демо-пользователи при старте в Development
- **`DemoOrderSimulator`** — автоматический сценарий исполнителя «Сергей» для защиты

---

## 5. Архитектура frontend

Next.js-приложение с **App Router** и группами маршрутов:

| Группа | Назначение |
|--------|------------|
| `(public)` | Лендинг, вход, OTP, выбор роли, приглашения |
| `(app)/app` | Личный кабинет клиента |
| `(app)/executor` | Кабинет исполнителя |
| `(app)/operator` | Панель оператора |
| `(app)/admin` | Панель администратора |

### Ключевые модули

| Модуль | Файл | Назначение |
|--------|------|------------|
| API-клиент | `lib/api.ts` | Axios, Bearer JWT, авто-refresh при 401 |
| Auth store | `lib/auth.ts` | Zustand — текущий пользователь и токен |
| SignalR | `lib/socket.ts`, `hooks/useOrderTracking.ts` | Подписка на обновления заказа |
| Карты | `components/domain/MapBlockOsm.tsx` | OSM/Leaflet без API-ключа |
| Защита маршрутов | `components/auth-guard.tsx` | Редирект по роли |

### UI

- Tailwind CSS + Radix UI (диалоги, табы, select)
- Тёмная/светлая тема (`next-themes`)
- Toast-уведомления (`sonner`)
- Графики оператора (`recharts`)

---

## 6. Telegram-бот

Расположен в `project/bot/`. Работает **только через HTTP API** backend — не имеет прямого доступа к БД.

### Команды

| Команда | Описание |
|---------|----------|
| `/start` | Авторизация через `POST /api/bot/auth/login`, приветствие |
| `/help` | Справка, подсказка OTP `1234` |
| `/history` | История заказов клиента |
| `/executor` | Заглушка режима исполнителя |
| `/admin` | Заглушка админ-модуля |

### Модули (часть — задел на будущее)

- `services/api_client.py` — httpx-клиент к API
- `services/geo.py` — расстояние Haversine, проверка прибытия (200 м)
- `keyboards/`, `states/` — клавиатуры и FSM-состояния (не подключены к handlers)

Бот включается в общий `docker compose` в каталоге `web/`. Для работы нужен `BOT_TOKEN` от @BotFather.

---

## 7. Инфраструктура и Docker

### Сервисы (`web/docker-compose.yml`)

| Сервис | Порт | Назначение |
|--------|------|------------|
| **postgres** | 5432 | Основная БД |
| **redis** | 6379 | OTP, refresh, skip-листы |
| **minio** | 9000, 9001 | S3-хранилище (консоль на 9001) |
| **minio-init** | — | Создаёт bucket `roadhelp`, публичный доступ к `avatars/` |
| **api** | 8080 | ASP.NET Core API + Swagger |
| **web** | 3000 | Next.js сайт |
| **bot** | — | Telegram-бот |

### Volumes

- `pg_data` — данные PostgreSQL
- `minio_data` — файлы MinIO
- `web_node_modules`, `web_next_cache` — кэш npm/Next.js (ускоряет пересборку)

При проблемах с зависимостями frontend:

```bash
docker compose down
docker volume rm web_web_node_modules web_web_next_cache
docker compose up -d --build
```

---

## 8. Аутентификация и роли

### Вход по телефону (OTP)

```
Клиент                    API                      Redis
  │  POST /api/auth/send-otp  │                        │
  │ ─────────────────────────►│  сохранить otp:{phone} │
  │                           │ ──────────────────────►│
  │  POST /api/auth/verify-otp│                        │
  │ ─────────────────────────►│  проверить OTP         │
  │                           │  создать/найти User    │
  │  ◄─ access JWT + cookie ──│  выдать refresh        │
```

- OTP хранится в Redis 5 минут, не более 5 попыток за 10 минут
- В Development фиксированный код: **`1234`** (переменная `OTP_DEV_CODE`)
- Access JWT — 15 минут; refresh — 30 дней в HttpOnly cookie
- Обновление: `POST /api/auth/refresh`

### Назначение ролей

| Роль | Как получить |
|------|--------------|
| USER | По умолчанию при первом входе |
| EXECUTOR | При регистрации с `role=EXECUTOR` или через `PATCH /api/users/me` |
| ADMIN / OPERATOR | Через `POST /api/auth/redeem-invite` по токену, созданному админом |

### Авторизация бота

`POST /api/bot/auth/login` с заголовком `X-Bot-Secret`. Создаёт или находит пользователя по `TelegramId`. Роли ADMIN/OPERATOR через бота не выдаются.

---

## 9. Жизненный цикл заказа (FSM)

Класс `OrderFsm` (`RoadHelp.Domain/Services/OrderFsm.cs`) контролирует все переходы:

```
PENDING ──► MATCHED ──► ACCEPTED ──► EN_ROUTE ──► ARRIVED ──► IN_PROGRESS
   │            │            │             │
   │            │            └─────────────┴──► CANCELLED
   │            └──► PENDING (отказ исполнителя)
   └──► CANCELLED

IN_PROGRESS ──► AWAITING_CONFIRMATION ──► COMPLETED
                              │
                              └──► DISPUTED ──► COMPLETED / CANCELLED (оператор)
```

### Статусы

| Статус | Значение |
|--------|----------|
| `PENDING` | Заказ создан, ждёт исполнителя |
| `MATCHED` | Клиент выбрал исполнителя (или исполнитель взял заказ) |
| `ACCEPTED` | Исполнитель подтвердил |
| `EN_ROUTE` | Исполнитель в пути |
| `ARRIVED` | Исполнитель на месте |
| `IN_PROGRESS` | Работа выполняется |
| `AWAITING_CONFIRMATION` | Ждёт подтверждения/оплаты клиента |
| `COMPLETED` | Заказ завершён |
| `CANCELLED` | Отменён |
| `DISPUTED` | Открыт спор |

Каждый переход записывается в таблицу `StatusChangeLog`.

### Два пути завершения

1. **`POST /api/orders/{id}/confirm`** — подтверждение без списания (для быстрого демо)
2. **`POST /api/orders/{id}/pay`** — списание с карты через mock-провайдер → `COMPLETED`

---

## 10. Подбор исполнителя и matching

### Выбор клиентом

1. Клиент создаёт заказ → статус `PENDING`, broadcast `IncomingOrder` всем исполнителям
2. `GET /api/orders/{id}/executors` — список до 10 онлайн-исполнителей с нужным типом услуги и координатами
3. `PATCH /api/orders/{id}` с `{ executor_id }` → `MATCHED`, запуск `DemoOrderSimulator` (если выбран Сергей)

### Действия исполнителя

- `GET /api/executor/orders/incoming` — следующий заказ (MATCHED для него или PENDING по типу услуги)
- `POST .../accept` — принять (PENDING → MATCHED → ACCEPTED или MATCHED → ACCEPTED)
- `POST .../decline` — отказ (PENDING: skip в Redis на 24 ч; MATCHED: сброс исполнителя → PENDING)
- Далее: `en-route` → `arrive` → `start` → `complete` → `AWAITING_CONFIRMATION`

### Redis skip-лист

Ключ `executor:{id}:skipped` — заказы, которые исполнитель отклонил, не показываются снова 24 часа.

---

## 11. Оплата

Реализована **mock-оплата** без реального платёжного шлюза:

1. При первом входе клиенту автоматически добавляется карта **Visa •••• 4242**
2. `PaymentMethodsController` и `DemoDataSeeder` создают карту с `ProviderToken = mock_*`
3. `MockPaymentProvider` всегда возвращает успех, пишет транзакцию в лог
4. `POST /api/orders/{id}/pay` при статусе `AWAITING_CONFIRMATION`:
   - Списывает с карты по умолчанию
   - Устанавливает `TransactionId = tx_{guid}`
   - Переводит заказ в `COMPLETED`

Страница управления картами: `/app/payment`.

---

## 12. Real-time (SignalR)

| Hub | URL | Кто подключается | События |
|-----|-----|------------------|---------|
| **OrdersHub** | `/ws/orders/tracking` | Клиент (JWT) | `OrderUpdated` — смена статуса заказа |
| **ExecutorsHub** | `/ws/executor/incoming` | Исполнитель | `IncomingOrder` — новый заказ |
| **OperatorsHub** | `/ws/operator/dashboard` | Оператор/админ | Обновления дашборда |

Клиент подписывается на группу `order:{id}` через метод `SubscribeToOrder`. JWT передаётся в query `access_token` или заголовке Authorization.

Frontend: `hooks/useOrderTracking.ts` — автоматическое переподключение и обновление UI.

---

## 13. Демо-режим

### DemoDataSeeder

При первом запуске API в **Development** создаются пользователи (идемпотентно — повторный запуск не дублирует данные):

| Роль | Телефон | Имя | Особенности |
|------|---------|-----|-------------|
| Админ | +79000000001 | Админ Демо | — |
| Оператор | +79000000002 | Оператор Демо | — |
| Клиент | +79000000003 | Клиент Демо | Демо-карта, история заказов |
| Исполнитель | +79000000004 | Иван Мастер | ONLINE, Москва, GAZель Next |
| Исполнитель | +79000000005 | Сергей Эвакuator | ONLINE, Москва, Ford Transit, **авто-сценарий** |

**OTP для всех телефонов: `1234`**

Дополнительно: один завершённый заказ в истории клиента (эвакуация, 1500 ₽).

### DemoOrderSimulator

Автоматически проигрывает полный сценарий исполнителя **Сергея** (+79000000005) после того, как клиент выберет его в заказе. Работает **только в Development**.

| Шаг | Задержка | Действие | Статус |
|-----|----------|----------|--------|
| 1 | 5 сек | Принять заказ | ACCEPTED |
| 2 | 8 сек | Выехать | EN_ROUTE |
| 3 | 8 сек | Прибыть | ARRIVED |
| 4 | 6 сек | Начать работу | IN_PROGRESS |
| 5 | 10 сек | Завершить | AWAITING_CONFIRMATION |

**Итого ~37 сек** после выбора исполнителя. Клиент видит обновления в реальном времени без второго браузера.

Если выбран другой исполнитель (Иван) — авто-сценарий не запускается; нужно действовать вручную через `/executor`.

---

## 14. API — обзор эндпоинтов

Swagger UI: http://localhost:8080/swagger (Development)

### Auth — `/api/auth`

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/send-otp` | Отправить OTP |
| POST | `/verify-otp` | Проверить OTP, получить JWT |
| POST | `/refresh` | Обновить access token |
| POST | `/redeem-invite` | Активировать приглашение (ADMIN/OPERATOR) |
| POST | `/logout` | Выход, отзыв refresh |

### Заказы (клиент) — `/api/orders`

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/` | Создать заказ |
| GET | `/{id}` | Детали заказа |
| GET | `/active` | Текущий активный заказ |
| GET | `/{id}/executors` | Список исполнителей |
| PATCH | `/{id}` | Выбрать исполнителя |
| POST | `/{id}/cancel` | Отменить |
| POST | `/{id}/confirm` | Подтвердить без оплаты |
| POST | `/{id}/pay` | Оплатить и завершить |
| POST | `/{id}/dispute` | Открыть спор |
| POST | `/{id}/review` | Оставить отзыв |
| GET | `/history` | История заказов |

### Исполнитель — `/api/executor`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/me` | Профиль |
| PATCH | `/me` | Обновить профиль |
| PATCH | `/me/status` | ONLINE / OFFLINE |
| PATCH | `/me/location` | Координаты |
| GET | `/orders/incoming` | Входящий заказ |
| GET | `/orders/active` | Активный заказ |
| POST | `/orders/{id}/accept` | Принять |
| POST | `/orders/{id}/decline` | Отклонить |
| POST | `/orders/{id}/en-route` | В пути |
| POST | `/orders/{id}/arrive` | Прибыл |
| POST | `/orders/{id}/start` | Начать работу |
| POST | `/orders/{id}/complete` | Завершить работу |
| GET | `/earnings` | Заработок |

### Пользователь — `/api/users`

| Метод | Путь | Описание |
|-------|------|----------|
| PATCH | `/me` | Обновить профиль / роль |
| POST | `/me/avatar` | Загрузить аватар |

### Платёжные методы — `/api/users/me/payment-methods`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Список карт |
| POST | `/` | Добавить demo-карту |

### Админ — `/api/admin`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/executors` | Список исполнителей |
| PATCH | `/executors/{id}/verify` | Верифицировать |
| PATCH | `/executors/{id}/suspend` | Заблокировать |
| GET | `/users` | Пользователи |
| PATCH | `/users/{id}` | Сменить роль |
| GET/POST | `/invites` | Приглашения |
| GET | `/orders` | Все заказы |

### Оператор — `/api/operator`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/metrics` | Метрики дашборда |
| GET | `/active-orders` | Активные заказы |
| GET | `/disputes` | Споры |
| PATCH | `/disputes/{id}` | Разрешить спор |

### Bot — `/api/bot/auth`

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/login` | Авторизация Telegram-пользователя |

---

## 15. Маршруты веб-приложения

### Публичные

| URL | Страница |
|-----|----------|
| `/` | Лендинг |
| `/auth/login` | Ввод телефона |
| `/auth/verify` | Ввод OTP |
| `/auth/role` | Выбор роли при регистрации |
| `/auth/invite` | Активация приглашения |
| `/become-executor` | Стать исполнителем |

### Клиент (`USER`)

| URL | Страница |
|-----|----------|
| `/app` | Главная, активный заказ |
| `/app/new` | Создание заказа |
| `/app/orders/[id]` | Отслеживание, выбор исполнителя |
| `/app/orders/[id]/confirm` | Подтверждение выполнения |
| `/app/orders/[id]/review` | Отзыв |
| `/app/history` | История |
| `/app/profile` | Профиль |
| `/app/payment` | Платёжные методы |

### Исполнитель (`EXECUTOR`)

| URL | Страница |
|-----|----------|
| `/executor` | Дашборд, входящие заказы |
| `/executor/orders/[id]` | Управление заказом |
| `/executor/profile` | Профиль |
| `/executor/verification` | Загрузка документов |
| `/executor/history` | История |
| `/executor/earnings` | Заработок |

### Оператор (`OPERATOR`, `ADMIN`)

| URL | Страница |
|-----|----------|
| `/operator` | Метрики и графики |
| `/operator/active` | Активные заказы на карте |
| `/operator/disputes` | Список споров |
| `/operator/disputes/[order_id]` | Разрешение спора |

### Админ (`ADMIN`)

| URL | Страница |
|-----|----------|
| `/admin` | Обзор |
| `/admin/users` | Пользователи |
| `/admin/executors` | Исполнители |
| `/admin/executors/[id]` | Карточка исполнителя |
| `/admin/invites` | Приглашения |

---

## 16. Переменные окружения

Скопируйте `web/.env.example` → `web/.env`:

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | — | PostgreSQL (есть defaults) |
| `JWT__Secret` | **Да (prod)** | Секрет подписи JWT |
| `JWT__Issuer`, `JWT__Audience` | — | Claims JWT |
| `BOT_TOKEN` | Для бота | Токен @BotFather |
| `BOT_SECRET` | Для бота | Общий секрет API ↔ bot |
| `ADMIN_IDS` | — | Telegram ID админов через запятую |
| `NEXT_PUBLIC_API_URL` | — | URL API для frontend |
| `NEXT_PUBLIC_WS_URL` | — | URL SignalR |
| `APP__BaseUrl` | — | Базовый URL для ссылок в приглашениях |
| `OTP_DEV_CODE` | Dev | Фиксированный OTP (default: `1234`) |
| `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` | — | Яндекс.Карты вместо OSM |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | — | Web Push (опционально) |

---

## 17. Запуск и развёртывание

### Требования

- Docker Desktop (Windows/macOS) или Docker + Compose (Linux)
- 4+ GB RAM для контейнеров

### Быстрый старт

```bash
cd web
cp .env.example .env
docker compose up -d --build
```

### Адреса после запуска

| Сервис | URL |
|--------|-----|
| Сайт | http://localhost:3000 |
| API + Swagger | http://localhost:8080/swagger |
| MinIO Console | http://localhost:9001 (minioadmin / minioadmin) |

### Локальная разработка без Docker

**Backend:**

```bash
cd web/apps/RoadHelp.Api
# PostgreSQL и Redis должны быть запущены
dotnet run
```

**Frontend:**

```bash
cd web/apps/web
npm install
npm run dev
```

**Bot:**

```bash
cd project
pip install -r requirements.txt
python -m bot.main
```

---

## 18. Сценарий демонстрации

Рекомендуемое время: **5–7 минут**.

### Шаг 1 — Лендинг

Откройте http://localhost:3000, покажите описание сервиса.

### Шаг 2 — Клиент создаёт заказ

1. Вход: `+79000000003`, OTP `1234`
2. «Создать заказ» → выберите тип услуги, укажите адрес на карте
3. На странице заказа — список исполнителей → выберите **Сергея**

### Шаг 3 — Авто-сценарий

Подождите ~40 сек. Статусы меняются автоматически: принят → в пути → прибыл → работа → ожидает подтверждения. Обновления видны на карте и в панели статуса (SignalR).

### Шаг 4 — Оплата и отзыв

1. «Подтвердить и оплатить» → mock Visa 4242
2. Оставьте отзыв (звёзды + комментарий)

### Шаг 5 — Оператор

Вход: `+79000000002`, OTP `1234` → `/operator` — метрики, график заказов, карта активных.

### Шаг 6 — Админ

Вход: `+79000000001` → `/admin` — пользователи, исполнители, создание приглашения.

### Шаг 7 — Telegram (опционально)

Если настроен `BOT_TOKEN`: `/start`, `/history` в боте.

### Ручной сценарий через исполнителя

Вход `+79000000005` → `/executor` → принять заказ и пройти статусы вручную (если не выбирали Сергея на шаге 2).

---

## 19. Тестирование

### Backend (.NET)

```bash
cd web/apps/RoadHelp.Tests
dotnet test
```

**27 тестов:** FSM, OTP, JWT, Auth, Bot auth, Orders, Executors, Payment, Operator, EF entities.

### Frontend (Vitest)

```bash
cd web/apps/web
npm install
npm test
```

**10 тестов:** API client, OtpInput, CountdownTimer, Button.

### Bot (pytest)

```bash
docker exec web-bot-1 python -m pytest tests/ -q
# или локально:
cd project && pytest tests/ -q
```

**11 тестов:** api_client, geo (Haversine, arrival).

### Покрытие — пробелы

Не покрыты тестами: SignalR, DemoOrderSimulator, DemoDataSeeder, admin CRUD, invite flow, S3 upload, большинство страниц frontend.

---

## 20. Что реализовано / ограничения

### Реализовано

- [x] Полный цикл заказа с FSM и аудит-логом
- [x] 4 роли: клиент, исполнитель, оператор, админ
- [x] OTP-авторизация по телефону
- [x] JWT + refresh tokens
- [x] Real-time обновления через SignalR
- [x] Карты OpenStreetMap без API-ключа
- [x] Mock-оплата картой
- [x] Демо-данные и авто-сценарий для защиты
- [x] Панели оператора и администратора
- [x] Telegram-бот (базовые команды)
- [x] Docker Compose — один `docker compose up`
- [x] Unit/integration тесты (backend, frontend, bot)
- [x] MinIO для файлов (аватары, документы)
- [x] Приглашения ADMIN/OPERATOR
- [x] Споры и их разрешение оператором
- [x] Отзывы и рейтинг исполнителей

### Ограничения (осознанные для демо)

| Область | Статус |
|---------|--------|
| SMS / реальный OTP | Не подключено — фиксированный код `1234` |
| Платёжный шлюз | Mock — всегда успех |
| Matching по расстоянию | Список без сортировки по km |
| MatchingService (Redis lock) | Реализован, не вызывается из API |
| Telegram-бот | Базовые команды; FSM и клавиатуры — заготовки |
| Web Push | Эндпоинт есть, UI минимален |
| Яндекс.Карты | Опционально через env |
| Production hardening | Dev defaults для JWT, MinIO, OTP |

---

## Диаграмма потока данных

```
┌─────────────┐     HTTP/WS      ┌──────────────┐
│  Next.js    │ ◄──────────────► │  RoadHelp    │
│  :3000      │                  │  API :8080   │
└─────────────┘                  └──────┬───────┘
                                      │
         ┌────────────────────────────┼────────────────────────┐
         │                            │                        │
         ▼                            ▼                        ▼
  ┌─────────────┐            ┌─────────────┐           ┌─────────────┐
  │ PostgreSQL  │            │    Redis    │           │    MinIO    │
  │   :5432     │            │   :6379     │           │  :9000/9001 │
  └─────────────┘            └─────────────┘           └─────────────┘

┌─────────────┐     HTTP         ┌──────────────┐
│  Telegram   │ ─────────────► │  /api/bot/*  │
│  Bot        │                │              │
└─────────────┘                └──────────────┘
```

---

*Документ актуален для коммита с полным демо-проектом RoadHelp. Краткий quick start — в [web/README.md](web/README.md).*
