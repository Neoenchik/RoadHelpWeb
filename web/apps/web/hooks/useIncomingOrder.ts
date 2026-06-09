'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { useWebSocket } from '@/lib/socket'

export interface IncomingOrderEvent {
  type: 'incoming' | 'cleared'
  order?: {
    id: string
    service_type: string
    address: string
    lat: number
    lng: number
    estimated_price: string | null
    description: string | null
  }
  deadline_at?: string | null
}

export function useIncomingOrder() {
  const qc = useQueryClient()
  const [event, setEvent] = useState<IncomingOrderEvent | null>(null)

  useWebSocket<IncomingOrderEvent>('/ws/executor/incoming', (data) => {
    setEvent(data)
    qc.invalidateQueries({ queryKey: ['executor', 'incoming'] })
  })

  return event
}
