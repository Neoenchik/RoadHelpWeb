'use client'

/**
 * MapBlock — обёртка над Yandex Maps v3.
 *
 * Поведение:
 *  - Если NEXT_PUBLIC_YANDEX_MAPS_API_KEY пустой — бесплатная карта OpenStreetMap (Leaflet).
 *  - Если ключ есть — динамически грузит API и инициализирует карту.
 *
 * Поддержано в этом MVP:
 *  - center, zoom
 *  - markers (kind: executor|order|self) — кастомные DOM-элементы
 *  - onCenterChange — для AddressPicker
 *  - height
 *
 * Не поддержано в MVP (но архитектурно готово):
 *  - route polyline между двумя точками
 *  - кластеризация
 */

import { useEffect, useRef, useState } from 'react'

import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

export interface MapMarker {
  id: string
  coordinates: [number, number] // [lng, lat] — формат Yandex
  kind: 'executor' | 'order' | 'self'
}

export interface MapBlockProps {
  center: [number, number] // [lng, lat]
  zoom?: number
  markers?: MapMarker[]
  onCenterChange?: (lngLat: [number, number]) => void
  className?: string
  /** Если true — рисуем фиксированный pin в центре экрана для AddressPicker */
  centerPin?: boolean
}

const API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY

declare global {
  interface Window {
    ymaps3?: any
  }
}

let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  if (window.ymaps3) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://api-maps.yandex.ru/v3/?apikey=${API_KEY}&lang=ru_RU`
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      scriptPromise = null
      reject(new Error('Не удалось загрузить Yandex Maps API'))
    }
    document.head.appendChild(s)
  })
  return scriptPromise
}

import { MapBlockOsm } from './MapBlockOsm'

export function MapBlock(props: MapBlockProps) {
  if (!API_KEY) return <MapBlockOsm {...props} />
  return <MapBlockYandex {...props} />
}

function MapBlockYandex({
  center,
  zoom = 14,
  markers = [],
  onCenterChange,
  className,
  centerPin,
}: MapBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerLayerRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        await loadScript()
        await window.ymaps3.ready
        if (cancelled || !containerRef.current) return
        const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapLayer } = window.ymaps3
        const map = new YMap(containerRef.current, {
          location: { center, zoom },
          behaviors: ['drag', 'pinchZoom', 'mouseRotate'],
        })
        map.addChild(new YMapDefaultSchemeLayer())
        map.addChild(new YMapDefaultFeaturesLayer())
        const layer = new YMapLayer({ id: 'markers', type: 'markers', zIndex: 1800 })
        map.addChild(layer)
        mapRef.current = map
        markerLayerRef.current = layer

        if (onCenterChange) {
          map.update({})
          map.subscribe?.((event: any) => {
            if (event?.location?.center) onCenterChange(event.location.center)
          })
        }

        // первичная отрисовка маркеров
        renderMarkers()
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    }
    init()
    return () => {
      cancelled = true
      mapRef.current?.destroy?.()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // обновление center снаружи
  useEffect(() => {
    mapRef.current?.update?.({ location: { center, zoom } })
  }, [center, zoom])

  // обновление маркеров
  useEffect(() => {
    renderMarkers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers])

  function renderMarkers() {
    const layer = markerLayerRef.current
    const ymaps3 = window.ymaps3
    if (!layer || !ymaps3) return
    // удаляем старые маркеры
    for (const child of [...(layer.children ?? [])]) {
      layer.removeChild(child)
    }
    for (const m of markers) {
      const el = document.createElement('div')
      el.className = pinClass(m.kind)
      el.innerHTML = pinHtml(m.kind)
      const marker = new ymaps3.YMapMarker({ coordinates: m.coordinates }, el)
      layer.addChild(marker)
    }
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-surface-sunken', className)}>
      <div ref={containerRef} className="absolute inset-0" />
      {error && (
        <div className="absolute inset-x-2 top-2 rounded-lg bg-danger/10 p-2 text-caption text-danger">
          {error}
        </div>
      )}
      {centerPin && <CenterPin />}
    </div>
  )
}

function CenterPin() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full"
    >
      <Icon name="MapPin" size={36} className="text-primary-500 drop-shadow-pop" strokeWidth={2} />
    </div>
  )
}

function pinClass(kind: MapMarker['kind']): string {
  switch (kind) {
    case 'executor': return 'h-9 w-9 rounded-full bg-primary-500 grid place-items-center text-white shadow-glow'
    case 'order':    return 'h-9 w-9 rounded-full bg-success grid place-items-center text-white shadow-soft'
    case 'self':     return 'h-4 w-4 rounded-full bg-blue-500 ring-4 ring-blue-500/30'
  }
}

function pinHtml(kind: MapMarker['kind']): string {
  switch (kind) {
    case 'executor': return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>'
    case 'order':    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'
    case 'self':     return ''
  }
}
