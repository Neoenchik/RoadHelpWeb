'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { AuthGuard } from '@/components/auth-guard'
import { MapBlock } from '@/components/domain/MapBlock'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { Spinner } from '@/components/ui/spinner'
import { useGeolocation } from '@/hooks/useGeolocation'
import { api } from '@/lib/api'
import { serviceMeta } from '@/lib/services'
import type { Order } from '@/lib/types'

export default function ExecutorOrderPage() {
  return (
    <AuthGuard allow={['EXECUTOR']}>
      <Inner />
    </AuthGuard>
  )
}

function Inner() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const { coords, request } = useGeolocation()

  const { data: order } = useQuery<Order>({
    queryKey: ['executor', 'order', id],
    queryFn: async () => (await api.get(`/api/orders/${id}`).catch(() =>
      api.get(`/api/executor/orders/incoming`)
    )).data,
    refetchInterval: 5_000,
  })

  const arrive = useMutation({
    mutationFn: async () => {
      if (!coords) {
        request()
        throw new Error('Нужны координаты — обновите страницу.')
      }
      return (await api.post(`/api/executor/orders/${id}/arrive`, {
        lat: coords.lat,
        lng: coords.lng,
      })).data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['executor', 'order', id] }),
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? e.message),
  })

  const complete = useMutation({
    mutationFn: async () => (await api.post(`/api/executor/orders/${id}/complete`)).data,
    onSuccess: () => {
      toast.success('Работа завершена. Ожидаем подтверждение клиента.')
      qc.invalidateQueries({ queryKey: ['executor', 'order', id] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Ошибка'),
  })

  useEffect(() => { if (!coords) request() /* eslint-disable-next-line */ }, [])

  if (!order) {
    return <div className="grid min-h-svh place-items-center"><Spinner size="lg" /></div>
  }

  const meta = serviceMeta(order.service_type)
  const center: [number, number] = [order.lng, order.lat]
  const markers = [
    { id: 'order', kind: 'order' as const, coordinates: center },
    ...(coords
      ? [{
          id: 'me',
          kind: 'self' as const,
          coordinates: [coords.lng, coords.lat] as [number, number],
        }]
      : []),
  ]

  const cta = (() => {
    if (order.status === 'ACCEPTED' || order.status === 'EN_ROUTE') {
      return { label: 'Я прибыл', onClick: () => arrive.mutate(), loading: arrive.isPending }
    }
    if (order.status === 'ARRIVED' || order.status === 'IN_PROGRESS') {
      return { label: 'Работа выполнена', onClick: () => complete.mutate(), loading: complete.isPending }
    }
    return null
  })()

  return (
    <main className="relative min-h-svh">
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
        <IconButton aria-label="Назад" variant="raised" onClick={() => router.push('/executor')}>
          <Icon name="ArrowLeft" size={20} />
        </IconButton>
        <Badge variant="primary" className="shadow-soft">{order.status}</Badge>
        <span className="w-11" />
      </header>

      <MapBlock center={center} zoom={14} markers={markers} className="absolute inset-0 rounded-none" />

      <section className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl bg-surface-base p-4 pb-safe shadow-sheet">
        <div className="space-y-3">
          <Card>
            <div className="text-caption text-ink-500">{meta?.name ?? order.service_type}</div>
            <div className="text-body">{order.address}</div>
            {order.description && (
              <div className="mt-2 text-caption text-ink-500">«{order.description}»</div>
            )}
          </Card>
          {cta && (
            <Button size="xl" block onClick={cta.onClick} loading={cta.loading}>
              {cta.label}
            </Button>
          )}
        </div>
      </section>
    </main>
  )
}
