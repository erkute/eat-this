import { useCallback, useMemo, useState } from 'react'
import type { MapRestaurant, MapCategory, MapMustEat } from '@/lib/types'
import { getOpenStatus } from './openingHours'
import { haversineDistance } from './distance'

interface Args {
  restaurants: MapRestaurant[]
  /** Paywalled spots. Run through the same filter so the empty state can say
   *  how many matches are held back and the map can dot them in. */
  lockedRestaurants?: MapRestaurant[]
  mustEats?: MapMustEat[]
  location: { lat: number; lng: number } | null
}

function districtOf(r: MapRestaurant): string | null {
  return r.bezirk?.name ?? r.district ?? null
}

function includesQuery(value: string | null | undefined, q: string): boolean {
  return Boolean(value?.toLowerCase().includes(q))
}

export function useMapFilters({ restaurants, lockedRestaurants = [], mustEats = [], location }: Args) {
  const [category, setCategory] = useState<MapCategory>('All')
  const [search,   setSearch]   = useState('')
  const [bezirk,   setBezirk]   = useState<string | null>(null)
  const [cuisine,  setCuisine]  = useState<string | null>(null)
  const [openOnly, setOpenOnly] = useState(false)

  // Bezirk centroid index — used by handleBezirkChange to flyTo the
  // selected district's center.
  const { bezirkNames, bezirkCenters } = useMemo(() => {
    const groups = new Map<string, { lat: number; lng: number; count: number }>()
    for (const r of restaurants) {
      const d = districtOf(r)
      if (!d) continue
      const g = groups.get(d)
      if (g) { g.lat += r.lat; g.lng += r.lng; g.count += 1 }
      else    { groups.set(d, { lat: r.lat, lng: r.lng, count: 1 }) }
    }
    const names: string[] = []
    const centers = new Map<string, { lat: number; lng: number }>()
    for (const [name, g] of groups) {
      names.push(name)
      centers.set(name, { lat: g.lat / g.count, lng: g.lng / g.count })
    }
    names.sort((a, b) => a.localeCompare(b, 'de'))
    return { bezirkNames: names, bezirkCenters: centers }
  }, [restaurants])

  // Distinct cuisine values across the visible set — used to populate the
  // Cuisine picker. Sorted alphabetically (German collation).
  const cuisineNames = useMemo(() => {
    const set = new Set<string>()
    for (const r of restaurants) {
      const c = r.cuisineType?.trim()
      if (c) set.add(c)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'))
  }, [restaurants])

  const dishIndexByRestaurantId = useMemo(() => {
    const index = new Map<string, string>()
    for (const mustEat of mustEats) {
      const restaurantId = mustEat.restaurant?._id
      const dish = mustEat.dish?.trim()
      if (!restaurantId || !dish) continue
      index.set(restaurantId, `${index.get(restaurantId) ?? ''} ${dish.toLowerCase()}`)
    }
    return index
  }, [mustEats])

  // A non-empty search query overrides all other filters: the user expects to
  // find anything on the map regardless of the active bezirk/category/open
  // selection.
  const filterRestaurant = useCallback((r: MapRestaurant): boolean => {
    const q = search.trim().toLowerCase()
    if (q) {
      const dishIndex = dishIndexByRestaurantId.get(r._id) ?? ''
      const hit =
        includesQuery(r.name, q) ||
        includesQuery(districtOf(r), q) ||
        includesQuery(r.cuisineType, q) ||
        dishIndex.includes(q) ||
        r.categories?.some(c =>
          includesQuery(c.name, q) ||
          includesQuery(c.nameEn, q) ||
          includesQuery(c.slug, q),
        )
      return Boolean(hit)
    }
    if (category !== 'All' && !r.categories?.some(c => c.slug === category)) return false
    if (bezirk && districtOf(r) !== bezirk) return false
    if (cuisine && r.cuisineType !== cuisine) return false
    if (openOnly) {
      if (!r.openingHours) return false
      if (!getOpenStatus(r.openingHours).isOpen) return false
    }
    return true
  }, [category, bezirk, cuisine, openOnly, search, dishIndexByRestaurantId])

  const displayedRestaurants = useMemo(() => {
    const filtered = restaurants.filter(filterRestaurant)
    if (!location) return filtered
    return [...filtered].sort((a, b) => {
      const aD = haversineDistance(location.lat, location.lng, a.lat, a.lng)
      const bD = haversineDistance(location.lat, location.lng, b.lat, b.lng)
      return aD - bD
    })
  }, [restaurants, filterRestaurant, location])

  // The same filter applied to the locked rows. Two consumers, both uncapped:
  // the empty state names how many matches the paywall is holding back, and
  // the map draws each one as a muted dot so the locked catalogue is visible
  // instead of simply absent. The list is never rendered as rows.
  const displayedLockedRestaurants = useMemo(
    () => lockedRestaurants.filter(filterRestaurant),
    [lockedRestaurants, filterRestaurant],
  )

  const lockedMatchCount = displayedLockedRestaurants.length

  return {
    category, setCategory,
    search, setSearch,
    bezirk, setBezirk,
    cuisine, setCuisine,
    openOnly, setOpenOnly,
    bezirkNames, bezirkCenters,
    cuisineNames,
    displayedRestaurants,
    displayedLockedRestaurants,
    lockedMatchCount,
  }
}
