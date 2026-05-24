import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'

const BENEFITS = [
  { icon: 'CalendarClock' as const, title: 'Свободный график', desc: 'Принимайте только удобные заказы — никаких смен и обязательств.' },
  { icon: 'BadgeDollarSign' as const, title: 'Прозрачные выплаты', desc: 'Каждую неделю на карту. Комиссия 15% — без скрытых процентов.' },
  { icon: 'ShieldCheck' as const, title: 'Поддержка 24/7', desc: 'Спорные ситуации разрешаем быстро. Безопасность каждого выезда.' },
  { icon: 'TrendingUp' as const, title: 'Растущая клиентская база', desc: 'Поток заявок в крупных городах увеличивается на 30% в месяц.' },
]

export default function BecomeExecutorPage() {
  return (
    <main>
      <header className="mx-auto flex max-w-screen-lg items-center justify-between px-4 py-4">
        <Link href="/" className="text-h3 font-extrabold tracking-tight">Road Help</Link>
        <Button asChild size="sm">
          <Link href="/auth/login">Зарегистрироваться</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-screen-lg px-4 py-12 md:py-20">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <h1 className="text-display">
              Зарабатывайте на<br />
              <span className="text-primary-500">помощи водителям</span>
            </h1>
            <p className="max-w-prose text-body text-ink-700">
              Принимайте заявки в своём городе через приложение. Эвакуация, шиномонтаж,
              помощь с топливом и АКБ — выбирайте, что вам подходит.
            </p>
            <Button size="xl" asChild>
              <Link href="/auth/login">Начать зарабатывать</Link>
            </Button>
          </div>
          <div className="rounded-3xl bg-primary-50 p-8 grid place-items-center">
            <Icon name="Wrench" size={160} className="text-primary-500" strokeWidth={1.25} />
          </div>
        </div>
      </section>

      <section className="bg-surface-raised py-12 md:py-20">
        <div className="mx-auto max-w-screen-lg px-4">
          <h2 className="text-h1 text-center">Почему выбирают нас</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {BENEFITS.map((b) => (
              <Card key={b.title} className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-glow">
                  <Icon name={b.icon} size={24} />
                </div>
                <div>
                  <h3 className="text-h3">{b.title}</h3>
                  <p className="mt-1 text-body text-ink-700">{b.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-screen-sm px-4 py-12 text-center md:py-20">
        <h2 className="text-h1">Готовы начать?</h2>
        <p className="mt-3 text-body text-ink-700">
          Регистрация занимает 5 минут. Верификация документов — до 24 часов.
        </p>
        <Button size="xl" className="mt-6" asChild>
          <Link href="/auth/login">Зарегистрироваться</Link>
        </Button>
      </section>
    </main>
  )
}
