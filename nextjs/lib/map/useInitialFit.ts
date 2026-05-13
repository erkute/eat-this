'use client'
import { useEffect, useRef, type RefObject } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import type { MapRestaurant } from '@/lib/types'

const WIDE_OWNER_THRESHOLD = 100   // ≥ this many spots → leave at Berlin default

/**
 * One-shot map auto-fit for owners of a small spot set (starter / 1-3
 * categories). Fires once on the first non-empty `restaurants` change
 * after mount, then never again — Sub-Project 4's post-purchase
 * choreography resets `didInitialFitRef.current = false` before the
 * reveal to trigger a second fit on the expanded set.
 */
export function useInitialFit(
  mapRef: RefObject<MapRef | null>,
  restaurants: MapRestaurant[],
): { resetFit: () => void } {
  const didInitialFitRef = useRef(false)

  useEffect(() => {
    if (didInitialFitRef.current)                  return
    if (!restaurants.length)                       return
    if (restaurants.length >= WIDE_OWNER_THRESHOLD) return

    const map = mapRef.current
    if (!map) return

    const lngs = restaurants.map((r) => r.lng)
    const lats = restaurants.map((r) => r.lat)
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 80, duration: 600, maxZoom: 14 },
    )
    didInitialFitRef.current = true
  }, [restaurants, mapRef])

  const resetFit = () => { didInitialFitRef.current = false }
  return { resetFit }
}
