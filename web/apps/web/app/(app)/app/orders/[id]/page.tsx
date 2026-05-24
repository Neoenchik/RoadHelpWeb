'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { AuthGuard } from '@/components/auth-guard'
import { MapBlock } from '@/components/domain/MapBlock'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useOrderTracking } from '@/hooks/useOrderTracking'
import { api } from '@/lib/api'
import { serviceMeta } from '@/lib/services'
import type { ExecutorMini, Order } from '@/lib/types'

import type { OrderStatus } from '@road-help/shared'

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Ищем мастеров поблизости…',
  MATCHED: 'Ждём подтверждения мастера',
  ACCEPTED: 'Мастер принял заказ',
  EN_ROUTE: 'Мастер едет к вам',
  ARRIVED: 'Мастер на месте',
  IN_PROGRESS: 'Идёт работа',
  AWAITING_CONFIRMATION: 'Подтвердите выполнение',
  COMPLETED: 'Заказ завершён',
  CANCELLED: 'Заказ отменён',
  DISPUTED: 'Открыт спор',
}

export default function OrderTrackingPage() {
  return (
    <AuthGuard allow={['USER']}>
      <Inner />
    </AuthGuard>
  )
}

function Inner() {
  const params = useParams<{ id: string }>()
  const orderId = params.id
  const router = useRouter()
  const qc = useQueryClient()

  const { data: order, isPending } = useQuery<Order>({
    queryKey: ['orders', orderId],
    queryFn: async () => (await api.get(`/api/orders/${orderId}`)).data,
    refetchInterval: 10_000,
  })

  // WebSocket-трекинг — инвалидирует react-query при каждом обновлении.
  useOrderTracking(orderId)

  const { data: executors } = useQuery<ExecutorMini[]>({
    queryKey: ['orders', orderId, 'executors'],
    queryFn: async () => (await api.get(`/api/orders/${orderId}/executors`)).data,
    refetchInterval: 5_000,
    enabled: !!order && (order.status === 'PENDING' || order.status === 'MATCHED'),
  })

  const cancel = useMutation({
    mutationFn: async () =>
      (await api.post(`/api/orders/${orderId}/cancel`, { reason: 'Отменено пользователем' })).data,
    onSuccess: () => {
      toast.success('Заказ отменён')
      qc.invalidateQueries({ queryKey: ['orders'] })
      router.replace('/app')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Не удалось отменить'),
  })

  const select = useMutation({
    mutationFn: async (executorId: string) =>
      (await api.patch(`/api/orders/${orderId}`, { executor_id: executorId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders', orderId] }),
  })

  // При AWAITING_CONFIRMATION перекидываем на confirm
  useEffect(() => {
    if (order?.status === 'AWAITING_CONFIRMATION') {
      router.replace(`/app/orders/${orderId}/confirm`)
    } else if (order?.status === 'COMPLETED') {
      router.replace(`/app/orders/${orderId}/review`)
    } else if (order?.status === 'CANCELLED') {
      router.replace('/app')
    }
  }, [order?.status, orderId, router])

  if (isPending || !order) {
    return (
      <div className="grid min-h-svh place-items-center">
        <Spinner size="lg" label="Загружаем заказ…" />
      </div>
    )
  }

  const center: [number, number] = [order.lng, order.lat]
  const markers = [
    { id: 'order', kind: 'order' as const, coordinates: [order.lng, order.lat] as [number, number] },
    ...(executors ?? []).filter((e) => e.lat && e.lng).map((e) => ({
      id: e.id,
      kind: 'executor' as const,
      coordinates: [e.lng!, e.lat!] as [number, number],
    })),
    ...(order.executor && order.executor.lat && order.executor.lng
      ? [{
          id: order.executor.id,
          kind: 'executor' as const,
          coordinates: [order.executor.lng, order.executor.lat] as [number, number],
        }]
      : []),
  ]

  const meta = serviceMeta(order.service_type)

  return (
    <main className="relative min-h-svh">
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 p-4">
        <IconButton aria-label="Назад" variant="raised" onClick={() => router.push('/app')}>
          <Icon name="ArrowLeft" size={20} />
        </IconButton>
        <div className="flex flex-1 items-center justify-center">
          <Badge variant="primary" className="shadow-soft">
            {STATUS_LABEL[order.status]}
          </Badge>
        </div>
        <span className="w-11" />
      </header>

      <MapBlock
        center={center}
        zoom={14}
        markers={markers}
        className="absolute inset-0 rounded-none"
      />

      <section className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl bg-surface-base p-4 pb-safe shadow-sheet">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-300" aria-hidden />

        {(order.status === 'PENDING' || order.status === 'MATCHED') && (
          <PendingPanel
            executors={executors ?? []}
            onSelect={(id) => select.mutate(id)}
            selecting={select.isPending}
            estimateLabel={`от ${order.estimated_price ?? 1500} ₽`}
            serviceName={meta?.name ?? order.service_type}
            onCancel={() => cancel.mutate()}
          />
        )}

        {(['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'] as OrderStatus[]).includes(order.status) && order.executor && (
          <ActivePanel order={order} executor={order.executor} onCancel={() => cancel.mutate()} />
        )}
      </section>
    </main>
  )
}

function PendingPanel({
  executors, onSelect, selecting, estimateLabel, serviceName, onCancel,
}: {
  executors: ExecutorMini[]
  onSelect: (id: string) => void
  selecting: boolean
  estimateLabel: string
  serviceName: string
  onCancel: () => void
}) {
  if (executors.length === 0) {
    return (
      <div className="space-y-3 py-2">
        <div className="flex items-center gap-3">
          <Spinner size="md" />
          <span className="text-body text-ink-700">Ищем ближайших мастеров…</span>
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Button variant="ghost" block onClick={onCancel}>Отменить заявку</Button>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-h3">Подходят {executors.length} мастеров</span>
        <span className="text-caption text-ink-500">{serviceName} · {estimateLabel}</span>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        {executors.map((e) => (
          <ExecutorCard key={e.id} ex={e} onSelect={() => onSelect(e.id)} disabled={selecting} />
        ))}
      </div>
      <Button variant="ghost" block onClick={onCancel}>Отменить заявку</Button>
    </div>
  )
}

function ExecutorCard({
  ex, onSelect, disabled,
}: {
  ex: ExecutorMini
  onSelect: () => void
  disabled?: boolean
}) {
  return (
    <div className="w-72 shrink-0 snap-start rounded-2xl border border-ink-300/50 bg-surface-base p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <Avatar name={`${ex.first_name} ${ex.last_name ?? ''}`} src={ex.avatar_url ?? undefined} size="md" />
        <div className="flex-1">
          <div className="flex items-center gap-1 text-caption">
            <Icon name="Star" size={14} className="fill-accent-500 text-accent-500" />
            <span className="font-medium">{ex.rating.toFixed(1)}</span>
            <span className="text-ink-500">({ex.completed_count})</span>
          </div>
          <div className="text-body font-medium">{ex.first_name} {(ex.last_name ?? '').slice(0, 1)}.</div>
        </div>
        <div className="text-right">
          <div className="text-caption text-ink-500">{ex.eta_min ?? '—'} мин</div>
          <div className="text-body font-semibold">~ {ex.estimated_price ?? '—'} ₽</div>
        </div>
      </div>
      {ex.vehicle_make && (
        <div className="mt-2 text-micro text-ink-500">
          {ex.vehicle_make} · {ex.vehicle_plate}
        </div>
      )}
      <Button block size="md" className="mt-3" onClick={onSelect} disabled={disabled}>
        Выбрать мастера
      </Button>
    </div>
  )
}

function ActivePanel({
  order, executor, onCancel,
}: {
  order: Order
  executor: ExecutorMini
  onCancel: () => void
}) {
  const STAGE = order.status === 'ARRIVED' || order.status === 'IN_PROGRESS' ? 1 : 0
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar name={`${executor.first_name} ${executor.last_name ?? ''}`} src={executor.avatar_url ?? undefined} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-1 text-caption">
            <Icon name="Star" size={14} className="fill-accent-500 text-accent-500" />
            <span className="font-medium">{executor.rating.toFixed(1)}</span>
          </div>
          <div className="text-h3">{executor.first_name} {(executor.last_name ?? '').slice(0, 1)}.</div>
          {executor.vehicle_make && (
            <div className="text-caption text-ink-500">
              {executor.vehicle_make} · {executor.vehicle_plate}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-caption">
          <span className="text-ink-500">{STATUS_LABEL[order.status]}</span>
          <span className="text-ink-700">~ {executor.eta_min ?? '—'} мин</span>
        </div>
        <Progress stage={STAGE} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="lg" asChild>
          <a href={`tel:`}>
            <Icon name="Phone" size={18} /> Позвонить
          </a>
        </Button>
        <Button variant="ghost" size="lg" onClick={onCancel}>
          <Icon name="X" size={18} /> Отменить
        </Button>
      </div>
    </div>
  )
}

function Progress({ stage }: { stage: 0 | 1 }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Bar active={true} />
      <Bar active={stage >= 1} />
    </div>
  )
}

function Bar({ active }: { active: boolean }) {
  return (
    <div className={`h-1.5 rounded-full ${active ? 'bg-primary-500' : 'bg-ink-300'}`} />
  )
}
