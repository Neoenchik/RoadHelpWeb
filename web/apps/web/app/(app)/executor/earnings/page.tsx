'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { AuthGuard } from '@/components/auth-guard'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api'

interface EarningsResp {
  total: string
  completed_orders: number
  points: { date: string; amount: string; orders: number }[]
}

export default function EarningsPage() {
  return (
    <AuthGuard allow={['EXECUTOR']}>
      <Inner />
    </AuthGuard>
  )
}

function Inner() {
  const router = useRouter()
  const [range, setRange] = useState<'day' | 'week' | 'month'>('week')

  const { data, isPending } = useQuery<EarningsResp>({
    queryKey: ['earnings', range],
    queryFn: async () => (await api.get(`/api/executor/earnings?range=${range}`)).data,
  })

  return (
    <main className="mx-auto max-w-screen-sm space-y-4 p-4">
      <header className="flex items-center gap-3">
        <IconButton aria-label="Назад" onClick={() => router.back()}>
          <Icon name="ArrowLeft" size={20} />
        </IconButton>
        <h1 className="text-h1">Заработок</h1>
      </header>

      <div className="flex gap-2 rounded-xl bg-surface-raised p-1">
        {(['day', 'week', 'month'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={
              'flex-1 rounded-lg py-2 text-caption font-medium transition-colors ' +
              (range === r ? 'bg-surface-base text-primary-600 shadow-soft' : 'text-ink-700')
            }
          >
            {r === 'day' ? 'Сегодня' : r === 'week' ? 'Неделя' : 'Месяц'}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="grid place-items-center p-12"><Spinner /></div>
      ) : data && (
        <>
          <Card>
            <div className="text-caption text-ink-500">Всего заработано</div>
            <div className="text-display tabular-nums">{Number(data.total).toLocaleString('ru')} ₽</div>
            <div className="text-caption text-ink-500">{data.completed_orders} заказов</div>
          </Card>
          <Card>
            <div className="text-caption text-ink-500 mb-3">Динамика</div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.points.map((p) => ({ date: p.date.slice(5, 10), amount: Number(p.amount) }))}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#FF6B35" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" />
                  <Tooltip />
                  <Area type="monotone" dataKey="amount" stroke="#FF6B35" fill="url(#g)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </main>
  )
}
