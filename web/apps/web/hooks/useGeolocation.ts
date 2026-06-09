'use client'

import { useCallback, useState } from 'react'

export interface GeoPoint { lat: number; lng: number }

export function useGeolocation() {
  const [coords, setCoords] = useState<GeoPoint | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Геолокация не поддерживается')
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    )
  }, [])

  return { coords, loading, error, request }
}
