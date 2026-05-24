'use client'

import { QueryClient } from '@tanstack/react-query'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, err) => {
          // Не ретраим 4xx
          const status = (err as { response?: { status?: number } })?.response?.status
          if (status && status >= 400 && status < 500) return false
          return count < 1
        },
        refetchOnWindowFocus: false,
      },
    },
  })
}
