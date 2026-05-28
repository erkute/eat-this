'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { auth } from '@/lib/firebase/config'
import type { MapRestaurant, MapMustEat } from '../types'
import type { CategoryDef } from '../categories'
import type { InitialMapData } from './server-initial-map-data'

interface UseMapDataArgs {
  uid:             string | null
  authLoading:     boolean
  /** Optional SSR-supplied initial state. When set, the hook hydrates with
   *  this data instead of empty arrays + loading: true. Anon visitors then
   *  skip the initial fetch entirely; signed-in users still refetch on mount
   *  to pull their +20 signed tier + entitlement-based catalog union. */
  initialMapData?: InitialMapData
}

interface MapData {
  restaurants: MapRestaurant[]
  /** Visible-but-locked rows — rendered as blurred preview entries in the
   *  list so anon/partial-entitlement viewers see catalog depth. Click on a
   *  locked row routes to the booster/signup flow, not the detail view. */
  lockedRestaurants: MapRestaurant[]
  mustEats:    MapMustEat[]
  categories:  CategoryDef[]
  /** Total restaurant count in Sanity — independent of trial cap / entitlements.
   *  Surfaced so the sheet-count-mini reads catalog size, not filtered result. */
  totalCount:  number
  /** Must-eat IDs that are pre-revealed for anonymous visitors (face-up card).
   *  All other must-eats on visible restaurants render as coveredAnon (blurred,
   *  non-interactive). Empty for signed-in users — their entitlements drive
   *  the unlocked/locked split instead. */
  revealedMustEatIds: Set<string>
  loading:     boolean
  error:       string | null
  refetch:     () => void
}


export function useMapData({ uid, authLoading, initialMapData }: UseMapDataArgs): MapData {
  const [restaurants,         setRestaurants]         = useState<MapRestaurant[]>(initialMapData?.restaurants ?? [])
  const [lockedRestaurants,   setLockedRestaurants]   = useState<MapRestaurant[]>(initialMapData?.lockedRestaurants ?? [])
  const [mustEats,            setMustEats]            = useState<MapMustEat[]>(initialMapData?.mustEats ?? [])
  const [categories,          setCategories]          = useState<CategoryDef[]>(initialMapData?.categories ?? [])
  const [totalCount,          setTotalCount]          = useState(initialMapData?.totalCount ?? 0)
  const [revealedMustEatIds,  setRevealedMustEatIds]  = useState<Set<string>>(() =>
    new Set<string>(initialMapData?.revealedMustEatIds ?? []),
  )
  // With SSR data, we're not loading on first paint — anon view is already
  // rendered. Otherwise show loading until the fetch lands.
  const [loading,           setLoading]           = useState(!initialMapData)
  const [error,             setError]             = useState<string | null>(null)
  // Bump when refetch() is invoked to re-fire the fetch effect.
  const [tick,        setTick]        = useState(0)
  const refetch = useCallback(() => setTick((n) => n + 1), [])

  // Track latest effect to avoid setting state from a stale fetch when uid
  // changes mid-request (e.g. sign-out during a fetch).
  const latestReqRef = useRef(0)

  // Anon-with-SSR mount-skip: if we hydrated with initialMapData AND the
  // user is anonymous (uid === null), the data we already have IS the correct
  // anon view. Skip the initial fetch to avoid a redundant network round-trip.
  // Manual refetch (tick > 0) and login (uid changes) still trigger via the
  // same effect — this only short-circuits the very first run.
  const skipInitialAnonFetchRef = useRef(!!initialMapData)

  useEffect(() => {
    // Pause while auth is still resolving — we don't want to issue an
    // anonymous fetch that the auth-loaded fetch will immediately replace.
    if (authLoading) return

    if (skipInitialAnonFetchRef.current && uid === null && tick === 0) {
      skipInitialAnonFetchRef.current = false
      setLoading(false)
      return
    }
    skipInitialAnonFetchRef.current = false

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
        setLockedRestaurants(json.lockedRestaurants ?? [])
        setMustEats(json.mustEats ?? [])
        setCategories(json.categories ?? [])
        setTotalCount(json.totalCount ?? 0)
        setRevealedMustEatIds(new Set<string>(json.revealedMustEatIds ?? []))
      } catch (e) {
        if (latestReqRef.current !== reqId) return
        setError((e as Error).message)
      } finally {
        if (latestReqRef.current === reqId) setLoading(false)
      }
    })()
  }, [uid, authLoading, tick])

  return { restaurants, lockedRestaurants, mustEats, categories, totalCount, revealedMustEatIds, loading, error, refetch }
}
