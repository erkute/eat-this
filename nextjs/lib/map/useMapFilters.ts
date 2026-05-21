import { useCallback, useMemo, useState } from 'react'
import type { MapRestaurant, MapMustEat, MapCategory } from '@/lib/types'
import { getOpenStatus } from './openingHours'
import { haversineDistance } from './distance'

// Locked-preview teaser cap. Matched die „20 weitere Spots"-Booster-Copy
// damit der Reveal nach Signup gefühlt 1:1 das ist was unter dem Banner
// blurry war. 150 Rows wären Overwhelm, 20 fühlt sich machbar an.
const LOCKED_PREVIEW_SIZE = 20

interface Args {
  restaurants: MapRestaurant[]
  /** Visible-but-not-clickable preview rows — filtered through the same
   *  pipeline so a Pizza-Filter shrinks both unlocked AND locked groups. */
  lockedRestaurants?: MapRestaurant[]
  mustEats: MapMustEat[]
  location: { lat: number; lng: number } | null
}

function districtOf(r: MapRestaurant): string | null {
  return r.bezirk?.name ?? r.district ?? null
}

export function useMapFilters({ restaurants, lockedRestaurants = [], mustEats, location }: Args) {
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
    if (cuisine && r.cuisineType !== cuisine) return false
    if (openOnly) {
      if (!r.openingHours) return false
      if (!getOpenStatus(r.openingHours).isOpen) return false
    }
    return true
  }, [category, bezirk, cuisine, openOnly, search])

  const displayedRestaurants = useMemo(() => {
    const filtered = restaurants.filter(filterRestaurant)
    if (!location) return filtered
    return [...filtered].sort((a, b) => {
      const aD = haversineDistance(location.lat, location.lng, a.lat, a.lng)
      const bD = haversineDistance(location.lat, location.lng, b.lat, b.lng)
      return aD - bD
    })
  }, [restaurants, filterRestaurant, location])

  // Same filter + distance sort applied to the locked preview rows. Keeps
  // the locked group consistent with the active filter — Pizza filter
  // shrinks BOTH unlocked-pizza AND locked-pizza groups. Capped at 20 so
  // the list reads as a teaser („20 weitere Spots") not a dump of 150 rows.
  const displayedLockedRestaurants = useMemo(() => {
    const filtered = lockedRestaurants.filter(filterRestaurant)
    const sorted = location
      ? [...filtered].sort((a, b) => {
          const aD = haversineDistance(location.lat, location.lng, a.lat, a.lng)
          const bD = haversineDistance(location.lat, location.lng, b.lat, b.lng)
          return aD - bD
        })
      : filtered
    return sorted.slice(0, LOCKED_PREVIEW_SIZE)
  }, [lockedRestaurants, filterRestaurant, location])

  /* Restaurant-by-ID index so a must-eat can be tested against the same
     filters as its parent restaurant (categories, cuisine, openingHours).
     The embedded `mustEat.restaurant` shape only carries id/name/lat/lng,
     so without this lookup we'd be missing the fields the filters check. */
  const restaurantById = useMemo(() => {
    const map = new Map<string, MapRestaurant>()
    for (const r of restaurants) map.set(r._id, r)
    return map
  }, [restaurants])

  // Must-eats inherit the active restaurant filter — Kategorie/Küche/Bezirk/
  // Jetzt-offen apply via the parent restaurant. Default sort: distance from
  // user location, falling back to Berlin Mitte when GPS is unavailable.
  const displayedMustEats = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = mustEats.filter(m => {
      if (q) {
        const hit =
          m.dish.toLowerCase().includes(q) ||
          m.restaurant.name.toLowerCase().includes(q) ||
          (m.restaurant.district ?? '').toLowerCase().includes(q)
        return Boolean(hit)
      }
      const parent = restaurantById.get(m.restaurant._id)
      // No parent in the current restaurant set → drop (out of view filter scope).
      if (!parent) return false
      return filterRestaurant(parent)
    })
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
  }, [mustEats, search, bezirk, location, restaurantById, filterRestaurant])

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
    displayedMustEats,
  }
}
