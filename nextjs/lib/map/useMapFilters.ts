import { useCallback, useMemo, useState } from 'react'
import type { MapRestaurant, MapMustEat, MapCategory } from '@/lib/types'
import { getOpenStatus } from './openingHours'
import { haversineDistance } from './distance'

export type SortMode = 'distance' | 'price' | 'newest'
export type SortDir = 'asc' | 'desc'

/* Per-mode default direction. Picking a fresh sort mode shouldn't surprise the
   user with a counterintuitive order — distance starts closest-first, newest
   starts newest-first, price starts cheapest-first. */
const DEFAULT_SORT_DIR: Record<SortMode, SortDir> = {
  distance: 'asc',
  newest:   'desc',
  price:    'asc',
}

interface Args {
  restaurants: MapRestaurant[]
  mustEats: MapMustEat[]
  location: { lat: number; lng: number } | null
}

function districtOf(r: MapRestaurant): string | null {
  return r.bezirk?.name ?? r.district ?? null
}

export function useMapFilters({ restaurants, mustEats, location }: Args) {
  const [category, setCategory] = useState<MapCategory>('All')
  const [search,   setSearch]   = useState('')
  const [bezirk,   setBezirk]   = useState<string | null>(null)
  const [openOnly, setOpenOnly] = useState(false)
  const [sort,     setSortRaw]  = useState<SortMode>('distance')
  const [sortDir,  setSortDir]  = useState<SortDir>(DEFAULT_SORT_DIR.distance)

  /* Picking a sort mode resets direction to that mode's sensible default —
     otherwise switching from `distance asc` to `newest` would land on
     `newest asc` (oldest first), which is rarely what a user wants. */
  const setSort = useCallback((next: SortMode) => {
    setSortRaw(next)
    setSortDir(DEFAULT_SORT_DIR[next])
  }, [])

  const toggleSortDir = useCallback(() => {
    setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
  }, [])

  // Bezirk centroid index — used by handleBezirkChange to flyTo and by
  // FilterDropdown to render the available bezirke.
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

  // A non-empty search query overrides all other filters: the user expects to
  // find anything on the map regardless of the active bezirk/category/open
  // selection.
  const filterRestaurant = useCallback((r: MapRestaurant): boolean => {
    const q = search.trim().toLowerCase()
    if (q) {
      const hit =
        r.name.toLowerCase().includes(q) ||
        (districtOf(r) ?? '').toLowerCase().includes(q) ||
        r.categories?.some(c =>
          c.name.toLowerCase().includes(q) ||
          c.nameEn?.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q),
        )
      return Boolean(hit)
    }
    if (category !== 'All' && !r.categories?.some(c => c.slug === category)) return false
    if (bezirk && districtOf(r) !== bezirk) return false
    if (openOnly) {
      if (!r.openingHours) return false
      if (!getOpenStatus(r.openingHours).isOpen) return false
    }
    return true
  }, [category, bezirk, openOnly, search])

  const displayedRestaurants = useMemo(() => {
    const filtered = restaurants.filter(filterRestaurant)
    /* Comparators below are written in *natural ascending* order (€ → €€€€,
       oldest → newest, closest → farthest); `dirMul` flips them when the user
       toggles direction. */
    const dirMul = sortDir === 'asc' ? 1 : -1
    if (sort === 'price') {
      // Restaurants without a Places-derived price range sort to the end
      // regardless of direction so the user always sees priced spots first.
      const rank = (r: MapRestaurant): number => r.priceRange?.min ?? Number.POSITIVE_INFINITY
      return [...filtered].sort((a, b) => {
        const ra = rank(a)
        const rb = rank(b)
        if (ra === rb) return a.name.localeCompare(b.name, 'de')
        if (ra === Number.POSITIVE_INFINITY) return 1
        if (rb === Number.POSITIVE_INFINITY) return -1
        return (ra - rb) * dirMul
      })
    }
    if (sort === 'newest') {
      // Sanity `_createdAt` is ISO 8601, so lexicographic compare = chronological.
      return [...filtered].sort((a, b) => a._createdAt.localeCompare(b._createdAt) * dirMul)
    }
    if (!location) return filtered
    return [...filtered].sort((a, b) => {
      const aD = haversineDistance(location.lat, location.lng, a.lat, a.lng)
      const bD = haversineDistance(location.lat, location.lng, b.lat, b.lng)
      return (aD - bD) * dirMul
    })
  }, [restaurants, filterRestaurant, sort, sortDir, location])

  // Default sort: distance from user location, falling back to Berlin Mitte
  // when GPS is unavailable. With a bezirk filter, in-bezirk items float to
  // the top while everything else stays sorted by distance below them.
  const displayedMustEats = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? mustEats.filter(
          m =>
            m.dish.toLowerCase().includes(q) ||
            m.restaurant.name.toLowerCase().includes(q) ||
            m.restaurant.district?.toLowerCase().includes(q)
        )
      : mustEats
    const sortLat = location?.lat ?? 52.52
    const sortLng = location?.lng ?? 13.405
    return [...filtered].sort((a, b) => {
      if (bezirk) {
        const aMatch = a.restaurant.district === bezirk
        const bMatch = b.restaurant.district === bezirk
        if (aMatch !== bMatch) return aMatch ? -1 : 1
      }
      const aD = haversineDistance(sortLat, sortLng, a.restaurant.lat, a.restaurant.lng)
      const bD = haversineDistance(sortLat, sortLng, b.restaurant.lat, b.restaurant.lng)
      return aD - bD
    })
  }, [mustEats, search, bezirk, location])

  return {
    category, setCategory,
    search, setSearch,
    bezirk, setBezirk,
    openOnly, setOpenOnly,
    sort, setSort,
    sortDir, toggleSortDir,
    bezirkNames, bezirkCenters,
    displayedRestaurants,
    displayedMustEats,
  }
}
