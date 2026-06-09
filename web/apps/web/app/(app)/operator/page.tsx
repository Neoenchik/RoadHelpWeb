'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useEffect } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { Skeleton } from '@/components/ui/skeleton'
import { useWebSocket } from '@/lib/socket'
import { api } from '@/lib/api'

interface Metrics {
  active_orders: number
  completed_24h: number
  cancelled_24h: number
  cancel_rate: number
  avg_eta_min: number
  disputes_open: number
  points: { hour: string | null; count: number }[]
  alerts: { kind: string; message: string }[]
}

export default function OperatorDashboardPage() {
  const qc = useQueryClient()

  const { data, isPending } = useQuery<Metrics>({
    queryKey: ['operator', 'metrics'],
    queryFn: async () => (await api.get('/api/operator/metrics')).data,
    refetchInterval: 60_000,
  })

  // WS обновляет данные дополнительно
  useWebSocket<Metrics>('/ws/operator/dashboard', () => {
    qc.invalidateQueries({ queryKey: ['operator', 'metrics'] })
  })

  const hasAlert = (data?.alerts?.length ?? 0) > 0

  return (
    <main className="mx-auto max-w-screen-2xl space-y-4 p-6">
      {hasAlert && (
        <Card className="border border-danger/30 bg-danger/5">
          <div className="flex items-center gap-2 text-danger">
            <Icon name="AlertTriangle" size={20} />
            <span className="text-h3">Внимание</span>
          </div>
          <ul className="mt-2 space-y-1 text-body text-ink-900">
            {data!.alerts.map((a, i) => <li key={i}>{a.message}</li>)}
          </ul>
        </Card>
      )}

      <h1 className="text-h1">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Активные заказы" value={isPending ? null : data!.active_orders} accent />
        <Stat title="Завершено за 24ч" value={isPending ? null : data!.completed_24h} />
        <Stat title="Cancel rate" value={isPending ? null : `${(data!.cancel_rate * 100).toFixed(1)}%`} danger={data && data.cancel_rate > 0.2} />
        <Stat title="Споры" value={isPending ? null : data!.disputes_open} />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h3">Заказы за 24 часа</h2>
          <Badge>обновляется каждые 60с</Badge>
        </div>
        {isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data!.points.map((p) => ({ hour: p.hour ?? '', count: p.count }))}>
                <defs>
                  <linearGradient id="op" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#FF6B35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke="#94A3B8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#FF6B35" fill="url(#op)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </main>
  )
}

function Stat({
  title, value, accent, danger,
}: {
  title: string
  value: number | string | null
  accent?: boolean
  danger?: boolean
}) {
  return (
    <Card
      className={
        danger ? 'bg-danger/5 border border-danger/20' :
        accent ? 'bg-primary-50' : undefined
      }
    >
      <div className="text-caption text-ink-500">{title}</div>
      <div className={'text-display tabular-nums ' + (danger ? 'text-danger' : '')}>
        {value === null ? '—' : value}
      </div>
    </Card>
  )
}
