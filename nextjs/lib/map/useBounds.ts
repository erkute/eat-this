'use client'
import { useState, useCallback, useMemo } from 'react'
import type { MapRestaurant } from '../types'
import { haversineDistance } from './distance'
import type { UserLocation } from './useUserLocation'

interface Bounds {
  north: number
  south: number
  east: number
  west: number
}

export function useBounds(restaurants: MapRestaurant[], userLocation: UserLocation | null) {
  const [bounds, setBounds] = useState<Bounds | null>(null)

  const updateBounds = useCallback((b: Bounds) => setBounds(b), [])

  const visibleRestaurants = useMemo(() => {
    const visible = bounds
      ? restaurants.filter(
          r =>
            r.lat >= bounds.south &&
            r.lat <= bounds.north &&
            r.lng >= bounds.west &&
            r.lng <= bounds.east
        )
      : restaurants

    if (!userLocation) return visible

    return [...visible].sort((a, b) => {
      const da = haversineDistance(userLocation.lat, userLocation.lng, a.lat, a.lng)
      const db = haversineDistance(userLocation.lat, userLocation.lng, b.lat, b.lng)
      return da - db
    })
  }, [bounds, restaurants, userLocation])

  return { bounds, updateBounds, visibleRestaurants }
}
