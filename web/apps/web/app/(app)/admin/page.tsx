'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { Skeleton } from '@/components/ui/skeleton'
import { useWebSocket } from '@/lib/socket'
import { api } from '@/lib/api'
import { serviceLabel } from '@/lib/services'

interface Dashboard {
  users_total: number
  executors_total: number
  executors_verified: number
  executors_online: number
  executors_pending: number
  active_orders: number
  completed_24h: number
  cancelled_24h: number
  disputes_open: number
  revenue_24h: number
  recent_orders: {
    id: string
    service_type: string
    status: string
    address: string
    estimated_price: number | null
    created_at: string
  }[]
}

interface Metrics {
  cancel_rate: number
  alerts: { kind: string; message: string }[]
  points: { hour: string | null; count: number }[]
}

export default function AdminHomePage() {
  const qc = useQueryClient()

  const { data, isPending } = useQuery<Dashboard>({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => (await api.get('/api/admin/dashboard')).data,
    refetchInterval: 60_000,
  })

  const { data: metrics, isPending: metricsLoading } = useQuery<Metrics>({
    queryKey: ['admin', 'metrics'],
    queryFn: async () => (await api.get('/api/operator/metrics')).data,
    refetchInterval: 60_000,
  })

  useWebSocket<Metrics>('/ws/operator/dashboard', () => {
    qc.invalidateQueries({ queryKey: ['admin', 'metrics'] })
    qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  })

  const hasAlert = (metrics?.alerts?.length ?? 0) > 0

  return (
    <main className="mx-auto max-w-screen-2xl space-y-6 p-4 md:p-6">
      {hasAlert && (
        <Card className="border border-danger/30 bg-danger/5">
          <div className="flex items-center gap-2 text-danger">
            <Icon name="AlertTriangle" size={20} />
            <span className="text-h3">Требует внимания</span>
          </div>
          <ul className="mt-2 space-y-1 text-body">
            {metrics!.alerts.map((a, i) => (
              <li key={i}>{a.message}</li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-h1">Сводка платформы</h1>
        <div className="flex flex-wrap gap-2">
          <QuickLink href="/admin/orders" label="Заказы" />
          <QuickLink href="/admin/disputes" label="Споры" />
          <QuickLink href="/admin/executors?filter=PENDING" label="На проверке" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Пользователей" value={isPending ? null : data!.users_total} />
        <Stat title="Исполнителей" value={isPending ? null : data!.executors_total} accent />
        <Stat title="Онлайн мастеров" value={isPending ? null : data!.executors_online} accent />
        <Stat title="Активных заказов" value={isPending ? null : data!.active_orders} />
        <Stat title="Завершено за 24ч" value={isPending ? null : data!.completed_24h} />
        <Stat title="Выручка за 24ч" value={isPending ? null : `${Number(data!.revenue_24h).toFixed(0)} ₽`} />
        <Stat
          title="Cancel rate"
          value={metricsLoading ? null : `${((metrics?.cancel_rate ?? 0) * 100).toFixed(1)}%`}
          danger={!!metrics && metrics.cancel_rate > 0.2}
        />
        <Stat title="Открытых споров" value={isPending ? null : data!.disputes_open} danger={(data?.disputes_open ?? 0) > 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-h3">Заказы за 24 часа</h2>
            <Badge>24ч</Badge>
          </div>
          {metricsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics!.points.map((p) => ({ hour: p.hour ?? '', count: p.count }))}>
                  <defs>
                    <linearGradient id="adminChart" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#FF6B35" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" stroke="#94A3B8" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#94A3B8" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#FF6B35" fill="url(#adminChart)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-h3">Модерация</h2>
            <Link href="/admin/executors" className="text-caption text-primary-600 hover:underline">
              Все исполнители
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat title="Верифицированы" value={isPending ? null : data!.executors_verified} small />
            <Stat title="Ожидают проверки" value={isPending ? null : data!.executors_pending} small accent />
            <Stat title="Отменено за 24ч" value={isPending ? null : data!.cancelled_24h} small />
            <Stat title="Завершено за 24ч" value={isPending ? null : data!.completed_24h} small />
          </div>
        </Card>
      </div>

      <Card className="overflow-x-auto p-0">
        <div className="border-b border-ink-300/50 px-4 py-3 text-h3">Последние заказы</div>
        {isPending ? (
          <Skeleton className="m-4 h-24 w-full" />
        ) : (
          <table className="min-w-full">
            <thead className="border-b border-ink-300/50 text-caption text-ink-500">
              <tr>
                <th className="p-3 text-left">Время</th>
                <th className="p-3 text-left">Услуга</th>
                <th className="p-3 text-left">Статус</th>
                <th className="p-3 text-left">Адрес</th>
                <th className="p-3 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_orders ?? []).map((o) => (
                <tr key={o.id} className="border-b border-ink-300/40 last:border-0">
                  <td className="p-3 text-caption text-ink-500">
                    {format(new Date(o.created_at), 'd MMM HH:mm', { locale: ru })}
                  </td>
                  <td className="p-3">
                    <Link href={`/admin/orders/${o.id}`} className="text-primary-600 hover:underline">
                      {serviceLabel(o.service_type)}
                    </Link>
                  </td>
                  <td className="p-3"><Badge>{o.status}</Badge></td>
                  <td className="p-3 text-caption max-w-xs truncate">{o.address}</td>
                  <td className="p-3 text-right tabular-nums">{o.estimated_price ?? '—'} ₽</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </main>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-ink-300 px-3 py-1.5 text-caption text-ink-700 hover:border-primary-300 hover:text-primary-700"
    >
      {label}
    </Link>
  )
}

function Stat({
  title,
  value,
  accent,
  danger,
  small,
}: {
  title: string
  value: number | string | null
  accent?: boolean
  danger?: boolean
  small?: boolean
}) {
  return (
    <Card
      className={
        danger ? 'border border-danger/20 bg-danger/5' :
        accent ? 'bg-primary-50' : undefined
      }
    >
      <div className="text-caption text-ink-500">{title}</div>
      <div className={cnStat(danger, small)}>
        {value === null ? '—' : value}
      </div>
    </Card>
  )
}

function cnStat(danger?: boolean, small?: boolean) {
  const size = small ? 'text-h2 tabular-nums' : 'text-display tabular-nums'
  return danger ? `${size} text-danger` : size
}
