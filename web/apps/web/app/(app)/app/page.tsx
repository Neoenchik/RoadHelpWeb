'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { AuthGuard } from '@/components/auth-guard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Icon } from '@/components/ui/icon'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveOrder } from '@/hooks/useActiveOrder'
import { SERVICES } from '@/lib/services'

export default function UserHomePage() {
  return (
    <AuthGuard allow={['USER']}>
      <Inner />
    </AuthGuard>
  )
}

function Inner() {
  const router = useRouter()
  const { data, isPending } = useActiveOrder()

  // Если активный заказ есть — сразу на трекинг
  useEffect(() => {
    if (data?.id) router.replace(`/app/orders/${data.id}`)
  }, [data?.id, router])

  if (isPending) {
    return (
      <main className="mx-auto max-w-screen-sm space-y-4 p-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-screen-sm space-y-6 p-4">
      <Header />

      <Card className="bg-gradient-to-br from-primary-500 to-primary-600 p-6 text-white shadow-glow">
        <h2 className="text-h2 text-white">Нужна помощь?</h2>
        <p className="mt-1 text-body text-white/85">
          Выберите услугу — найдём ближайшего мастера за минуту.
        </p>
        <Button
          asChild
          variant="secondary"
          size="xl"
          className="mt-4 w-full bg-white text-primary-600 hover:bg-white/90"
        >
          <Link href="/app/new">Заказать помощь</Link>
        </Button>
      </Card>

      <div>
        <h3 className="text-h3 mb-3">Быстрый заказ</h3>
        <div className="grid grid-cols-2 gap-3">
          {SERVICES.map((s) => (
            <Link
              key={s.id}
              href={`/app/new?service=${s.id}`}
              className="flex items-center gap-3 rounded-2xl bg-surface-base p-4 shadow-soft transition-shadow hover:shadow-pop"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                <Icon name={s.icon} size={20} />
              </div>
              <span className="text-body font-medium">{s.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-h3">История</h3>
          <Link href="/app/history" className="text-caption text-primary-500">
            Все заказы
          </Link>
        </div>
        <div className="mt-3">
          <EmptyState
            icon={<Icon name="ClipboardList" size={24} />}
            title="Здесь будут ваши заказы"
            description="Сделайте первый заказ — и мы покажем его историю."
          />
        </div>
      </div>
    </main>
  )
}

function Header() {
  return (
    <header className="flex items-center justify-between">
      <h1 className="text-h1">Привет!</h1>
      <Link
        href="/app/profile"
        className="grid h-11 w-11 place-items-center rounded-full bg-surface-raised hover:bg-surface-sunken"
      >
        <Icon name="User" size={20} />
      </Link>
    </header>
  )
}
