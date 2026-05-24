'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { AuthGuard } from '@/components/auth-guard'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api'
import { serviceMeta } from '@/lib/services'
import type { Order } from '@/lib/types'

export default function HistoryPage() {
  return (
    <AuthGuard allow={['USER']}>
      <Inner />
    </AuthGuard>
  )
}

function Inner() {
  const router = useRouter()
  const { data, isPending } = useQuery<{ items: Order[] }>({
    queryKey: ['orders', 'history'],
    queryFn: async () => (await api.get('/api/orders/history')).data,
  })

  return (
    <main className="mx-auto max-w-screen-sm space-y-4 p-4">
      <header className="flex items-center gap-3">
        <IconButton aria-label="Назад" onClick={() => router.back()}>
          <Icon name="ArrowLeft" size={20} />
        </IconButton>
        <h1 className="text-h1">История</h1>
      </header>

      {isPending ? (
        <div className="grid place-items-center p-12"><Spinner /></div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-3">
          {data.items.map((o) => (
            <Link key={o.id} href={`/app/orders/${o.id}`}>
              <Card className="flex items-center gap-3 hover:shadow-pop">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                  <Icon name={serviceMeta(o.service_type)?.icon ?? 'Wrench'} size={20} />
                </div>
                <div className="flex-1">
                  <div className="text-body font-medium">{serviceMeta(o.service_type)?.name ?? o.service_type}</div>
                  <div className="text-caption text-ink-500">
                    {format(new Date(o.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                  </div>
                </div>
                <div className="text-body font-semibold tabular-nums">
                  {o.final_price ?? o.estimated_price ?? '—'} ₽
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Icon name="ClipboardList" size={24} />}
          title="История пока пуста"
          description="Сделайте первый заказ — он появится здесь."
        />
      )}
    </main>
  )
}
