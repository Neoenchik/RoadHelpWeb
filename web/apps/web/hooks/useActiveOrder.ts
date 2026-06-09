'use client'

import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { Order } from '@/lib/types'

export function useActiveOrder() {
  return useQuery<Order | null>({
    queryKey: ['orders', 'active'],
    queryFn: async () => {
      const r = await api.get('/api/orders/active')
      return r.data ?? null
    },
    refetchInterval: 10_000,
  })
}
