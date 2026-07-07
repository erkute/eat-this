'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { mapGeoError, type UserLocationError } from './useUserLocation'

export interface UserLocation {
  lat: number
  lng: number
}

interface UserLocationValue {
  location: UserLocation | null
  loading: boolean
  error: UserLocationError | null
  request: () => Promise<UserLocation | null>
}

const UserLocationContext = createContext<UserLocationValue | null>(null)

/**
 * Shared geolocation state for the hub. A single permission grant (e.g. the
 * "Standort" button in HubNearby) powers every location-aware surface — the
 * nearby rail AND the "Dein Bezirk" greeting pill — instead of each component
 * prompting on its own.
 *
 * On mount we silently resolve the position ONLY if the permission was already
 * granted (Permissions API), so returning users get their real Bezirk without
 * a prompt on load, while first-timers still see the Mitte fallback until they
 * tap the button.
 */
export function UserLocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<UserLocationError | null>(null)

  const request = useCallback((): Promise<UserLocation | null> => {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setError('unavailable')
        resolve(null)
        return
      }
      setLoading(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setLocation(loc)
          setError(null)
          setLoading(false)
          resolve(loc)
        },
        (err) => {
          setError(mapGeoError(err.code))
          setLoading(false)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10000 },
      )
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (!cancelled && status.state === 'granted') void request()
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [request])

  return (
    <UserLocationContext.Provider value={{ location, loading, error, request }}>
      {children}
    </UserLocationContext.Provider>
  )
}

export function useUserLocationContext(): UserLocationValue {
  const ctx = useContext(UserLocationContext)
  if (!ctx) {
    throw new Error('useUserLocationContext must be used within <UserLocationProvider>')
  }
  return ctx
}
