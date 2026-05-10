'use client'
import { useState, useEffect } from 'react'
import type { MapRestaurant, MapMustEat } from '../types'
import type { CategoryDef } from '../categories'

interface MapData {
  restaurants: MapRestaurant[]
  mustEats: MapMustEat[]
  categories: CategoryDef[]
  loading: boolean
  error: string | null
}

export function useMapData(): MapData {
  const [restaurants, setRestaurants] = useState<MapRestaurant[]>([])
  const [mustEats, setMustEats] = useState<MapMustEat[]>([])
  const [categories, setCategories] = useState<CategoryDef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/map-data')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(({ restaurants, mustEats, categories }) => {
        setRestaurants(restaurants)
        setMustEats(mustEats)
        setCategories(categories ?? [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { restaurants, mustEats, categories, loading, error }
}
