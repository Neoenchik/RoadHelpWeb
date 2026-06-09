'use client'

import type * as signalR from '@microsoft/signalr'
import { useEffect, useRef, useState } from 'react'

import { useAuthStore } from '@/lib/auth'
import {
  acquireHubConnection,
  releaseHubConnection,
  resolveHubPath,
} from '@/lib/signalr-pool'

/**
 * SignalR hook with shared connection pool (React Strict Mode safe).
 */
export function useWebSocket<T = unknown>(
  path: string | null,
  onMessage?: (data: T) => void,
) {
  const token = useAuthStore((s) => s.accessToken)
  const [connected, setConnected] = useState(false)
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    if (!path || !token) return

    let active = true
    const { hubPath, orderId } = resolveHubPath(path)

    const handlers: Array<[string, (...args: unknown[]) => void]> = [
      ['OrderUpdated', (data) => onMessageRef.current?.(data as T)],
      ['IncomingOrder', (data) => onMessageRef.current?.(data as T)],
      ['MetricsUpdated', (data) => onMessageRef.current?.(data as T)],
    ]

    async function connect() {
      try {
        const connection = await acquireHubConnection(hubPath, token)
        if (!active) {
          releaseHubConnection(hubPath, token)
          return
        }

        connectionRef.current = connection

        for (const [event, handler] of handlers) {
          connection.on(event, handler)
        }

        connection.onreconnected(() => {
          if (active && orderId) {
            connection.invoke('SubscribeToOrder', orderId).catch(() => {})
          }
        })

        if (orderId) {
          await connection.invoke('SubscribeToOrder', orderId)
        }

        if (active) setConnected(true)
      } catch {
        if (active) setConnected(false)
      }
    }

    void connect()

    return () => {
      active = false
      setConnected(false)
      if (connectionRef.current) {
        for (const [event, handler] of handlers) {
          connectionRef.current.off(event, handler)
        }
      }
      releaseHubConnection(hubPath, token)
      connectionRef.current = null
    }
  }, [path, token])

  return { connected }
}
