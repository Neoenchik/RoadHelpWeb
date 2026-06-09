'use client'

import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

import type { MapBlockProps, MapMarker } from './MapBlock'

import 'leaflet/dist/leaflet.css'

export function MapBlockOsm({
  center,
  zoom = 14,
  markers = [],
  onCenterChange,
  className,
  centerPin,
}: MapBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    let cancelled = false

    async function init() {
      const L = await import('leaflet')

      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, {
        center: [center[1], center[0]],
        zoom,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map

      if (onCenterChange) {
        map.on('moveend', () => {
          const c = map.getCenter()
          onCenterChange([c.lng, c.lat])
        })
      }

      renderMarkers(L, map)
    }

    void init()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setView([center[1], center[0]], zoom, { animate: true })
  }, [center, zoom])

  useEffect(() => {
    void import('leaflet').then((L) => {
      if (mapRef.current) renderMarkers(L, mapRef.current)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers])

  function renderMarkers(L: typeof import('leaflet'), map: any) {
    for (const m of markersRef.current) m.remove()
    markersRef.current = []

    for (const m of markers) {
      const icon = L.divIcon({
        className: '',
        html: markerHtml(m.kind),
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })
      const marker = L.marker([m.coordinates[1], m.coordinates[0]], { icon }).addTo(map)
      markersRef.current.push(marker)
    }
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-surface-sunken', className)}>
      <div ref={containerRef} className="absolute inset-0 z-0" />
      {centerPin && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full text-primary-500"
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" stroke="white" strokeWidth="1">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          </svg>
        </div>
      )}
    </div>
  )
}

function markerHtml(kind: MapMarker['kind']): string {
  const base = 'display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;color:white;box-shadow:0 2px 8px rgba(0,0,0,.2);'
  switch (kind) {
    case 'executor':
      return `<div style="${base}background:#FF6B35;">🚗</div>`
    case 'order':
      return `<div style="${base}background:#22c55e;">📍</div>`
    case 'self':
      return `<div style="width:16px;height:16px;border-radius:9999px;background:#3b82f6;box-shadow:0 0 0 4px rgba(59,130,246,.3);"></div>`
  }
}
