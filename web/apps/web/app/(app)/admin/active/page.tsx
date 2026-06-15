'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'

import { MapBlock } from '@/components/domain/MapBlock'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Icon } from '@/components/ui/icon'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { serviceLabel } from '@/lib/services'

interface ActiveOrder {
  id: string
  service_type: string
  status: string
  lat: number
  lng: number
  address: string
  user_name: string
  executor_name: string | null
  created_at: string
  estimated_price: number | null
}

const STATUS_KIND: Record<string, 'order' | 'executor'> = {
  EN_ROUTE: 'executor',
  ARRIVED: 'order',
  IN_PROGRESS: 'order',
  DISPUTED: 'order',
}

export default function AdminActiveOrdersPage() {
  const { data, isPending } = useQuery<ActiveOrder[]>({
    queryKey: ['admin', 'active-orders'],
    queryFn: async () => (await api.get('/api/operator/active-orders')).data,
    refetchInterval: 15_000,
  })

  const center: [number, number] =
    data && data.length > 0 ? [data[0].lng, data[0].lat] : [37.6173, 55.7558]

  const markers = (data ?? []).map((o) => ({
    id: o.id,
    kind: (STATUS_KIND[o.status] ?? 'order') as 'order' | 'executor' | 'self',
    coordinates: [o.lng, o.lat] as [number, number],
  }))

  return (
    <main className="grid min-h-[calc(100svh-56px)] grid-rows-[auto_1fr] gap-4 p-4 md:min-h-svh md:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-h1">Активные заказы</h1>
        <span className="text-caption text-ink-500">{data?.length ?? 0} на карте</span>
      </header>

      <div className="grid h-full min-h-[420px] grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        {isPending ? (
          <Skeleton className="h-full min-h-[320px]" />
        ) : (data ?? []).length === 0 ? (
          <EmptyState
            icon={<Icon name="MapPin" size={24} />}
            title="Нет активных заказов"
            description="Когда клиент создаст заказ — точки появятся на карте."
          />
        ) : (
          <MapBlock center={center} zoom={10} markers={markers} className="h-full min-h-[320px]" />
        )}

        <div className="flex flex-col gap-2 overflow-y-auto">
          {isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            (data ?? []).map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`}>
                <Card className="transition-colors hover:bg-surface-sunken">
                  <div className="flex items-center justify-between gap-2">
                    <Badge>{o.status}</Badge>
                    <span className="text-caption text-ink-500">
                      {format(new Date(o.created_at), 'HH:mm', { locale: ru })}
                    </span>
                  </div>
                  <div className="mt-1 text-body font-medium">
                    {serviceLabel(o.service_type)}
                  </div>
                  <div className="text-caption text-ink-700">{o.address}</div>
                  <div className="mt-1 text-micro text-ink-500">
                    {o.user_name}
                    {o.executor_name ? ` → ${o.executor_name}` : ''}
                    {o.estimated_price != null ? ` · ${o.estimated_price} ₽` : ''}
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
