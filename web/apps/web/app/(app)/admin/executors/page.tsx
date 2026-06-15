'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'

interface ExecRow {
  user_id: string
  first_name: string
  last_name: string | null
  phone: string | null
  online_status: 'ONLINE' | 'OFFLINE'
  verification_status: 'PENDING' | 'VERIFIED' | 'SUSPENDED' | 'DISABLED'
  rating: number
  completed_count: number
}

export default function AdminExecutorsPage() {
  const qc = useQueryClient()
  const searchParams = useSearchParams()
  const initialFilter = searchParams.get('filter') ?? ''
  const [filter, setFilter] = useState<string>(initialFilter)
  const [q, setQ] = useState('')

  const { data, isPending } = useQuery<ExecRow[]>({
    queryKey: ['admin', 'executors', filter, q],
    queryFn: async () => {
      const params: string[] = []
      if (filter) params.push(`verification_status=${filter}`)
      if (q) params.push(`q=${encodeURIComponent(q)}`)
      return (await api.get(`/api/admin/executors${params.length ? '?' + params.join('&') : ''}`)).data
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.patch(`/api/admin/executors/${id}/status`, {
        verification_status: status,
        reason: 'admin action',
      })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'executors'] })
      toast.success('Статус обновлён')
    },
  })

  return (
    <main className="mx-auto max-w-screen-2xl space-y-4 p-6">
      <h1 className="text-h1">Исполнители</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-64">
          <Input placeholder="Поиск по имени или телефону" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {[['', 'Все'], ['PENDING', 'Ожидают'], ['VERIFIED', 'Верифицированы'], ['SUSPENDED', 'Приостановлены'], ['DISABLED', 'Отключены']].map(
            ([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={
                  'rounded-full border px-3 py-1.5 text-caption ' +
                  (filter === k
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-ink-300 text-ink-700 hover:border-primary-300')
                }
              >
                {label}
              </button>
            ),
          )}
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        {isPending ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="border-b border-ink-300/50 text-caption text-ink-500">
              <tr>
                <th className="p-3 text-left">Имя</th>
                <th className="p-3 text-left">Телефон</th>
                <th className="p-3 text-left">Статус</th>
                <th className="p-3 text-left">Online</th>
                <th className="p-3 text-right">Рейтинг</th>
                <th className="p-3 text-right">Заказов</th>
                <th className="p-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((e) => (
                <tr key={e.user_id} className="border-b border-ink-300/40 last:border-0">
                  <td className="p-3 text-body">
                    <Link href={`/admin/executors/${e.user_id}`} className="text-primary-600 hover:underline">
                      {e.first_name} {e.last_name ?? ''}
                    </Link>
                  </td>
                  <td className="p-3 text-caption text-ink-500">{e.phone ?? '—'}</td>
                  <td className="p-3"><VerificationBadge value={e.verification_status} /></td>
                  <td className="p-3 text-caption">
                    <span className={'inline-flex h-2 w-2 rounded-full ' + (e.online_status === 'ONLINE' ? 'bg-success' : 'bg-ink-300')} />{' '}
                    {e.online_status === 'ONLINE' ? 'Онлайн' : 'Офлайн'}
                  </td>
                  <td className="p-3 text-right tabular-nums">{e.rating.toFixed(1)}</td>
                  <td className="p-3 text-right tabular-nums">{e.completed_count}</td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-2">
                      {e.verification_status === 'PENDING' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => updateStatus.mutate({ id: e.user_id, status: 'VERIFIED' })}
                        >
                          Верифицировать
                        </Button>
                      )}
                      {e.verification_status === 'VERIFIED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStatus.mutate({ id: e.user_id, status: 'SUSPENDED' })}
                        >
                          Приостановить
                        </Button>
                      )}
                      {e.verification_status === 'SUSPENDED' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => updateStatus.mutate({ id: e.user_id, status: 'VERIFIED' })}
                        >
                          Восстановить
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(data ?? []).length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-ink-500">Нет данных</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </main>
  )
}

function VerificationBadge({ value }: { value: ExecRow['verification_status'] }) {
  switch (value) {
    case 'VERIFIED':  return <Badge variant="success">Верифицирован</Badge>
    case 'PENDING':   return <Badge variant="warning">Ожидает</Badge>
    case 'SUSPENDED': return <Badge variant="warning">Приостановлен</Badge>
    case 'DISABLED':  return <Badge variant="danger">Отключён</Badge>
  }
}
