'use client'

/**
 * Тонкая обёртка над native WebSocket.
 * Используем нативный API — socket.io-client overkill для трёх каналов.
 */

import { useEffect, useRef, useState } from 'react'

import { useAuthStore } from '@/lib/auth'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000'

export function useWebSocket<T = unknown>(
  path: string | null,
  onMessage?: (data: T) => void,
) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    if (!path) return
    const token = useAuthStore.getState().accessToken
    if (!token) return

    const url = `${WS_URL}${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (cancelled) return
      const ws = new WebSocket(url)
      wsRef.current = ws
      ws.onopen = () => setConnected(true)
      ws.onclose = () => {
        setConnected(false)
        if (!cancelled) retryTimer = setTimeout(connect, 3_000)
      }
      ws.onerror = () => ws.close()
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as T
          onMessageRef.current?.(data)
        } catch {
          /* ignore malformed */
        }
      }
    }
    connect()

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
      wsRef.current?.close()
    }
  }, [path])

  return { connected }
}
