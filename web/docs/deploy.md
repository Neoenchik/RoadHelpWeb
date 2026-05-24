# Production deploy

Этот документ — playbook для развёртывания Road Help в продакшене.

## 1. Инфраструктура

Минимальный набор:

| Сервис | Рекомендация |
|---|---|
| Application server | 1× VM, 4 vCPU / 8 GB RAM (web + api в Docker) |
| PostgreSQL 15 | managed (RDS / DigitalOcean / Yandex Cloud), 2 vCPU / 4 GB |
| Redis 7 | managed, 1 GB (queue + cache) |
| Object storage | AWS S3 / Cloudflare R2 (заменяет MinIO из dev) |
| HTTPS reverse-proxy | Caddy / nginx с Let's Encrypt |
| DNS | Cloudflare |

## 2. Подготовка `.env` для prod

Скопировать `.env.example` → `.env.production`, изменить:

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.roadhelp.com
NEXT_PUBLIC_WS_URL=wss://api.roadhelp.com

DATABASE_URL=postgresql+asyncpg://user:pass@db.host:5432/roadhelp
REDIS_URL=rediss://:pass@redis.host:6379/0
SECRET_KEY=<32 случайных байта в base64>

ALLOWED_ORIGINS=https://roadhelp.com

SMS_PROVIDER=sms_ru
SMS_RU_API_ID=<реальный api_id>

S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=roadhelp-prod
S3_ACCESS_KEY=<AWS access key>
S3_SECRET_KEY=<AWS secret key>

VAPID_PUBLIC_KEY=<сгенерированный>
VAPID_PRIVATE_KEY=<сгенерированный>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<тот же public>

NEXT_PUBLIC_YANDEX_MAPS_API_KEY=<реальный ключ с HTTP-referrer restriction>

INVITE_BASE_URL=https://roadhelp.com
ADMIN_BOOTSTRAP_EMAIL=admin@roadhelp.com
```

**Сгенерировать секреты:**
```bash
# SECRET_KEY (32 байта)
openssl rand -base64 32

# VAPID
npx web-push generate-vapid-keys --json
```

## 3. Запуск через docker-compose (production)

Отредактируйте `docker-compose.prod.yml` (не публикуем порты postgres/redis):

```yaml
services:
  api:
    build:
      context: ./apps/api
    env_file: .env.production
    restart: unless-stopped
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
  web:
    build:
      context: ./apps/web
    env_file: .env.production
    restart: unless-stopped
    command: sh -c "npm run build && npm run start"
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
volumes:
  caddy_data:
```

**Caddyfile:**
```
roadhelp.com {
    reverse_proxy web:3000
    encode zstd gzip
}

api.roadhelp.com {
    reverse_proxy api:8000
    @ws header Connection *Upgrade*
    handle @ws { reverse_proxy api:8000 }
}
```

## 4. Миграции и первый администратор

```bash
docker compose -f docker-compose.prod.yml exec api alembic upgrade head
docker compose -f docker-compose.prod.yml exec api python -m app.cli create-admin
```

## 5. Чек-лист безопасности перед продом

- [ ] `SECRET_KEY` сгенерирован случайно (не из примера)
- [ ] HTTPS на всех доменах (HSTS включён в Caddy)
- [ ] Refresh-cookie с флагом `Secure` (срабатывает автоматически когда `node_env=production`)
- [ ] CORS `ALLOWED_ORIGINS` указан строго, без `*`
- [ ] `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` ограничен HTTP-referrer'ом на prod-домен
- [ ] Postgres за VPC, не торчит в публичный интернет
- [ ] Redis с паролем (rediss://)
- [ ] S3-bucket с ACL «private» для документов исполнителей; «public-read» только для аватаров
- [ ] Бэкапы PostgreSQL — хотя бы раз в сутки
- [ ] Проверена работа `/healthz` и автоматическое восстановление контейнеров

## 6. PNG-иконки PWA

В `/apps/web/public/` нужно добавить:
- `icon-192.png` — 192×192
- `icon-512.png` — 512×512
- `icon-maskable-512.png` — 512×512, maskable (с safe-zone 80%)
- `badge-72.png` — 72×72 (монохром, для Android push)

Сгенерировать из `icon.svg` можно через [maskable.app/editor](https://maskable.app/editor) или CLI:
```bash
npx pwa-asset-generator apps/web/public/icon.svg apps/web/public --type png
```

## 7. Мониторинг

В первой версии — минимум:
- Healthcheck на `/healthz` через uptime-monitor (UptimeRobot / Better Uptime)
- Логи api/web в stdout → собирать docker driver (loki/datadog)
- Алерт на cancel_rate > 0.20 уже встроен (виден в operator dashboard)

## 8. Что НЕ доделано в MVP и нужно перед prod

- [ ] Платёжный провайдер (ЮKassa / Stripe) — сейчас mock
- [ ] Загрузка документов на S3 (presigned URLs) — заглушка в `/executor/verification`
- [ ] SMTP для email-инвайтов — сейчас ссылки выводятся в stdout
- [ ] PNG-иконки PWA (см. п. 6)
- [ ] E2E-тесты Playwright (опционально, см. README)

## 9. Lighthouse audit

После деплоя:
```bash
npx @lhci/cli@latest autorun --collect.url=https://roadhelp.com
```

Цели по ТЗ §17:
- Performance ≥ 90
- Accessibility ≥ 95
- SEO ≥ 90

Если Performance проседает — проверить:
- `next/font` подгружается с `display: swap` (уже так)
- Картинки используют `next/image` (на лендинге сейчас SVG-иконки — это уже оптимально)
- Yandex Maps скрипт не блокирует рендер лендинга (он не подгружается без интеракции)
