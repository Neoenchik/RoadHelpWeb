'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { serviceLabel } from '@/lib/services'

export default function AdminDisputeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [note, setNote] = useState('')

  const { data, isPending } = useQuery<any[]>({
    queryKey: ['admin', 'disputes'],
    queryFn: async () => (await api.get('/api/operator/disputes')).data,
  })
  const dispute = data?.find((d) => d.id === id)

  const resolve = useMutation({
    mutationFn: async (resolution: 'complete' | 'reject') =>
      (await api.patch(`/api/operator/disputes/${id}`, {
        resolution: resolution === 'reject' ? 'reject' : 'complete',
        note: note || undefined,
      })).data,
    onSuccess: () => {
      toast.success('Спор закрыт')
      router.replace('/admin/disputes')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Ошибка'),
  })

  const label = dispute ? serviceLabel(dispute.service_type) : 'Спор'

  return (
    <main className="mx-auto max-w-screen-md space-y-4 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <IconButton aria-label="Назад" onClick={() => router.back()}>
          <Icon name="ArrowLeft" size={20} />
        </IconButton>
        <h1 className="text-h1">{label}</h1>
      </header>

      {isPending || !dispute ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <Card className="space-y-3">
          <div>
            <div className="text-caption text-ink-500">Адрес</div>
            <div className="text-body">{dispute.address}</div>
          </div>
          <div>
            <div className="text-caption text-ink-500">Причина спора</div>
            <div className="text-body whitespace-pre-line">{dispute.cancel_reason ?? '—'}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-caption text-ink-500">Оценка</div>
              <div className="text-body tabular-nums">{dispute.estimated_price ?? '—'} ₽</div>
            </div>
            <div>
              <div className="text-caption text-ink-500">К оплате</div>
              <div className="text-body tabular-nums">{dispute.final_price ?? '—'} ₽</div>
            </div>
          </div>
        </Card>
      )}

      <Card className="space-y-3">
        <div className="text-h3">Решение администратора</div>
        <Input
          label="Комментарий"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Причина решения (опционально)"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button variant="primary" onClick={() => resolve.mutate('complete')} loading={resolve.isPending}>
            Завершить в пользу клиента
          </Button>
          <Button variant="ghost" onClick={() => resolve.mutate('reject')} loading={resolve.isPending}>
            Отклонить спор
          </Button>
        </div>
        <p className="text-micro text-ink-500">
          «Завершить» — заказ в COMPLETED, «Отклонить» — в CANCELLED.
        </p>
      </Card>
    </main>
  )
}
