'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'

import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Icon } from '@/components/ui/icon'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { serviceLabel } from '@/lib/services'

export default function AdminDisputesPage() {
  const { data, isPending } = useQuery<any[]>({
    queryKey: ['admin', 'disputes'],
    queryFn: async () => (await api.get('/api/operator/disputes')).data,
    refetchInterval: 30_000,
  })

  return (
    <main className="mx-auto max-w-screen-2xl space-y-4 p-4 md:p-6">
      <h1 className="text-h1">Споры</h1>
      {isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : data && data.length > 0 ? (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full">
            <thead className="border-b border-ink-300/50 text-caption text-ink-500">
              <tr>
                <th className="p-3 text-left">Создан</th>
                <th className="p-3 text-left">Услуга</th>
                <th className="p-3 text-left">Адрес</th>
                <th className="p-3 text-left">Причина</th>
                <th className="p-3 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id} className="border-b border-ink-300/40 last:border-0">
                  <td className="p-3 text-caption text-ink-500">
                    {format(new Date(d.created_at), 'd MMM HH:mm', { locale: ru })}
                  </td>
                  <td className="p-3">
                    <Link href={`/admin/disputes/${d.id}`} className="text-primary-600 hover:underline">
                      {serviceLabel(d.service_type)}
                    </Link>
                  </td>
                  <td className="p-3 text-caption">{d.address}</td>
                  <td className="p-3 text-caption text-ink-700 max-w-xs truncate">{d.cancel_reason ?? '—'}</td>
                  <td className="p-3 text-right tabular-nums">{d.final_price ?? d.estimated_price ?? '—'} ₽</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState
          icon={<Icon name="ShieldCheck" size={24} />}
          title="Открытых споров нет"
          description="Когда клиент откроет спор — он появится здесь для разрешения."
        />
      )}
    </main>
  )
}
