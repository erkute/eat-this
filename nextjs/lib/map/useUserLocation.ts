'use client'
import { useState, useCallback } from 'react'

export interface UserLocation {
  lat: number
  lng: number
}

export type UserLocationError = 'denied' | 'unavailable' | 'timeout'

// GeolocationPositionError.code → typed error (1=PERMISSION_DENIED,
// 2=POSITION_UNAVAILABLE, 3=TIMEOUT)
export function mapGeoError(code: number): UserLocationError {
  if (code === 1) return 'denied'
  if (code === 3) return 'timeout'
  return 'unavailable'
}

export interface LocationRequestResult {
  location: UserLocation | null
  error: UserLocationError | null
}

interface UseUserLocationResult {
  location: UserLocation | null
  loading: boolean
  error: UserLocationError | null
  request: () => Promise<LocationRequestResult>
}

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<UserLocationError | null>(null)

  const request = useCallback((): Promise<LocationRequestResult> => {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        setError('unavailable')
        resolve({ location: null, error: 'unavailable' })
        return
      }
      setLoading(true)
      setError(null)
      navigator.geolocation.getCurrentPosition(
        pos => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setLocation(loc)
          setLoading(false)
          resolve({ location: loc, error: null })
        },
        err => {
          const typed = mapGeoError(err.code)
          setError(typed)
          setLoading(false)
          // The promise carries the error so click handlers can react to THIS
          // request without racing the state update (stale closure).
          resolve({ location: null, error: typed })
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }, [])

  return { location, loading, error, request }
}
