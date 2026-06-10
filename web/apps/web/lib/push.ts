'use client'

/**
 * Web Push helpers — регистрация SW и подписка пользователя на пуши.
 *
 * Стратегия (по ТЗ §11):
 *  - При первом успешном логине — НЕ просим разрешение сразу.
 *  - После первой содержательной интеракции (например, переход на трекинг
 *    или admin/dashboard) — вызвать `ensurePushSubscription()`.
 */

import { api } from '@/lib/api'

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch (e) {
    console.warn('SW register failed', e)
    return null
  }
}

export async function ensurePushSubscription(): Promise<boolean> {
  if (!VAPID) return false
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return false
  if (Notification.permission === 'denied') return false

  let permission: NotificationPermission = Notification.permission
  if (permission !== 'granted') {
    permission = await Notification.requestPermission()
  }
  if (permission !== 'granted') return false

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID) as BufferSource,
    })
  }
  const json = sub.toJSON()
  await api.post('/api/push/subscribe', {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
  })
  return true
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}
