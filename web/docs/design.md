# Road Help — Дизайн-система

> Это контракт. Любой компонент, который не сверен с этим документом — отклоняется.
> Источник истины: §4 ТЗ. Здесь — то же самое в формате, удобном для разработки.

---

## 1. Бренд

- **Название:** Road Help
- **Wordmark:** Inter ExtraBold, 28px на лендинге, tracking-tight
- **Иконка приложения:** оранжевый круг (`primary-500`) с белым символом руля внутри
- **Тон голоса:** дружелюбный, без канцелярита. «Едем!» вместо «Подтверждено», «Что случилось?» вместо «Выберите тип услуги».
- **Эмоциональный посыл:** спокойная уверенность. Пользователь застрял — он расстроен. Интерфейс должен снижать тревогу: тёплые цвета, мягкие скругления, никаких длинных текстов.

---

## 2. Цвета

### Бренд

| Токен | HEX | Применение |
|---|---|---|
| `primary-50` | `#FFF4ED` | фон бейджей, hover на light |
| `primary-100` | `#FFE6D5` | мягкие акценты |
| `primary-200` | `#FFC9A8` | — |
| `primary-300` | `#FF9F70` | вторичные иллюстрации |
| `primary-400` | `#FF7A3D` | hover state CTA |
| **`primary-500`** | **`#FF6B35`** | **главный CTA, иконки, акценты** |
| `primary-600` | `#ED5320` | active state |
| `primary-700` | `#C53D17` | text-on-light |
| `primary-800` | `#9C3215` | — |
| `primary-900` | `#7E2C16` | — |
| `accent-400` | `#FFD23F` | бейдж «Online», лимонный акцент |
| `accent-500` | `#F5B800` | hover на accent |

### Семантика

| Токен | HEX |
|---|---|
| `success` | `#10B981` |
| `warning` | `#F59E0B` |
| `danger` | `#EF4444` |

### Surfaces (light theme)

| Токен | HEX |
|---|---|
| `surface-base` | `#FFFFFF` |
| `surface-raised` | `#F8FAFC` |
| `surface-sunken` | `#F1F5F9` |
| `surface-overlay` | `rgba(15, 23, 42, 0.6)` |

### Ink (текст и линии)

| Токен | HEX | Применение |
|---|---|---|
| `ink-900` | `#0F172A` | основной текст |
| `ink-700` | `#334155` | вторичный |
| `ink-500` | `#64748B` | подсказки, плейсхолдеры |
| `ink-300` | `#CBD5E1` | разделители, бордеры |
| `ink-100` | `#F1F5F9` | hover-подложки |

### Dark theme

Инвертированные surfaces:
- `surface-base` → `ink-900` (`#0F172A`)
- `surface-raised` → `#1E293B`
- `surface-sunken` → `#0B1220`
- text → `ink-100`

`primary` остаётся тем же — он одинаково читается на обоих фонах. Контраст текста проверять — WCAG AA.

---

## 3. Типографика

**Шрифт:** Inter Variable (`next/font/google` → loaded once в root layout).

| Токен | Size/Line | Weight | Tracking | Применение |
|---|---|---|---|---|
| `text-display` | 48 / 56 | 800 | -0.025em | hero лендинга |
| `text-h1` | 32 / 40 | 700 | -0.02em | заголовки разделов |
| `text-h2` | 24 / 32 | 700 | -0.015em | — |
| `text-h3` | 20 / 28 | 600 | -0.01em | — |
| `text-body` | 16 / 24 | 400 | 0 | основной текст |
| `text-caption` | 14 / 20 | 500 | 0 | вторичный |
| `text-micro` | 12 / 16 | 500 | 0.01em | бейджи, лейблы |

Регистрация в `tailwind.config.ts → theme.extend.fontSize`:
```ts
fontSize: {
  display: ['3rem', { lineHeight: '3.5rem', fontWeight: '800', letterSpacing: '-0.025em' }],
  h1: ['2rem', { lineHeight: '2.5rem', fontWeight: '700', letterSpacing: '-0.02em' }],
  h2: ['1.5rem', { lineHeight: '2rem', fontWeight: '700', letterSpacing: '-0.015em' }],
  h3: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600', letterSpacing: '-0.01em' }],
  body: ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
  caption: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
  micro: ['0.75rem', { lineHeight: '1rem', fontWeight: '500', letterSpacing: '0.01em' }],
}
```

---

## 4. Скругления

| Tailwind class | Pixels | Применение |
|---|---|---|
| `rounded-md` | 8px | мелкие чипы, теги |
| `rounded-lg` | 12px | поля ввода, кнопки sm |
| `rounded-xl` | 16px | карточки списка, инпуты md |
| `rounded-2xl` | 20px | основные карточки на главной |
| `rounded-3xl` | 28px | большие модалы, bottom sheet |
| `rounded-full` | ∞ | аватары, FAB, pill-кнопки |

`tailwind.config.ts → theme.extend.borderRadius`:
```ts
borderRadius: {
  md:  '8px',
  lg:  '12px',
  xl:  '16px',
  '2xl': '20px',
  '3xl': '28px',
}
```

---

## 5. Тени

| Токен | Значение | Применение |
|---|---|---|
| `shadow-soft` | `0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06)` | карточки, дефолтная глубина |
| `shadow-pop` | `0 4px 8px rgba(15,23,42,0.08), 0 12px 32px rgba(15,23,42,0.12)` | поднятые модалы, попапы |
| `shadow-glow` | `0 8px 24px rgba(255,107,53,0.35)` | главный CTA `Найти мастера` |
| `shadow-sheet` | `0 -8px 32px rgba(15,23,42,0.16)` | sticky-кнопка снизу, bottom sheet |

```ts
boxShadow: {
  soft:  '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06)',
  pop:   '0 4px 8px rgba(15,23,42,0.08), 0 12px 32px rgba(15,23,42,0.12)',
  glow:  '0 8px 24px rgba(255,107,53,0.35)',
  sheet: '0 -8px 32px rgba(15,23,42,0.16)',
}
```

---

## 6. Spacing & Grid

8-точечная сетка. Tailwind дефолты подходят (4=1rem=16px и т.д.). Используем кратные 8: `p-2`, `p-4`, `p-6`, `p-8`, `p-12`.

**Контентные ширины:**
- `max-w-screen-sm` (640px) — формы, центрированный контент
- `max-w-screen-lg` (1024px) — карточные дашборды
- `max-w-screen-2xl` (1536px) — admin/operator панели

**Отступы экрана (mobile):**
- Боковые: `px-4` (16px) — стандарт
- Вертикальный ритм карточек: `space-y-4`
- Sticky bottom CTA: `pb-[env(safe-area-inset-bottom)]`

---

## 7. Иконки

- Библиотека: **`lucide-react`** (единственный набор)
- Размеры: `16`, `20`, `24`, `32` (только эти)
- Stroke: **`1.75`** (по умолчанию `2` — слишком жирно)

Обёртка `<Icon name="map-pin" size={24} />` — обёртка над lucide с дефолтным `strokeWidth={1.75}`. Решает unified look сразу везде.

---

## 8. Анимации

Через **Framer Motion**. Дефолты:

```ts
const ease = [0.22, 1, 0.36, 1] as const  // мягкий out
const dur  = 0.24                          // 240ms
```

**Пресеты:**
- **Появление карточки:** `initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease }}`
- **Hover на интерактиве:** `whileHover={{ scale: 1.02 }} transition={{ duration: 0.12 }}`
- **Bottom sheet:** `initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}`
- **Toast (sonner):** дефолты `sonner`, переопределяем только цвета

**Reduced motion:**
```tsx
const reduce = useReducedMotion()
<motion.div animate={reduce ? false : { ... }} />
```

`prefers-reduced-motion: reduce` ОБЯЗАТЕЛЬНО уважается на всех motion-компонентах.

---

## 9. Компоненты — каталог `components/ui/`

Каждый компонент:
- TypeScript, `forwardRef` где имеет смысл
- `cn()` helper из `lib/utils.ts` для merge классов (`clsx` + `tailwind-merge`)
- a11y: правильный role, aria-label, focus-visible:ring
- Mobile-first: тап-цели ≥ 44×44

| Компонент | Файл | Зависимости |
|---|---|---|
| `Button` | `button.tsx` | — |
| `IconButton` | `icon-button.tsx` | Button |
| `Input` | `input.tsx` | — |
| `OtpInput` | `otp-input.tsx` | — (4 цифры, auto-advance) |
| `Select` | `select.tsx` | `@radix-ui/react-select` |
| `Card` | `card.tsx` | — |
| `Sheet` | `sheet.tsx` | `vaul` (drag-to-close) или Radix Dialog |
| `Dialog` | `dialog.tsx` | `@radix-ui/react-dialog` |
| `Drawer` | `drawer.tsx` | Radix Dialog (с side variant) |
| `Avatar` | `avatar.tsx` | `@radix-ui/react-avatar` |
| `Badge` | `badge.tsx` | — |
| `Stepper` | `stepper.tsx` | — |
| `Toast` | `toast.tsx` | `sonner` (re-export с пресетами) |
| `EmptyState` | `empty-state.tsx` | — |
| `Skeleton` | `skeleton.tsx` | tailwindcss-animate |
| `Spinner` | `spinner.tsx` | — |
| `MapBlock` | `map-block.tsx` | Yandex Maps v3 |
| `Chip` | `chip.tsx` | — |
| `Tabs` | `tabs.tsx` | `@radix-ui/react-tabs` |
| `RatingStars` | `rating-stars.tsx` | — |
| `CountdownTimer` | `countdown-timer.tsx` | framer-motion (svg circle) |

### 9.1 Button — спецификация

**Варианты:**
- `primary` — `bg-primary-500 text-white hover:bg-primary-400 active:bg-primary-600 shadow-glow`
- `secondary` — `bg-surface-raised text-ink-900 border border-ink-300 hover:bg-surface-sunken`
- `ghost` — `bg-transparent text-ink-900 hover:bg-surface-sunken`
- `danger` — `bg-danger text-white hover:opacity-90`

**Размеры:**
- `sm` — `h-9 px-3 text-caption rounded-lg`
- `md` — `h-11 px-4 text-body rounded-lg` (default)
- `lg` — `h-12 px-5 text-body rounded-xl`
- `xl` — `h-14 px-6 text-body font-semibold rounded-xl` (sticky CTA)

**Loading:** `disabled` + `<Spinner />` слева от label.

**Focus:** `focus-visible:ring-2 ring-primary-500 ring-offset-2 ring-offset-surface-base`

### 9.2 Input — спецификация

```
┌──────────────────────────────────┐
│ Лейбл                            │ ← text-caption ink-700
│ ┌──────────────────────────────┐ │
│ │ [icon] значение [действие]   │ │ ← h-12 rounded-xl bg-surface-base border ink-300
│ └──────────────────────────────┘ │   focus: border-primary-500 ring-2 ring-primary-100
│ Подсказка / ошибка              │ ← text-micro
└──────────────────────────────────┘
```

Props: `label`, `error`, `hint`, `prefix` (icon), `suffix` (icon/button), все стандартные `<input>` пропсы.

### 9.3 OtpInput — спецификация

4 ячейки `48×56`, текст center, `text-h2`, `font-semibold`. Auto-advance на ввод, backspace на пустом — назад. Paste 4 цифр распределяется по ячейкам.

Состояния:
- empty: `border-ink-300`
- focused: `border-primary-500 ring-4 ring-primary-100`
- filled: `border-primary-500 bg-primary-50`
- error: `border-danger`

### 9.4 CountdownTimer — спецификация

SVG-круг радиусом 56px:
- track: `stroke-ink-300` 4px
- progress: `stroke-primary-500` 4px, `stroke-linecap: round`, `stroke-dasharray` рассчитывается через framer-motion
- центр: цифра `text-display` `tabular-nums`
- При `seconds <= 10` — цвет меняется на `danger`
- Нативный `requestAnimationFrame`, шаг ≤ 100ms

API: `<CountdownTimer deadline={ISOString} onExpire={() => ...} />`

### 9.5 MapBlock — спецификация

```tsx
<MapBlock
  center={[37.6, 55.75]}
  zoom={12}
  markers={[{ id, coordinates, kind: 'executor' | 'order' | 'self' }]}
  route={{ from: [...], to: [...] }}
  onLocate={(coords) => ...}
  onCenterChange={(coords) => ...}
  height="100%"
/>
```

- При отсутствии `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` — рендерим заглушку: серый паттерн + текст «Карта появится после добавления API-ключа в .env»
- API подгружается **один раз** на уровне приложения (через утилиту `lib/yandex-maps.ts` с promise-cache)
- Маркеры — кастомные DOM-элементы (svg иконки из lucide) для корректной стилизации

---

## 10. Mobile-first правила

- **Тап-цели:** минимум `44×44px` (≈ `min-h-11 min-w-11`)
- **Sticky bottom CTA:** обязательно на всех wizard-экранах
  ```tsx
  <div className="fixed inset-x-0 bottom-0 bg-surface-base shadow-sheet
                  px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
    <Button size="xl" variant="primary" className="w-full">CTA</Button>
  </div>
  ```
- **Safe area:** `env(safe-area-inset-bottom)` на iOS (notch и home indicator)
- **No hover-only critical actions** — всё, что критично, должно работать тапом
- **Полный экран wizard:** `min-h-svh` (small viewport height) — корректно учитывает мобильные toolbars

---

## 11. Доступность (WCAG AA)

- **Контраст текста:** ≥ 4.5:1 для body, ≥ 3:1 для крупного (≥ 18px bold или ≥ 24px regular)
- **Семантика:** `<button>` для действий, `<a>` для навигации, `role="…"` только когда нет нативного элемента
- **ARIA:** `aria-label` для всех IconButton, `aria-live="polite"` для toast и статуса заказа
- **Focus rings:** видимы на всех интерактивных элементах: `focus-visible:ring-2 ring-primary-500 ring-offset-2`
- **Клавиатурная навигация:** Tab/Shift+Tab по интерактивам, Esc закрывает modals/sheets, Enter активирует кнопки
- **Tab trap** в Sheet/Dialog (Radix делает это сам)
- **Skip-to-content** на лендинге для screen readers

---

## 12. Что НЕЛЬЗЯ делать

- ❌ хардкод цветов (`#fff`, `text-red-500`, `bg-[#FF6B35]`)
- ❌ скругления вне шкалы §4 (`rounded-[5px]`)
- ❌ тени вне шкалы §5
- ❌ иконки из других библиотек (heroicons, react-icons, fontawesome)
- ❌ inline-стили (кроме случаев с динамическими значениями типа CSS-переменных)
- ❌ `any` в TypeScript на компонентах
- ❌ hover-only для критических действий
- ❌ blocking animations при `prefers-reduced-motion: reduce`
- ❌ tap-targets меньше 44×44 на мобильных

## 13. Что ОБЯЗАТЕЛЬНО

- ✅ все цвета через токены Tailwind
- ✅ все размеры из шкал spacing/typography
- ✅ `cn()` helper для условных классов
- ✅ `lucide-react` единственный источник иконок
- ✅ focus-visible на всех интерактивах
- ✅ aria-label на IconButton
- ✅ sticky bottom CTA + safe-area на wizard
- ✅ light/dark theme через `next-themes` + класс `dark`
