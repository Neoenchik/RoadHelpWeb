# Refs — конспект актуальных доков (по состоянию на 2026-05-05)

Цель файла: краткая сводка ключевых паттернов из официальной документации,
чтобы при написании кода не сверяться каждый раз с интернетом. Источники в конце.

---

## ⚠️ Расхождения с ТЗ — фиксируем версии

| Технология | ТЗ говорит | На сегодня | Решение |
|---|---|---|---|
| Next.js | `next@14` | актуальный stable — **16.x** | Использую **16.x** (App Router идентичен, но улучшен; `params`/`searchParams` теперь `Promise<...>`) |
| Tailwind CSS | `tailwind.config.ts` с `theme.extend.colors` | v4.2 переехал на CSS `@theme` директиву | Использую **Tailwind v3.4** — соответствует `tailwind.config.ts` style ТЗ; v4 поддержит миграцию позже |
| TanStack Query | без версии | **v5** | Использую v5 — синтаксис options-only (`{queryKey, queryFn}`) |
| Yandex Maps | ссылка на v2.1 | в стеке `@yandex/ymaps3-types` (v3) | Использую **v3** + `@yandex/ymaps3-reactify` для React |
| FastAPI | без версии | актуальный (2026) | Использую `pip install "fastapi[standard]"` |

Если что-то из этого не устраивает — скажи до старта шага 2.

---

## Next.js 16 — App Router (актуально на 2026-04-10)

**Файловые конвенции** в `app/`:
- `page.tsx` — публичная UI на маршруте
- `layout.tsx` — обёртка для группы маршрутов; **корневой обязателен** и должен содержать `<html>` и `<body>`
- `loading.tsx` — Suspense fallback автоматически
- `error.tsx` — клиентский error boundary (`'use client'` обязательно)
- `not-found.tsx` — 404
- `route.ts` — REST API endpoints (`GET`, `POST`, ...)
- `[slug]/` — динамический сегмент
- `(group)/` — route group, не влияет на URL
- `@slot/` — parallel/named slot

**Server vs Client:**
- Все компоненты — серверные по умолчанию
- `'use client'` ставим только на компоненты с `useState`/`useEffect`/обработчиками событий или DOM API
- Серверный компонент **не** может импортировать клиентский с состоянием? — может, но через children
- `async` в page/layout разрешён, в server components

**Params в 16.x** теперь Promise — нужен await:
```tsx
export default async function Page(props: PageProps<'/orders/[id]'>) {
  const { id } = await props.params
  // ...
}
```

**Helpers `PageProps`, `LayoutProps`** — глобальные, генерятся `next dev`/`next build`/`next typegen`.

**Server Actions:**
```tsx
'use server'
export async function createOrder(formData: FormData) { /* ... */ }
```

**Metadata API:**
```tsx
export const metadata: Metadata = { title: 'Road Help' }
// или динамически
export async function generateMetadata({ params }) { ... }
```

---

## Tailwind v3.4 (используем)

Установка с Next.js:
```bash
npm install -D tailwindcss@^3.4 postcss autoprefixer
npx tailwindcss init -p
```

`tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: { extend: { colors: { /* …§4.2 ТЗ */ } } },
  plugins: [require('tailwindcss-animate')],
}
export default config
```

`globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Dark mode: класс `dark` на `<html>`, переключение через `next-themes`.

---

## shadcn/ui

```bash
npx shadcn@latest init                # выберет New York / стиль; редактирует tailwind+globals
npx shadcn@latest add button dialog input ...
```

Принципы: компоненты **копируются** в `components/ui/`, не импортируются из npm. Можно переопределять CSS-переменные в `globals.css`. Использовать выборочно — свои `Button`/`Card` сделаю с нуля по дизайн-токенам (§4), а из shadcn возьму базу `Dialog`/`Select`/`Sheet`/`Popover` (Radix-обёртки).

---

## TanStack Query v5

```ts
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } }
})
```

Provider — в корневом client-компоненте `Providers`:
```tsx
'use client'
<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
```

Запрос:
```ts
const { data, isPending, error } = useQuery({
  queryKey: ['orders', 'active'],
  queryFn: () => api.get('/orders/active').then(r => r.data),
})
```

Мутация + инвалидация:
```ts
const m = useMutation({
  mutationFn: (body) => api.post('/orders', body),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
})
```

Best practices:
- queryKey всегда массив, иерархичный: `['orders', orderId]`, `['orders', 'active']`
- staleTime > 0 уменьшает рефетчи (в нашем случае realtime данные — через WS, REST идёт фолбэком)

---

## Yandex Maps v3

Подключение через `<script>` (или динамически в `useEffect`):
```html
<script src="https://api-maps.yandex.ru/v3/?apikey=YOUR_KEY&lang=ru_RU"></script>
```

Базовый код:
```ts
await ymaps3.ready
const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker, YMapLayer }
  = ymaps3
const map = new YMap(container, { location: { center: [37.6, 55.75], zoom: 12 } })
map.addChild(new YMapDefaultSchemeLayer())
map.addChild(new YMapDefaultFeaturesLayer())
map.addChild(new YMapLayer({ id: 'markers', type: 'markers', zIndex: 1800 }))
const marker = new YMapMarker({ coordinates: [37.6, 55.75] }, document.createElement('div'))
map.addChild(marker)
```

**React-интеграция:**
```ts
const reactify = await ymaps3.import('@yandex/ymaps3-reactify')
const { YMap, YMapDefaultSchemeLayer, /*...*/ } = reactify.reactify.entrypoint(ymaps3)
```

Плюс компонент `MapBlock` (§4.9) — обёртка с lazy-load API при первом mount.

**Ограничения:**
- API-ключ ОБЯЗАТЕЛЬНО (без него карта пустая) → если `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` пустой, рендерим заглушку
- HTTP referrer restriction в Кабинете Разработчика — для prod

---

## web-push (VAPID)

Генерация ключей:
```bash
npx web-push generate-vapid-keys --json
# → { "publicKey": "...", "privateKey": "..." }
```

Клиентская подписка:
```ts
const reg = await navigator.serviceWorker.register('/sw.js')
const sub = await reg.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
})
// sub.toJSON() → { endpoint, keys: { p256dh, auth } }
await api.post('/push/subscribe', sub.toJSON())
```

Серверная отправка (Python — `pywebpush`, см. ТЗ §3):
```python
from pywebpush import webpush
webpush(
  subscription_info=sub,  # { endpoint, keys: { p256dh, auth } }
  data=json.dumps(payload),
  vapid_private_key=VAPID_PRIVATE_KEY,
  vapid_claims={"sub": VAPID_SUBJECT}  # mailto:...
)
```

---

## FastAPI (2026)

```bash
pip install "fastapi[standard]" "sqlalchemy[asyncio]" asyncpg redis pywebpush \
  python-jose[cryptography] passlib[bcrypt] alembic apscheduler slowapi
```

Async + SQLAlchemy 2.0:
```python
# database.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as s:
        yield s
```

Auth dependency:
```python
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User: ...

def require_role(*roles: Role):
    def _dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles: raise HTTPException(403)
        return user
    return _dep
```

WebSocket:
```python
@app.websocket("/ws/orders/{order_id}/tracking")
async def ws_tracking(ws: WebSocket, order_id: UUID, token: str = Query(...)):
    user = await verify_token(token)
    await ws.accept()
    # broadcast loop
```

---

## Источники

- [Next.js App Router — Layouts and Pages (16.2.4, 2026-04-10)](https://nextjs.org/docs/app/getting-started/layouts-and-pages)
- [Tailwind CSS Installation (Next.js)](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [shadcn/ui — Overview](https://ui.shadcn.com/docs)
- [TanStack Query v5 — Quick Start](https://tanstack.com/query/v5/docs/framework/react/quick-start)
- [Yandex Maps JS API v3 — Quick Start](https://yandex.com/maps-api/docs/js-api/quickstart.html)
- [Yandex Maps JS API v3 — React Integration](https://yandex.com/maps-api/docs/js-api/dg/concepts/integrations/reactify.html)
- [web-push npm](https://www.npmjs.com/package/web-push)
- [FastAPI](https://fastapi.tiangolo.com/)
