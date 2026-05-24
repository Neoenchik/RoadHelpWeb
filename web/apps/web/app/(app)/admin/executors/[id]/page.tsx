'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'

import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'

export default function AdminExecutorDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { data, isPending } = useQuery<any>({
    queryKey: ['admin', 'executor', id],
    queryFn: async () => (await api.get(`/api/admin/executors/${id}`)).data,
  })

  return (
    <main className="mx-auto max-w-screen-lg space-y-4 p-6">
      <header className="flex items-center gap-3">
        <IconButton aria-label="Назад" onClick={() => router.back()}>
          <Icon name="ArrowLeft" size={20} />
        </IconButton>
        <h1 className="text-h1">Исполнитель</h1>
      </header>

      {isPending || !data ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <Card className="flex items-center gap-4">
          <Avatar name={`${data.first_name} ${data.last_name ?? ''}`} size="xl" />
          <div className="flex-1">
            <div className="text-h2">{data.first_name} {data.last_name ?? ''}</div>
            <div className="text-caption text-ink-500">{data.phone}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="primary">Рейтинг: {data.rating.toFixed(1)}</Badge>
              <Badge>Заказов: {data.completed_count}</Badge>
              <Badge variant={data.online_status === 'ONLINE' ? 'success' : 'neutral'}>
                {data.online_status}
              </Badge>
            </div>
          </div>
        </Card>
      )}
    </main>
  )
}
