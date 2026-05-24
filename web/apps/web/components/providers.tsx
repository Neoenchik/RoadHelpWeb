'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { type ReactNode, useEffect, useState } from 'react'
import { Toaster } from 'sonner'

import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'
import { registerServiceWorker } from '@/lib/push'
import { makeQueryClient } from '@/lib/queryClient'

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient)
  const setSession = useAuthStore((s) => s.setSession)
  const setHydrated = useAuthStore((s) => s.setHydrated)
  const clear = useAuthStore((s) => s.clear)

  // На старте дёргаем refresh — если cookie живой, авторизуемся.
  useEffect(() => {
    let cancelled = false
    async function rehydrate() {
      try {
        const r = await api.post('/api/auth/refresh')
        if (!cancelled) setSession(r.data.access_token, r.data.user)
      } catch {
        if (!cancelled) clear()
      } finally {
        if (!cancelled) setHydrated(true)
      }
    }
    rehydrate()
    registerServiceWorker()
    return () => { cancelled = true }
  }, [setSession, setHydrated, clear])

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={client}>
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: 'rounded-2xl shadow-pop',
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
