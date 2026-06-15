'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { serviceLabel } from '@/lib/services'

interface OrderRow {
  id: string
  service_type: string
  status: string
  address: string
  estimated_price: number | null
  final_price: number | null
  created_at: string
  completed_at: string | null
}

const STATUSES = ['', 'PENDING', 'MATCHED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'COMPLETED', 'CANCELLED', 'DISPUTED']

export default function AdminOrdersPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isPending } = useQuery<{ items: OrderRow[]; total: number; page: number; limit: number }>({
    queryKey: ['admin', 'orders', status, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (status) params.set('status', status)
      return (await api.get(`/api/admin/orders?${params}`)).data
    },
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  return (
    <main className="mx-auto max-w-screen-2xl space-y-4 p-4 md:p-6">
      <h1 className="text-h1">Заказы</h1>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => { setStatus(s); setPage(1) }}
            className={
              'rounded-full border px-3 py-1.5 text-caption ' +
              (status === s
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-ink-300 text-ink-700 hover:border-primary-300')
            }
          >
            {s || 'Все'}
          </button>
        ))}
      </div>

      <Card className="overflow-x-auto p-0">
        {isPending ? (
          <Skeleton className="m-4 h-32 w-full" />
        ) : (
          <table className="min-w-full">
            <thead className="border-b border-ink-300/50 text-caption text-ink-500">
              <tr>
                <th className="p-3 text-left">Создан</th>
                <th className="p-3 text-left">Услуга</th>
                <th className="p-3 text-left">Статус</th>
                <th className="p-3 text-left">Адрес</th>
                <th className="p-3 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((o) => (
                <tr key={o.id} className="border-b border-ink-300/40 last:border-0">
                  <td className="p-3 text-caption text-ink-500">
                    {format(new Date(o.created_at), 'd MMM yyyy HH:mm', { locale: ru })}
                  </td>
                  <td className="p-3">
                    <Link href={`/admin/orders/${o.id}`} className="text-primary-600 hover:underline">
                      {serviceLabel(o.service_type)}
                    </Link>
                  </td>
                  <td className="p-3"><Badge>{o.status}</Badge></td>
                  <td className="p-3 text-caption max-w-xs truncate">{o.address}</td>
                  <td className="p-3 text-right tabular-nums">{o.final_price ?? o.estimated_price ?? '—'} ₽</td>
                </tr>
              ))}
              {(data?.items ?? []).length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-ink-500">Заказов не найдено</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      <div className="flex items-center justify-between text-caption text-ink-500">
        <span>Всего: {data?.total ?? 0}</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-ink-300 px-3 py-1 disabled:opacity-40"
          >
            Назад
          </button>
          <span className="px-2 py-1">{page} / {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-ink-300 px-3 py-1 disabled:opacity-40"
          >
            Далее
          </button>
        </div>
      </div>
    </main>
  )
}
