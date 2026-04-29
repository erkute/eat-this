'use client'
import { useState, useEffect } from 'react'
import type { MapRestaurant, MapMustEat } from '../types'

interface MapData {
  restaurants: MapRestaurant[]
  mustEats: MapMustEat[]
  loading: boolean
  error: string | null
}

export function useMapData(): MapData {
  const [restaurants, setRestaurants] = useState<MapRestaurant[]>([])
  const [mustEats, setMustEats] = useState<MapMustEat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/map-data')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(({ restaurants, mustEats }) => {
        setRestaurants(restaurants)
        setMustEats(mustEats)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { restaurants, mustEats, loading, error }
}
