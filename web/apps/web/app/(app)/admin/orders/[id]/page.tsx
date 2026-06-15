'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import { MapBlock } from '@/components/domain/MapBlock'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { serviceLabel } from '@/lib/services'

export default function AdminOrderDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const { data, isPending } = useQuery<any>({
    queryKey: ['admin', 'order', id],
    queryFn: async () => (await api.get(`/api/admin/orders/${id}`)).data,
  })

  const label = data ? serviceLabel(data.service_type) : 'Заказ'

  return (
    <main className="mx-auto max-w-screen-lg space-y-4 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <IconButton aria-label="Назад" onClick={() => router.back()}>
          <Icon name="ArrowLeft" size={20} />
        </IconButton>
        <div>
          <h1 className="text-h1">{label}</h1>
          <p className="text-caption text-ink-500 font-mono">{id}</p>
        </div>
      </header>

      {isPending || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary">{data.status}</Badge>
            {data.transaction_id && <Badge>Оплачен</Badge>}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-3">
              <Row label="Адрес" value={data.address} />
              <Row label="Описание" value={data.description ?? '—'} />
              <Row label="Оценка" value={`${data.estimated_price ?? '—'} ₽`} />
              <Row label="Итого" value={`${data.final_price ?? '—'} ₽`} />
              {data.cancel_reason && <Row label="Причина отмены/спора" value={data.cancel_reason} />}
              <Row
                label="Создан"
                value={format(new Date(data.created_at), 'd MMMM yyyy HH:mm', { locale: ru })}
              />
              {data.completed_at && (
                <Row
                  label="Завершён"
                  value={format(new Date(data.completed_at), 'd MMMM yyyy HH:mm', { locale: ru })}
                />
              )}
            </Card>

            <Card className="space-y-3">
              <div className="text-h3">Участники</div>
              <div>
                <div className="text-caption text-ink-500">Клиент</div>
                <Link href={`/admin/users/${data.client.id}`} className="text-primary-600 hover:underline">
                  {data.client.first_name} {data.client.last_name ?? ''} · {data.client.phone}
                </Link>
              </div>
              {data.executor && (
                <div>
                  <div className="text-caption text-ink-500">Исполнитель</div>
                  <Link href={`/admin/executors/${data.executor.id}`} className="text-primary-600 hover:underline">
                    {data.executor.first_name} {data.executor.last_name ?? ''} · {data.executor.phone}
                  </Link>
                </div>
              )}
            </Card>
          </div>

          <Card className="h-64 overflow-hidden p-0">
            <MapBlock
              center={[data.lng, data.lat]}
              zoom={14}
              markers={[{ id: data.id, kind: 'order', coordinates: [data.lng, data.lat] }]}
              className="h-full rounded-none"
            />
          </Card>

          {(data.status_log?.length ?? 0) > 0 && (
            <Card className="overflow-x-auto p-0">
              <div className="border-b border-ink-300/50 px-4 py-3 text-h3">История статусов</div>
              <table className="min-w-full">
                <thead className="border-b border-ink-300/50 text-caption text-ink-500">
                  <tr>
                    <th className="p-3 text-left">Время</th>
                    <th className="p-3 text-left">Было</th>
                    <th className="p-3 text-left">Стало</th>
                    <th className="p-3 text-left">Причина</th>
                  </tr>
                </thead>
                <tbody>
                  {data.status_log.map((l: any, i: number) => (
                    <tr key={i} className="border-b border-ink-300/40 last:border-0">
                      <td className="p-3 text-caption">
                        {format(new Date(l.changed_at), 'd MMM HH:mm', { locale: ru })}
                      </td>
                      <td className="p-3">{l.old_status ?? '—'}</td>
                      <td className="p-3">{l.new_status}</td>
                      <td className="p-3 text-caption">{l.reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-caption text-ink-500">{label}</div>
      <div className="text-body whitespace-pre-line">{value}</div>
    </div>
  )
}
