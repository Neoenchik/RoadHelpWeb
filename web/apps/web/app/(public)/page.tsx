import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'

const SERVICES = [
  { name: 'Эвакуатор', icon: 'Truck' as const },
  { name: 'Спустило колесо', icon: 'Disc3' as const },
  { name: 'Топливо', icon: 'Fuel' as const },
  { name: 'Вскрытие', icon: 'KeyRound' as const },
  { name: 'Прикурить АКБ', icon: 'BatteryCharging' as const },
] as const

const STEPS = [
  { num: '1', title: 'Опишите проблему', text: 'Выберите услугу и укажите адрес — это занимает меньше 30 секунд.' },
  { num: '2', title: 'Найдём ближайшего мастера', text: 'Покажем карточки исполнителей с рейтингом, ценой и временем приезда.' },
  { num: '3', title: 'Отслеживайте на карте', text: 'Следите за машиной мастера в реальном времени и платите после выполнения.' },
] as const

const FAQ = [
  { q: 'Сколько стоит вызов?', a: 'Цена зависит от услуги и расстояния. Каждая карточка мастера показывает ориентировочную стоимость до подтверждения заказа.' },
  { q: 'Можно ли оплатить картой?', a: 'Да. Сохраните карту в профиле и оплачивайте в один тап после выполнения работы.' },
  { q: 'Что если мастер не приедет?', a: 'Заказ автоматически передаётся следующему мастеру через 60 секунд после неподтверждения. Деньги не списываются.' },
  { q: 'Как стать исполнителем?', a: 'Зарегистрируйтесь как исполнитель, загрузите документы и пройдите верификацию. Выплаты — раз в неделю.' },
] as const

export default function LandingPage() {
  return (
    <main>
      <SiteHeader />

      <Hero />

      <section className="mx-auto max-w-screen-lg px-4 py-12 md:py-20" id="services">
        <h2 className="text-h1 text-center">Любая помощь на дороге</h2>
        <p className="mx-auto mt-3 max-w-screen-sm text-center text-body text-ink-500">
          Вы выбираете услугу — мы находим ближайшего проверенного мастера за минуту.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
          {SERVICES.map((s) => (
            <Card key={s.name} className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-500">
                <Icon name={s.icon} size={24} />
              </div>
              <span className="text-body font-medium">{s.name}</span>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-surface-raised py-12 md:py-20" id="how">
        <div className="mx-auto max-w-screen-lg px-4">
          <h2 className="text-h1 text-center">Как это работает</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.num} className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-white text-h2 font-bold shadow-glow">
                  {s.num}
                </div>
                <h3 className="text-h3">{s.title}</h3>
                <p className="text-body text-ink-500">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-screen-lg px-4 py-12 md:py-20" id="executor">
        <Card className="grid gap-6 p-8 md:grid-cols-2 md:items-center md:p-12">
          <div className="space-y-4">
            <h2 className="text-h1">Стать исполнителем</h2>
            <p className="text-body text-ink-700">
              Принимайте заявки в своём городе и зарабатывайте на любимом деле.
              Мы находим клиентов — вы выбираете удобные заказы.
            </p>
            <ul className="space-y-2 text-body text-ink-700">
              <li className="flex items-start gap-2">
                <Icon name="Check" size={20} className="mt-1 text-success" />
                Выплаты раз в неделю на карту
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Check" size={20} className="mt-1 text-success" />
                Свободный график — работайте, когда хотите
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Check" size={20} className="mt-1 text-success" />
                Поддержка 24/7
              </li>
            </ul>
            <Button size="lg" asChild>
              <Link href="/become-executor">Подробнее</Link>
            </Button>
          </div>
          <div className="grid place-items-center rounded-2xl bg-primary-50 p-8">
            <Icon name="Wrench" size={120} className="text-primary-500" strokeWidth={1.25} />
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-screen-sm px-4 py-12 md:py-20" id="faq">
        <h2 className="text-h1 text-center">Частые вопросы</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-ink-300 bg-surface-base p-4 transition-shadow open:shadow-soft"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-body font-medium">
                {item.q}
                <Icon name="ChevronDown" size={20} className="transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-body text-ink-700">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-300/50 bg-surface-base/80 backdrop-blur">
      <div className="mx-auto flex max-w-screen-lg items-center justify-between px-4 py-3">
        <Link href="/" className="text-h3 font-extrabold tracking-tight">
          Road Help
        </Link>
        <nav className="hidden items-center gap-6 text-caption text-ink-700 md:flex">
          <a href="#services">Услуги</a>
          <a href="#how">Как работает</a>
          <a href="#executor">Стать исполнителем</a>
        </nav>
        <Button asChild size="sm">
          <Link href="/auth/login">Войти</Link>
        </Button>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-surface-base to-surface-base">
      <div className="mx-auto max-w-screen-lg px-4 py-12 md:py-24">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent-400/30 px-3 py-1 text-micro font-medium text-amber-800">
              <Icon name="Zap" size={14} className="text-amber-700" /> Помощь за 60 секунд
            </div>
            <h1 className="text-display">
              Застряли на дороге?<br />
              <span className="text-primary-500">Мы рядом.</span>
            </h1>
            <p className="max-w-prose text-body text-ink-700">
              Эвакуатор, шиномонтаж, топливо, вскрытие, прикурить АКБ — за минуту найдём ближайшего проверенного мастера.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="xl" asChild>
                <Link href="/auth/login">Заказать помощь</Link>
              </Button>
              <Button size="xl" variant="secondary" asChild>
                <Link href="/become-executor">Стать исполнителем</Link>
              </Button>
            </div>
          </div>
          <div className="relative grid place-items-center">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 mx-auto h-72 w-72 rounded-full bg-primary-500/20 blur-3xl"
            />
            <div className="rounded-3xl bg-surface-base p-8 shadow-pop">
              <Icon name="MapPin" size={160} className="text-primary-500" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t border-ink-300/50 bg-surface-raised">
      <div className="mx-auto flex max-w-screen-lg flex-col items-start gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="text-h3 font-extrabold">Road Help</div>
          <div className="text-caption text-ink-500">© {new Date().getFullYear()} Road Help. Все права защищены.</div>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-caption text-ink-700">
          <Link href="/auth/login">Войти</Link>
          <Link href="/become-executor">Стать исполнителем</Link>
          <Link href="/privacy">Политика конфиденциальности</Link>
          <a href="mailto:hello@roadhelp.local">Связаться</a>
        </nav>
      </div>
    </footer>
  )
}
