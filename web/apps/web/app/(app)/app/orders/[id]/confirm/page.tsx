'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { AuthGuard } from '@/components/auth-guard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api'
import type { Order } from '@/lib/types'

export default function ConfirmPage() {
  return (
    <AuthGuard allow={['USER']}>
      <Inner />
    </AuthGuard>
  )
}

function Inner() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data: order } = useQuery<Order>({
    queryKey: ['orders', id],
    queryFn: async () => (await api.get(`/api/orders/${id}`)).data,
  })

  const confirm = useMutation({
    mutationFn: async () => (await api.post(`/api/orders/${id}/confirm`)).data,
    onSuccess: () => router.replace(`/app/orders/${id}/review`),
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Ошибка'),
  })

  const dispute = useMutation({
    mutationFn: async () =>
      (await api.post(`/api/orders/${id}/dispute`, { reason: 'Сообщение о проблеме' })).data,
    onSuccess: () => {
      toast.success('Оператор свяжется с вами в течение 15 минут')
      router.replace('/app')
    },
  })

  if (!order) {
    return <div className="grid min-h-svh place-items-center"><Spinner size="lg" /></div>
  }

  const price = order.final_price ?? order.estimated_price ?? '0'

  return (
    <main className="mx-auto flex min-h-svh max-w-screen-sm flex-col p-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10 text-success">
          <Icon name="CheckCircle2" size={48} strokeWidth={1.5} />
        </div>
        <h1 className="text-h1">Работа выполнена</h1>
        <p className="text-body text-ink-500">К оплате</p>
        <div className="text-display text-primary-500 tabular-nums">{price} ₽</div>
      </div>

      <Card className="space-y-2 mb-3">
        <div className="text-caption text-ink-500">Адрес</div>
        <div className="text-body">{order.address}</div>
      </Card>

      <div className="space-y-3 pb-safe">
        <Button size="xl" block onClick={() => confirm.mutate()} loading={confirm.isPending}>
          Подтвердить и оплатить
        </Button>
        <Button variant="ghost" block onClick={() => dispute.mutate()} loading={dispute.isPending}>
          Сообщить о проблеме
        </Button>
      </div>
    </main>
  )
}
