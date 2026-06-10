# RoadHelp — результаты нагрузочного тестирования

**Дата:** 9 июня 2026  
**Инструмент:** [Grafana k6](https://k6.io/) (Docker)  
**Скрипты:** каталог `loadtest/`

---

## Окружение

| Параметр | Значение |
|----------|----------|
| CPU | AMD Ryzen 7 5700G (8 ядер / 16 потоков) |
| RAM | 32 GB |
| Docker memory limit | 15.31 GiB на контейнер |
| ОС | Windows 10 |
| Стек | Docker Compose (`web/docker-compose.yml`) |
| Frontend | **Next.js dev mode** (`npm run dev`) — не production build |

> См. также раздел **Production + VPS 2 GB / 2 vCPU** ниже — актуальные цифры для деплоя.

---

## Сводная таблица

| Сценарий | Нагрузка | RPS / пропускная способность | p95 latency | Ошибки |
|----------|----------|------------------------------|-------------|--------|
| API: Swagger JSON (read) | до 100 VU | **281 req/s** | 130 ms | 0% |
| API: история + активный заказ | до 100 VU | **432 req/s** (216 итераций × 2 запроса) | 6 ms | 0% |
| API: история заказов (stress) | до **350 VU** | **2 587 req/s** | 22 ms | 0% |
| API: OTP login (send + verify) | 50 logins/s | **~49 полных входов/s** | 9 ms (на HTTP-вызов) | 0% |
| API: создание + отмена заказа | до 40 VU | **~31 заказ/s** | 33 ms | 0% |
| Frontend: страницы (dev) | до 60 VU | **~16 page/s** | 2.7 s | 0% |
| Смешанный stress (API + сайт) | до **200 VU** | **~65 req/s** | 8.4 s (смесь) | **10.5%** HTTP* |

\* Ошибки в смешанном тесте — таймауты **Next.js dev** под высокой нагрузкой; API-запросы в том же прогоне проходили успешно (checks 100%).

---

## Детали по сценариям

### 1. API read — Swagger JSON (`01-api-read.js`)

Лёгкий read-only эндпоинт без авторизации.

- 26 013 запросов за 90 с, ramp 0 → 100 VU
- **281 req/s**, median 40 ms, **p95 130 ms**
- 0 ошибок

**Вывод:** статическая отдача OpenAPI — не узкое место.

---

### 2. API read — авторизованные запросы (`02-auth-read.js`)

Каждая итерация: `GET /api/orders/active` + `GET /api/orders/history` с JWT демо-клиента.

- 53 346 HTTP-запросов за 2 мин, до 100 VU
- **432 req/s**, **p95 6 ms**
- 0 ошибок

**Вывод:** чтение из PostgreSQL + JWT-проверка выдерживает **100 одновременных пользователей** с большим запасом.

---

### 3. API write — заказы (`03-order-write.js`)

`POST /api/orders` + `POST .../cancel` (очистка после теста), до 40 уникальных пользователей.

- 2 941 созданных заказов за 90 с
- **~31 заказ/s** (create + cancel = 63 HTTP req/s)
- p95 33 ms, 0 ошибок

**Вывод:** запись в БД + SignalR broadcast — **~30–40 новых заказов в секунду** на этом ПК.

---

### 4. Frontend — Next.js dev (`04-frontend.js`)

Страницы: `/`, `/auth/login`, `/become-executor`. До 60 VU.

- **~16 page/s**
- median 1.2 s, **p95 2.7 s**
- 0 ошибок при изолированном тесте

**Вывод:** узкое место для «живого» демо — **dev-сервер Next.js** (1.8 GB RAM в idle, до 6 GB под нагрузкой). Для защиты достаточно; для production нужен `next build`.

---

### 5. API stress — предел read (`06-api-stress.js`)

Только `GET /api/orders/history`, ramp до **350 VU**.

- **357 955 запросов** за 2m15s
- **2 587 req/s** sustained
- p95 **22 ms**, max 461 ms
- **0% ошибок**

**Вывод:** API на этом компьютере **не достиг предела** даже при 350 виртуальных пользователях на одном эндпоинте.

---

### 6. OTP stress — регистрация/вход (`07-otp-stress.js`)

50 новых входов в секунду (send-otp + verify-otp, уникальные телефоны).

- ~3 001 успешных login за 60 с
- **~49 полных auth-flow/s**
- p95 9 ms на HTTP-вызов, 0 ошибок

**Вывод:** Redis + PostgreSQL (создание user) выдерживают **~50 новых сессий/s**.

---

### 7. Смешанный stress (`05-stress-mixed.js`)

40% history, 30% swagger, 20% homepage, 10% metrics — до **200 VU**.

- 9 311 запросов, **65 req/s**
- **10.54% http_req_failed** — преимущественно таймауты frontend (до 49 s)
- Все checks (API) — 100% success

**Вывод:** при 200 одновременных «пользователей» **API держится**, **сайт в dev-режиме начинает отваливаться**.

---

## Ресурсы контейнеров (после тестов)

| Контейнер | CPU | RAM |
|-----------|-----|-----|
| web-api-1 | ~1% | 359 MB |
| web-web-1 | ~0% | **6.0 GB** (dev) |
| web-postgres-1 | ~0.2% | 225 MB |
| web-redis-1 | ~0.3% | 6.5 MB |

API и БД используют мало ресурсов; основная память уходит на Next.js dev.

---

## Практические выводы для вашего ПК

### Для дипломной защиты (демо)

| Метрика | Безопасный уровень |
|---------|-------------------|
| Одновременных пользователей на сайте | **30–50** |
| Одновременных клиентов API (мобильное/бот) | **100+** |
| Новых заказов в минуту | **500+** (теоретически ~1800) |
| Одновременных SignalR-подключений | не тестировалось отдельно; API запас **>100** |

Один ноутбук с Docker **более чем достаточен** для демо перед комиссией.

### Рекомендуемые лимиты (с запасом)

- **Комфортно:** до 50 одновременных пользователей (сайт + API)
- **API alone:** 300+ одновременных клиентов, **2000+ req/s** на read
- **Запись заказов:** до 30/s без деградации
- **Первым упирается:** Next.js dev server, не backend

### Как улучшить цифры по frontend

```bash
# В Dockerfile заменить npm run dev на production:
npm run build && npm run start
```

Ожидаемый эффект: p95 с 2–3 s до **50–200 ms**, RPS в 5–20× выше.

---

## Как повторить тесты

```bash
cd web
docker compose up -d

# Из корня репозитория (Windows + Docker Desktop):
docker run --rm -v "%cd%\loadtest:/scripts" grafana/k6 run /scripts/01-api-read.js
docker run --rm -v "%cd%\loadtest:/scripts" grafana/k6 run /scripts/06-api-stress.js
```

PowerShell:

```powershell
docker run --rm -v "C:\Users\nkara\Desktop\roadhelp\loadtest:/scripts" grafana/k6 run /scripts/06-api-stress.js
```

---

## Production + VPS 2 GB / 2 vCPU / 20 GB disk

**Дата:** 9 июня 2026  
**Запуск:** `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`  
**Frontend:** Next.js **production** (`output: standalone`, `node server.js`)  
**Bot:** отключён (profile `bot`) — экономия RAM на маленьком VPS

### Лимиты контейнеров (`docker-compose.prod.yml`)

| Сервис | CPU limit | RAM limit |
|--------|-----------|-----------|
| postgres | 0.40 | 384 MB |
| redis | 0.10 | 64 MB |
| minio | 0.15 | 128 MB |
| api | 0.70 | 512 MB |
| web (prod) | 0.50 | 384 MB |
| **Итого** | **~2.0 vCPU** | **~1.47 GB** (+ ~500 MB запас под ОС на 2 GB VPS) |

### Фактическое потребление RAM (после нагрузки)

| Контейнер | RAM used | % от лимита |
|-----------|----------|-------------|
| web | 43 MB | 11% |
| api | 128 MB | 25% |
| postgres | 103 MB | 27% |
| minio | 69 MB | 54% |
| redis | 4 MB | 6% |
| **Сумма** | **~347 MB** | комфортно в 2 GB |

### Диск (~20 GB VPS)

| Компонент | Размер |
|-----------|--------|
| Docker-образы (web+api+postgres+redis+minio) | **~1.3 GB** |
| Данные (pg + minio volumes) | **~50 MB** (пустая БД) |
| Рекомендуемый запас под логи/рост БД | **2–5 GB** |
| **Итого для RoadHelp** | **~3–6 GB** из 20 GB |

### Сводная таблица (production + limits)

| Сценарий | Нагрузка | RPS | p95 | Ошибки |
|----------|----------|-----|-----|--------|
| **Frontend prod** (/, login) | 60 VU | **89 page/s** | **8 ms** | 0% |
| **Смешанный** (API + сайт) | 50 VU | **159 req/s** | **7 ms** | 0% |
| API read (history + active) | 100 VU | **163 req/s** | 2.1 s* | 0.38% |
| Заказы create+cancel | 40 VU | **34 order/s** | 11 ms | 0% |
| API stress (history only) | 350 VU | **138 req/s** | 6.8 s | 1.15% |

\* Хвост latency на 100 VU — API упирается в лимит 512 MB; для VPS **рекомендуется ≤50 одновременных пользователей**.

### Сравнение frontend: dev vs production (на том же ПК)

| Метрика | Dev (`npm run dev`) | **Prod + limits** |
|---------|---------------------|-------------------|
| RPS @ 60 VU | 16 page/s | **89 page/s** (×5.5) |
| p95 latency | 2700 ms | **8 ms** (×340) |
| RAM web-контейнера | до 6 GB | **43 MB** |

### Рекомендации для VPS 2 GB / 2 vCPU

| Параметр | Значение |
|----------|----------|
| Комфортно одновременных пользователей | **40–50** |
| Пик (кратковременно) | **80–100** (возможны редкие таймауты API) |
| Заказов в минуту | **~2000** (теоретически ~34/s) |
| Swap | желательно **1 GB** на VPS |
| Bot | подключать только `--profile bot`, если хватает RAM |

### Запуск production на сервере

```bash
cd web
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
# опционально бот:
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile bot up -d
```

### Нагрузочный тест prod-стека

```powershell
docker run --rm -v "C:\Users\nkara\Desktop\roadhelp\loadtest:/scripts" grafana/k6 run /scripts/08-prod-limited.js
docker run --rm -v "C:\Users\nkara\Desktop\roadhelp\loadtest:/scripts" grafana/k6 run /scripts/04-frontend.js
```

---

## Ограничения методики

- Тесты с одной машины (k6 → `host.docker.internal`) — нет распределённой нагрузки
- SignalR/WebSocket не нагружались отдельно
- MinIO, загрузка файлов, DemoOrderSimulator — не включены
- Frontend dev-тесты — см. раздел «Production + VPS» для актуальных цифр
- Все тесты — локальная сеть, без latency интернета

---

*Сгенерировано автоматически по результатам k6-прогонов.*
