'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { AuthGuard } from '@/components/auth-guard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { api } from '@/lib/api'

interface PaymentMethod {
  id: string
  last4: string
  brand: string | null
  is_default: boolean
}

export default function PaymentPage() {
  const router = useRouter()
  const qc = useQueryClient()

  const { data: methods, isPending } = useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods'],
    queryFn: async () => (await api.get('/api/users/me/payment-methods')).data,
  })

  const addDemo = useMutation({
    mutationFn: async () => (await api.post('/api/users/me/payment-methods')).data,
    onSuccess: () => {
      toast.success('Демо-карта добавлена')
      qc.invalidateQueries({ queryKey: ['payment-methods'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Ошибка'),
  })

  return (
    <AuthGuard allow={['USER']}>
      <main className="mx-auto max-w-screen-sm space-y-4 p-4">
        <header className="flex items-center gap-3">
          <IconButton aria-label="Назад" onClick={() => router.back()}>
            <Icon name="ArrowLeft" size={20} />
          </IconButton>
          <h1 className="text-h1">Способы оплаты</h1>
        </header>

        <Card className="space-y-3">
          <p className="text-caption text-ink-500">
            Демо-режим: оплата проходит через mock-провайдер без реального списания.
          </p>
          {isPending ? (
            <p className="text-body text-ink-500">Загрузка…</p>
          ) : methods && methods.length > 0 ? (
            methods.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl bg-surface-raised p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                  <Icon name="CreditCard" size={20} />
                </div>
                <div className="flex-1">
                  <div className="text-body font-medium">{m.brand ?? 'Карта'} •••• {m.last4}</div>
                  {m.is_default && <div className="text-caption text-ink-500">Основная</div>}
                </div>
              </div>
            ))
          ) : (
            <Button block onClick={() => addDemo.mutate()} loading={addDemo.isPending}>
              Добавить демо-карту Visa •••• 4242
            </Button>
          )}
        </Card>
      </main>
    </AuthGuard>
  )
}
