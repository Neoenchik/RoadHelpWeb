'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
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

export default function ExecutorHistoryPage() {
  return (
    <AuthGuard allow={['EXECUTOR']}>
      <Inner />
    </AuthGuard>
  )
}

function Inner() {
  const router = useRouter()
  const { data, isPending } = useQuery<{ items: Order[] }>({
    queryKey: ['executor', 'history'],
    queryFn: async () => (await api.get('/api/executor/orders/history')).data,
  })

  return (
    <main className="mx-auto max-w-screen-sm space-y-4 p-4">
      <header className="flex items-center gap-3">
        <IconButton aria-label="Назад" onClick={() => router.back()}>
          <Icon name="ArrowLeft" size={20} />
        </IconButton>
        <h1 className="text-h1">Выполненные</h1>
      </header>

      {isPending ? (
        <div className="grid place-items-center p-12"><Spinner /></div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-3">
          {data.items.map((o) => (
            <Card key={o.id} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                <Icon name="CheckCircle2" size={20} />
              </div>
              <div className="flex-1">
                <div className="text-body font-medium">{serviceMeta(o.service_type)?.name ?? o.service_type}</div>
                <div className="text-caption text-ink-500">
                  {format(new Date(o.created_at), 'd MMM, HH:mm', { locale: ru })} · {o.address.slice(0, 30)}…
                </div>
              </div>
              <div className="text-body font-semibold tabular-nums">
                +{o.final_price ?? o.estimated_price ?? '—'} ₽
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Icon name="ClipboardList" size={24} />}
          title="Пока нет завершённых заказов"
        />
      )}
    </main>
  )
}
