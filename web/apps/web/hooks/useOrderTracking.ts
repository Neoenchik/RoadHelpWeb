'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { useWebSocket } from '@/lib/socket'

export interface TrackingPayload {
  status: string
  executor: { lat: number; lng: number; eta_seconds: number | null } | null
  ts: number
}

export function useOrderTracking(orderId: string | null) {
  const qc = useQueryClient()
  const [last, setLast] = useState<TrackingPayload | null>(null)

  useWebSocket<TrackingPayload>(
    orderId ? `/ws/orders/${orderId}/tracking` : null,
    (data) => {
      setLast(data)
      qc.invalidateQueries({ queryKey: ['orders', orderId] })
    },
  )

  return last
}
