'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { AuthGuard } from '@/components/auth-guard'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CountdownTimer } from '@/components/ui/countdown-timer'
import { Icon } from '@/components/ui/icon'
import { Spinner } from '@/components/ui/spinner'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useIncomingOrder } from '@/hooks/useIncomingOrder'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'
import { serviceMeta } from '@/lib/services'
import type { Order } from '@/lib/types'

interface ExecutorProfile {
  online_status: 'ONLINE' | 'OFFLINE'
  verification_status: 'PENDING' | 'VERIFIED' | 'SUSPENDED' | 'DISABLED'
  rating: number
  completed_count: number
}

export default function ExecutorHomePage() {
  return (
    <AuthGuard allow={['EXECUTOR']}>
      <Inner />
    </AuthGuard>
  )
}

function Inner() {
  const router = useRouter()
  const qc = useQueryClient()

  const { data: profile, isPending: profileLoading } = useQuery<ExecutorProfile>({
    queryKey: ['executor', 'me'],
    queryFn: async () => (await api.get('/api/executor/me')).data,
    refetchInterval: 30_000,
  })

  const incomingEvent = useIncomingOrder()

  const { data: incomingPoll } = useQuery<Order | null>({
    queryKey: ['executor', 'incoming'],
    queryFn: async () => (await api.get('/api/executor/orders/incoming')).data ?? null,
    refetchInterval: profile?.online_status === 'ONLINE' ? 5_000 : false,
    enabled: profile?.online_status === 'ONLINE',
  })

  const incoming: Order | null = incomingEvent?.type === 'incoming' && incomingEvent.order
    ? {
        id: incomingEvent.order.id,
        user_id: '',
        executor_id: null,
        service_type: incomingEvent.order.service_type as Order['service_type'],
        address: incomingEvent.order.address,
        lat: incomingEvent.order.lat,
        lng: incomingEvent.order.lng,
        estimated_price: incomingEvent.order.estimated_price ?? null,
        final_price: null,
        cancel_reason: null,
        created_at: new Date().toISOString(),
        matched_at: null,
        accepted_at: null,
        arrived_at: null,
        completed_at: null,
        description: incomingEvent.order.description,
        status: 'PENDING',
        executor: null,
      }
    : (incomingPoll ?? null)

  const setStatus = useMutation({
    mutationFn: async (status: 'ONLINE' | 'OFFLINE') =>
      (await api.patch('/api/executor/me/status', { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['executor', 'me'] }),
  })

  const accept = useMutation({
    mutationFn: async (orderId: string) =>
      (await api.post(`/api/executor/orders/${orderId}/accept`)).data,
    onSuccess: (_data, orderId) => {
      qc.invalidateQueries({ queryKey: ['executor', 'incoming'] })
      router.push(`/executor/orders/${orderId}`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Ошибка'),
  })

  const decline = useMutation({
    mutationFn: async (orderId: string) =>
      (await api.post(`/api/executor/orders/${orderId}/decline`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['executor', 'incoming'] }),
  })

  const { coords, request } = useGeolocation()
  useEffect(() => {
    if (coords && profile?.online_status === 'ONLINE') {
      api.patch('/api/executor/me/location', { lat: coords.lat, lng: coords.lng }).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.lat, coords?.lng, profile?.online_status])

  // При выходе на онлайн запрашиваем геолокацию
  useEffect(() => {
    if (profile?.online_status === 'ONLINE' && !coords) request()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.online_status])

  if (profileLoading || !profile) {
    return <div className="grid min-h-svh place-items-center"><Spinner size="lg" /></div>
  }

  // Skip verification check for demo
  // if (profile.verification_status !== 'VERIFIED') {
  //   return <Verification status={profile.verification_status} />
  // }

  const isOnline = profile.online_status === 'ONLINE'

  return (
    <main className="mx-auto max-w-screen-sm space-y-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-h1">Заказы</h1>
        <button
          onClick={() => router.push('/executor/profile')}
          className="grid h-11 w-11 place-items-center rounded-full bg-surface-raised hover:bg-surface-sunken"
        >
          <Icon name="User" size={20} />
        </button>
      </header>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-h3">{isOnline ? 'Вы в эфире' : 'Не на смене'}</div>
            <div className="text-caption text-ink-500">
              {isOnline ? 'Получаете заявки в радиусе 50 км' : 'Включите смену, чтобы принимать заказы'}
            </div>
          </div>
          <Switch
            checked={isOnline}
            onChange={(v) => setStatus.mutate(v ? 'ONLINE' : 'OFFLINE')}
            disabled={setStatus.isPending}
          />
        </div>
      </Card>

      <Card className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Рейтинг" value={profile.rating.toFixed(1)} />
        <Stat label="Заказов" value={String(profile.completed_count)} />
        <Stat label="Сегодня" value="—" />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Tile icon="History" label="История" onClick={() => router.push('/executor/history')} />
        <Tile icon="LineChart" label="Заработок" onClick={() => router.push('/executor/earnings')} />
      </div>

      {incoming && incoming.id && (
        <IncomingModal
          order={incoming}
          onAccept={() => accept.mutate(incoming.id)}
          onDecline={() => decline.mutate(incoming.id)}
          onExpire={() => qc.invalidateQueries({ queryKey: ['executor', 'incoming'] })}
        />
      )}
    </main>
  )
}

function Switch({
  checked, onChange, disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={
        'relative h-8 w-14 rounded-full transition-colors ' +
        (checked ? 'bg-primary-500' : 'bg-ink-300') +
        (disabled ? ' opacity-50' : '')
      }
    >
      <span
        className={
          'absolute top-1 h-6 w-6 rounded-full bg-white shadow-soft transition-transform ' +
          (checked ? 'translate-x-7' : 'translate-x-1')
        }
      />
    </button>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-h2 tabular-nums">{value}</div>
      <div className="text-caption text-ink-500">{label}</div>
    </div>
  )
}

function Tile({ icon, label, onClick }: { icon: 'History' | 'LineChart'; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl bg-surface-base p-4 shadow-soft transition-shadow hover:shadow-pop"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
        <Icon name={icon} size={20} />
      </div>
      <span className="text-body font-medium">{label}</span>
    </button>
  )
}

function IncomingModal({
  order, onAccept, onDecline, onExpire,
}: {
  order: Order
  onAccept: () => void
  onDecline: () => void
  onExpire: () => void
}) {
  const meta = serviceMeta(order.service_type)
  const deadline = new Date(Date.now() + 60_000).toISOString()
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-surface-overlay p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm space-y-5 rounded-3xl bg-surface-base p-6 shadow-pop">
        <div className="flex justify-center">
          <CountdownTimer deadline={deadline} size={120} onExpire={onExpire} />
        </div>
        <div className="text-center">
          <div className="text-h2">{meta?.name ?? order.service_type}</div>
          <div className="mt-1 text-body text-ink-500">{order.address}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-raised p-3 text-center">
          <div>
            <div className="text-caption text-ink-500">Цена</div>
            <div className="text-h3">~ {order.estimated_price ?? '—'} ₽</div>
          </div>
          <div>
            <div className="text-caption text-ink-500">До адреса</div>
            <div className="text-h3">— км</div>
          </div>
        </div>
        <div className="space-y-3">
          <Button size="xl" block onClick={onAccept}>Принять заявку</Button>
          <Button variant="ghost" block onClick={onDecline}>Пропустить</Button>
        </div>
      </div>
    </div>
  )
}