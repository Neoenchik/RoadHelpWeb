'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'

export default function AdminUserDetailPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { id } = useParams<{ id: string }>()

  const { data, isPending } = useQuery<any>({
    queryKey: ['admin', 'user', id],
    queryFn: async () => (await api.get(`/api/admin/users/${id}`)).data,
  })

  const setRole = useMutation({
    mutationFn: async (role: string) => (await api.patch(`/api/admin/users/${id}`, { role })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'user', id] })
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Роль обновлена')
    },
  })

  return (
    <main className="mx-auto max-w-screen-lg space-y-4 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <IconButton aria-label="Назад" onClick={() => router.back()}>
          <Icon name="ArrowLeft" size={20} />
        </IconButton>
        <h1 className="text-h1">Пользователь</h1>
      </header>

      {isPending || !data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <Card className="flex items-center gap-4">
            <Avatar name={`${data.first_name} ${data.last_name ?? ''}`} size="xl" />
            <div className="flex-1">
              <div className="text-h2">{data.first_name} {data.last_name ?? ''}</div>
              <div className="text-caption text-ink-500">{data.phone ?? data.email ?? '—'}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="primary">{data.role}</Badge>
                <Badge>{data.orders_count} заказов</Badge>
                <Badge>{data.completed_orders} завершено</Badge>
              </div>
            </div>
            <select
              value={data.role}
              onChange={(e) => setRole.mutate(e.target.value)}
              className="h-10 rounded-lg border border-ink-300 bg-surface-base px-2 text-caption"
            >
              <option value="USER">USER</option>
              <option value="EXECUTOR">EXECUTOR</option>
              <option value="OPERATOR">OPERATOR</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </Card>

          <Card className="grid gap-3 sm:grid-cols-2">
            <Row label="Email" value={data.email ?? '—'} />
            <Row label="Telegram ID" value={data.telegram_id?.toString() ?? '—'} />
            <Row
              label="Регистрация"
              value={format(new Date(data.created_at), 'd MMMM yyyy HH:mm', { locale: ru })}
            />
          </Card>

          {data.executor_profile && (
            <Card className="space-y-3">
              <div className="text-h3">Профиль исполнителя</div>
              <div className="flex flex-wrap gap-2">
                <Badge>{data.executor_profile.verification_status}</Badge>
                <Badge>{data.executor_profile.online_status}</Badge>
                <Badge>★ {Number(data.executor_profile.rating).toFixed(1)}</Badge>
              </div>
              <Row label="Авто" value={`${data.executor_profile.vehicle_make ?? '—'} ${data.executor_profile.vehicle_plate ?? ''}`} />
              <Link href={`/admin/executors/${id}`} className="text-caption text-primary-600 hover:underline">
                Полная карточка исполнителя →
              </Link>
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
      <div className="text-body">{value}</div>
    </div>
  )
}
