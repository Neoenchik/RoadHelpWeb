'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { serviceLabel } from '@/lib/services'

export default function AdminExecutorDetailPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { id } = useParams<{ id: string }>()

  const { data, isPending } = useQuery<any>({
    queryKey: ['admin', 'executor', id],
    queryFn: async () => (await api.get(`/api/admin/executors/${id}`)).data,
  })

  const updateStatus = useMutation({
    mutationFn: async (status: string) =>
      (await api.patch(`/api/admin/executors/${id}/status`, {
        verification_status: status,
        reason: 'admin panel',
      })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'executor', id] })
      qc.invalidateQueries({ queryKey: ['admin', 'executors'] })
      toast.success('Статус обновлён')
    },
  })

  return (
    <main className="mx-auto max-w-screen-lg space-y-4 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <IconButton aria-label="Назад" onClick={() => router.back()}>
          <Icon name="ArrowLeft" size={20} />
        </IconButton>
        <h1 className="text-h1">Исполнитель</h1>
      </header>

      {isPending || !data ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <>
          <Card className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Avatar name={`${data.first_name} ${data.last_name ?? ''}`} size="xl" />
            <div className="flex-1 space-y-2">
              <div className="text-h2">{data.first_name} {data.last_name ?? ''}</div>
              <div className="text-caption text-ink-500">{data.phone} · {data.email ?? 'без email'}</div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={data.verification_status === 'VERIFIED' ? 'success' : 'warning'}>
                  {data.verification_status}
                </Badge>
                <Badge variant={data.online_status === 'ONLINE' ? 'success' : 'neutral'}>
                  {data.online_status}
                </Badge>
                <Badge>★ {Number(data.rating).toFixed(1)}</Badge>
                <Badge>{data.completed_count} заказов</Badge>
                <Badge>Отказов: {data.decline_count}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.verification_status === 'PENDING' && (
                <Button size="sm" onClick={() => updateStatus.mutate('VERIFIED')}>Верифицировать</Button>
              )}
              {data.verification_status === 'VERIFIED' && (
                <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate('SUSPENDED')}>Приостановить</Button>
              )}
              {data.verification_status === 'SUSPENDED' && (
                <Button size="sm" onClick={() => updateStatus.mutate('VERIFIED')}>Восстановить</Button>
              )}
              {data.verification_status !== 'DISABLED' && (
                <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate('DISABLED')}>Отключить</Button>
              )}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-3">
              <div className="text-h3">Транспорт</div>
              <Row label="Марка" value={data.vehicle_make ?? '—'} />
              <Row label="Номер" value={data.vehicle_plate ?? '—'} />
            </Card>
            <Card className="space-y-3">
              <div className="text-h3">Услуги</div>
              <div className="flex flex-wrap gap-2">
                {(data.service_types ?? []).map((s: string) => (
                  <Badge key={s}>{serviceLabel(s)}</Badge>
                ))}
              </div>
            </Card>
          </div>

          {(data.documents_url?.length ?? 0) > 0 && (
            <Card className="space-y-3">
              <div className="text-h3">Документы</div>
              <ul className="space-y-2">
                {data.documents_url.map((url: string, i: number) => (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline break-all">
                      Документ {i + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Link href={`/admin/users/${id}`} className="text-caption text-primary-600 hover:underline">
            Открыть профиль пользователя →
          </Link>
        </>
      )}
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-caption text-ink-500">{label}</div>
      <div className="text-body">{value}</div>
    </div>
  )
}
