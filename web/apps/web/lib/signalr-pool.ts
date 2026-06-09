'use client'

import * as signalR from '@microsoft/signalr'

const HUB_BASE = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:8080'
const STOP_DELAY_MS = 300

/** Suppress benign Strict Mode negotiation noise in Next.js dev overlay */
class QuietSignalRLogger implements signalR.ILogger {
  log(logLevel: signalR.LogLevel, message: string): void {
    if (
      message.includes('stopped during negotiation') ||
      message.includes('Failed to start the connection')
    ) {
      return
    }
    if (logLevel >= signalR.LogLevel.Warning) {
      console.warn(`[SignalR] ${message}`)
    }
  }
}

interface PoolEntry {
  connection: signalR.HubConnection
  refs: number
  token: string
}

const pool = new Map<string, PoolEntry>()
const stopTimers = new Map<string, ReturnType<typeof setTimeout>>()

function poolKey(hubPath: string, token: string): string {
  return `${hubPath}::${token.slice(-16)}`
}

function buildConnection(hubPath: string, token: string): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${HUB_BASE}${hubPath}`, {
      accessTokenFactory: () => token,
      withCredentials: true,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(new QuietSignalRLogger())
    .build()
}

function cancelScheduledStop(key: string): void {
  const timer = stopTimers.get(key)
  if (timer) {
    clearTimeout(timer)
    stopTimers.delete(key)
  }
}

function scheduleStop(key: string): void {
  cancelScheduledStop(key)
  stopTimers.set(
    key,
    setTimeout(() => {
      stopTimers.delete(key)
      const entry = pool.get(key)
      if (entry && entry.refs <= 0) {
        void entry.connection.stop().finally(() => pool.delete(key))
      }
    }, STOP_DELAY_MS),
  )
}

export async function acquireHubConnection(
  hubPath: string,
  token: string,
): Promise<signalR.HubConnection> {
  const key = poolKey(hubPath, token)
  cancelScheduledStop(key)

  let entry = pool.get(key)
  if (!entry || entry.token !== token) {
    if (entry) {
      cancelScheduledStop(key)
      await entry.connection.stop().catch(() => {})
      pool.delete(key)
    }
    entry = {
      connection: buildConnection(hubPath, token),
      refs: 0,
      token,
    }
    pool.set(key, entry)
  }

  entry.refs += 1

  if (entry.connection.state === signalR.HubConnectionState.Disconnected) {
    await entry.connection.start()
  }

  return entry.connection
}

export function releaseHubConnection(hubPath: string, token: string): void {
  const key = poolKey(hubPath, token)
  const entry = pool.get(key)
  if (!entry) return

  entry.refs = Math.max(0, entry.refs - 1)
  if (entry.refs === 0) {
    scheduleStop(key)
  }
}

export function resolveHubPath(path: string): { hubPath: string; orderId?: string } {
  const orderMatch = path.match(/^\/ws\/orders\/([^/]+)\/tracking$/)
  if (orderMatch) {
    return { hubPath: '/ws/orders/tracking', orderId: orderMatch[1] }
  }
  return { hubPath: path }
}
