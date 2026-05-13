'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { auth } from '@/lib/firebase/config'
import type { MapRestaurant, MapMustEat } from '../types'
import type { CategoryDef } from '../categories'

interface UseMapDataArgs {
  uid:         string | null
  authLoading: boolean
}

interface MapData {
  restaurants: MapRestaurant[]
  mustEats:    MapMustEat[]
  categories:  CategoryDef[]
  loading:     boolean
  error:       string | null
  refetch:     () => void
}

export function useMapData({ uid, authLoading }: UseMapDataArgs): MapData {
  const [restaurants, setRestaurants] = useState<MapRestaurant[]>([])
  const [mustEats,    setMustEats]    = useState<MapMustEat[]>([])
  const [categories,  setCategories]  = useState<CategoryDef[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  // Bump when refetch() is invoked to re-fire the fetch effect.
  const [tick,        setTick]        = useState(0)
  const refetch = useCallback(() => setTick((n) => n + 1), [])

  // Track latest effect to avoid setting state from a stale fetch when uid
  // changes mid-request (e.g. sign-out during a fetch).
  const latestReqRef = useRef(0)

  useEffect(() => {
    // Pause while auth is still resolving — we don't want to issue an
    // anonymous fetch that the auth-loaded fetch will immediately replace.
    if (authLoading) return

    const reqId = ++latestReqRef.current
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const headers: HeadersInit = {}
        if (uid && auth.currentUser) {
          const token = await auth.currentUser.getIdToken()
          headers['Authorization'] = `Bearer ${token}`
        }
        const r = await fetch('/api/map-data', { headers })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const json = await r.json()
        if (latestReqRef.current !== reqId) return  // stale — newer fetch in flight
        setRestaurants(json.restaurants ?? [])
        setMustEats(json.mustEats ?? [])
        setCategories(json.categories ?? [])
      } catch (e) {
        if (latestReqRef.current !== reqId) return
        setError((e as Error).message)
      } finally {
        if (latestReqRef.current === reqId) setLoading(false)
      }
    })()
  }, [uid, authLoading, tick])

  return { restaurants, mustEats, categories, loading, error, refetch }
}
