'use client'

import { useQuery } from '@tanstack/react-query'

import { MapBlock } from '@/components/domain/MapBlock'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'

interface ActiveOrder {
  id: string
  service_type: string
  status: string
  lat: number
  lng: number
  address: string
  created_at: string
}

const STATUS_KIND: Record<string, 'order' | 'executor'> = {
  EN_ROUTE: 'executor',
  ARRIVED: 'order',
  IN_PROGRESS: 'order',
  DISPUTED: 'order',
}

export default function ActiveOrdersMapPage() {
  const { data, isPending } = useQuery<ActiveOrder[]>({
    queryKey: ['operator', 'active'],
    queryFn: async () => (await api.get('/api/operator/active-orders')).data,
    refetchInterval: 15_000,
  })

  const center: [number, number] = [37.6173, 55.7558]
  const markers = (data ?? []).map((o) => ({
    id: o.id,
    kind: (STATUS_KIND[o.status] ?? 'order') as 'order' | 'executor' | 'self',
    coordinates: [o.lng, o.lat] as [number, number],
  }))

  return (
    <main className="grid h-svh grid-rows-[auto_1fr] gap-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-h1">Активные заказы</h1>
        <span className="text-caption text-ink-500">{data?.length ?? 0} на карте</span>
      </header>

      <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <MapBlock center={center} zoom={9} markers={markers} className="h-full" />
        <div className="flex flex-col overflow-y-auto">
          {isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <ul className="space-y-2">
              {(data ?? []).map((o) => (
                <li key={o.id}>
                  <Card>
                    <div className="text-caption text-ink-500">{o.status}</div>
                    <div className="text-body font-medium">{o.service_type}</div>
                    <div className="text-caption text-ink-700">{o.address}</div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
