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

export default function DisputeDetailPage() {
  const { order_id } = useParams<{ order_id: string }>()
  const router = useRouter()
  const [refundAmount, setRefundAmount] = useState('')

  const { data, isPending } = useQuery<any[]>({
    queryKey: ['operator', 'disputes'],
    queryFn: async () => (await api.get('/api/operator/disputes')).data,
  })
  const dispute = data?.find((d) => d.id === order_id)

  const refund = useMutation({
    mutationFn: async () =>
      (await api.patch(`/api/operator/disputes/${order_id}`, {
        resolution: 'refund',
        refund_amount: refundAmount ? Number(refundAmount) : null,
      })).data,
    onSuccess: () => {
      toast.success('Возврат оформлен')
      router.replace('/operator/disputes')
    },
  })

  const reject = useMutation({
    mutationFn: async () =>
      (await api.patch(`/api/operator/disputes/${order_id}`, { resolution: 'reject' })).data,
    onSuccess: () => {
      toast.success('Спор отклонён')
      router.replace('/operator/disputes')
    },
  })

  return (
    <main className="mx-auto max-w-screen-md space-y-4 p-6">
      <header className="flex items-center gap-3">
        <IconButton aria-label="Назад" onClick={() => router.back()}>
          <Icon name="ArrowLeft" size={20} />
        </IconButton>
        <h1 className="text-h1">Спор</h1>
      </header>

      {isPending || !dispute ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <Card className="space-y-3">
          <div>
            <div className="text-caption text-ink-500">Услуга</div>
            <div className="text-body">{dispute.service_type}</div>
          </div>
          <div>
            <div className="text-caption text-ink-500">Адрес</div>
            <div className="text-body">{dispute.address}</div>
          </div>
          <div>
            <div className="text-caption text-ink-500">Причина</div>
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
        <div className="text-h3">Решение</div>
        <Input
          label="Сумма возврата (опционально)"
          type="number"
          value={refundAmount}
          onChange={(e) => setRefundAmount(e.target.value)}
          placeholder="0"
        />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="primary" onClick={() => refund.mutate()} loading={refund.isPending}>
            Возврат клиенту
          </Button>
          <Button variant="ghost" onClick={() => reject.mutate()} loading={reject.isPending}>
            Отклонить спор
          </Button>
        </div>
      </Card>
    </main>
  )
}
