'use client'

import { useQuery } from '@tanstack/react-query'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'

export default function AdminHomePage() {
  const { data: executors } = useQuery<any[]>({
    queryKey: ['admin', 'executors'],
    queryFn: async () => (await api.get('/api/admin/executors')).data,
  })
  const { data: metrics, isPending: metricsLoading } = useQuery<any>({
    queryKey: ['admin', 'metrics'],
    queryFn: async () => (await api.get('/api/operator/metrics')).data,
  })

  const verified = executors?.filter((e) => e.verification_status === 'VERIFIED').length ?? 0
  const online   = executors?.filter((e) => e.online_status === 'ONLINE').length ?? 0
  const total    = executors?.length ?? 0

  return (
    <main className="mx-auto max-w-screen-2xl space-y-6 p-6">
      <h1 className="text-h1">Сводка</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Исполнителей всего" value={total} />
        <Stat title="Верифицированных" value={verified} accent />
        <Stat title="Онлайн сейчас" value={online} accent />
        <Stat title="Активных заказов" value={metricsLoading ? null : metrics?.active_orders ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-h3 mb-3">Метрики платформы (24ч)</div>
          {metricsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat title="Завершено" value={metrics.completed_24h} small />
              <Stat title="Отменено" value={metrics.cancelled_24h} small />
              <Stat title="Cancel rate" value={`${(metrics.cancel_rate * 100).toFixed(1)}%`} small />
            </div>
          )}
        </Card>
        <Card>
          <div className="text-h3 mb-3">Активные споры</div>
          <div className="text-display tabular-nums">{metrics?.disputes_open ?? 0}</div>
          <p className="text-caption text-ink-500">Передаются операторам автоматически.</p>
        </Card>
      </div>
    </main>
  )
}

function Stat({
  title, value, accent, small,
}: {
  title: string
  value: number | string | null
  accent?: boolean
  small?: boolean
}) {
  return (
    <Card className={accent ? 'bg-primary-50' : undefined}>
      <div className="text-caption text-ink-500">{title}</div>
      <div className={small ? 'text-h2 tabular-nums' : 'text-display tabular-nums'}>
        {value === null ? '—' : value}
      </div>
    </Card>
  )
}
