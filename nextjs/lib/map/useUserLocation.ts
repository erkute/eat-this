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
  request: () => Promise<UserLocation | null>
}

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback((): Promise<UserLocation | null> => {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        setError('Geolocation not supported')
        resolve(null)
        return
      }
      setLoading(true)
      setError(null)
      navigator.geolocation.getCurrentPosition(
        pos => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setLocation(loc)
          setLoading(false)
          resolve(loc)
        },
        err => {
          setError(err.message)
          setLoading(false)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }, [])

  return { location, loading, error, request }
}
