'use client'
import { useState, useEffect } from 'react'
import { client } from '@/lib/sanity'
import { mapRestaurantsQuery, mapMustEatsQuery } from './queries'
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
    Promise.all([
      client.fetch<MapRestaurant[]>(mapRestaurantsQuery),
      client.fetch<MapMustEat[]>(mapMustEatsQuery),
    ])
      .then(([r, m]) => {
        setRestaurants(r)
        setMustEats(m)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { restaurants, mustEats, loading, error }
}
