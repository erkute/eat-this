'use client'
import { useState, useCallback } from 'react'

export interface UserLocation {
  lat: number
  lng: number
}

interface UseUserLocationResult {
  location: UserLocation | null
  loading: boolean
  error: string | null
  request: () => void
}

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLoading(false)
      },
      err => {
        setError(err.message)
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  return { location, loading, error, request }
}
