import { useEffect, useRef, useState, type RefObject } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import type { MapRestaurant, MapMustEat } from '@/lib/types'
import { pollUntilMapReady } from './pollUntilMapReady'

interface Bbox { west: number; south: number; east: number; north: number }

function districtOf(r: MapRestaurant): string | null {
  return r.bezirk?.name ?? r.district ?? null
}

function computeBezirkBbox(filtered: MapRestaurant[]): Bbox | null {
  if (filtered.length === 0) return null
  let west = filtered[0].lng
  let east = filtered[0].lng
  let south = filtered[0].lat
  let north = filtered[0].lat
  for (const r of filtered) {
    if (r.lng < west) west = r.lng
    if (r.lng > east) east = r.lng
    if (r.lat < south) south = r.lat
    if (r.lat > north) north = r.lat
  }
  // 10 % padding on each side so markers aren't flush to the bbox edges.
  const padX = (east - west) * 0.1 || 0.005
  const padY = (north - south) * 0.1 || 0.005
  return { west: west - padX, east: east + padX, south: south - padY, north: north + padY }
}

interface Args {
  mapRef: RefObject<MapRef | null>
  restaurants: MapRestaurant[]
  /** Visible-but-locked spots (the rest of the catalog the user doesn't own).
   *  Deep-links must reach these too — a hub card can point at any restaurant,
   *  not just the ones in the user's tier. The detail opens in its locked state
   *  (covered must-eats + upsell). */
  lockedRestaurants: MapRestaurant[]
  mustEats: MapMustEat[]
  isActive: boolean
  sheetView: 'list' | 'detail'
  userInteractedRef: RefObject<boolean>
  setBezirk: (name: string | null) => void
  setCategory: (slug: string) => void
  setSnap: (snap: 'peek' | 'mid' | 'full') => void
  onRestaurantSlugMatch: (r: MapRestaurant) => void
  onMustEatIdMatch: (m: MapMustEat) => void
}

export function useMapDeepLinks({
  mapRef,
  restaurants,
  lockedRestaurants,
  mustEats,
  isActive,
  sheetView,
  userInteractedRef,
  setBezirk,
  setCategory,
  setSnap,
  onRestaurantSlugMatch,
  onMustEatIdMatch,
}: Args) {
  // ?r=<slug> opens the matching restaurant detail directly. Used by profile
  // favourites and any external link that wants to land on the map with a
  // specific spot already open. Polls mapRef so the flyTo doesn't silently
  // no-op if the canvas hasn't finished mounting yet.
  // Hold the (frequently re-created) handler in a ref so it's NOT a dependency
  // — same reasoning as the ?me= effect below.
  const onRestaurantSlugMatchRef = useRef(onRestaurantSlugMatch)
  onRestaurantSlugMatchRef.current = onRestaurantSlugMatch
  const restaurantConsumed = useRef(false)
  const [restaurantPollTarget, setRestaurantPollTarget] = useState<MapRestaurant | null>(null)
  useEffect(() => {
    if (restaurantConsumed.current) return
    if (!isActive) return
    if (restaurants.length === 0 && lockedRestaurants.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const slug = params.get('r')
    if (!slug) return
    // Search owned + locked: a hub/news link can target any spot in the
    // catalog, not just the user's tier. Locked spots open in their locked
    // detail (covered must-eats + upsell) rather than silently no-op'ing.
    const target = restaurants.find(r => r.slug === slug) ?? lockedRestaurants.find(r => r.slug === slug)
    if (!target) return
    restaurantConsumed.current = true
    // The param deliberately STAYS in the URL: the detail-URL-sync effect in
    // MapSection keeps it in step with the open detail, so pull-to-refresh
    // reopens the spot instead of dropping to the list. Same-session
    // re-trigger is prevented by the consumed guard above.
    // Open the detail IMMEDIATELY from the SSR'd data — it only sets state and
    // the sheet/sidebar is already in the SSR shell, so it must NOT wait for the
    // ~800 KB MapLibre canvas chunk to download (that was the "spot takes long
    // to open after clicking" delay). The handler's flyTo uses optional
    // chaining, so it simply no-ops while mapRef is null.
    userInteractedRef.current = true
    onRestaurantSlugMatchRef.current(target)
    // Re-run once the canvas mounts so the camera flies to the spot. Keeping
    // this target in state lets the bounded poll survive unrelated data
    // updates while still being cancelled on deactivation/unmount.
    setRestaurantPollTarget(target)
  }, [isActive, restaurants, lockedRestaurants, userInteractedRef])

  useEffect(() => {
    if (!isActive || !restaurantPollTarget) return
    return pollUntilMapReady({
      mapRef,
      onReady: () => {
        onRestaurantSlugMatchRef.current(restaurantPollTarget)
        setRestaurantPollTarget(null)
      },
      onTimeout: () => setRestaurantPollTarget(null),
    })
  }, [isActive, mapRef, restaurantPollTarget])

  // ?me=<mustEatId> opens the matching Must-Eat detail directly. Used by the
  // inline must-eat cards in news articles. Reuses the in-app tap handler so
  // locked/unlocked behaviour is identical. Mirrors the ?r= polling pattern.
  // Hold the (frequently re-created) handler in a ref so it's NOT an effect
  // dependency — otherwise its identity churn (sheetView/snap changes) re-runs
  // the effect, whose cleanup cancels the in-flight mapRef poll, and the
  // consumed-guard then blocks a restart → the detail never opens on a cold
  // article→map navigation.
  const onMustEatIdMatchRef = useRef(onMustEatIdMatch)
  onMustEatIdMatchRef.current = onMustEatIdMatch
  const mustEatConsumed = useRef(false)
  const [mustEatPollTarget, setMustEatPollTarget] = useState<MapMustEat | null>(null)
  useEffect(() => {
    if (mustEatConsumed.current) return
    if (!isActive) return
    if (mustEats.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const id = params.get('me')
    if (!id) return
    const target = mustEats.find(m => m._id === id)
    if (!target) return
    mustEatConsumed.current = true
    // Param stays in the URL — see the ?r= effect above (URL sync lives in
    // MapSection; refresh should reopen the card, guard prevents re-trigger).
    setMustEatPollTarget(target)
  }, [isActive, mustEats])

  useEffect(() => {
    if (!isActive || !mustEatPollTarget) return
    const openTarget = () => {
      userInteractedRef.current = true
      onMustEatIdMatchRef.current(mustEatPollTarget)
      setMustEatPollTarget(null)
    }
    return pollUntilMapReady({
      mapRef,
      onReady: openTarget,
      // The detail handler already tolerates a null mapRef. If the MapLibre
      // chunk never mounts, open the requested card once and stop polling.
      onTimeout: openTarget,
    })
  }, [isActive, mapRef, mustEatPollTarget, userInteractedRef])

  // ?bezirk=<slug> pre-selects a bezirk filter and fits the camera to show all
  // restaurants in that district. Mirrors the ?r= polling pattern above. Note
  // we intentionally keep the param in the URL so the filtered view stays
  // bookmark/share-friendly — reset is via the pill ✕.
  const bezirkConsumed = useRef(false)
  const [bezirkBboxTarget, setBezirkBboxTarget] = useState<Bbox | null>(null)
  useEffect(() => {
    if (bezirkConsumed.current) return
    if (!isActive) return
    if (restaurants.length === 0 && lockedRestaurants.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const slug = params.get('bezirk')
    if (!slug) return
    const slugLower = slug.toLowerCase()
    // Search owned + locked: a district may have ONLY locked spots (e.g.
    // Friedenau for a free user). We still want to set the filter so the list
    // shows those spots as locked previews + the booster upsell — not a dead
    // "filter never applied" click.
    const all = restaurants.concat(lockedRestaurants)
    const match = all.find(
      r => (r.bezirk?.slug ?? '').toLowerCase() === slugLower,
    )
    if (!match || !match.bezirk?.name) {
      bezirkConsumed.current = true
      return
    }
    bezirkConsumed.current = true
    userInteractedRef.current = true
    const bezirkName = match.bezirk.name
    setBezirk(bezirkName)
    if (sheetView === 'list') setSnap('mid')
    const filtered = all.filter(r => districtOf(r) === bezirkName)
    const bbox = computeBezirkBbox(filtered)
    if (!bbox) return
    setBezirkBboxTarget(bbox)
  }, [isActive, restaurants, lockedRestaurants, sheetView, setSnap, setBezirk, userInteractedRef])

  useEffect(() => {
    if (!isActive || !bezirkBboxTarget) return
    return pollUntilMapReady({
      mapRef,
      onReady: (map) => {
        map.fitBounds(
          [
            [bezirkBboxTarget.west, bezirkBboxTarget.south],
            [bezirkBboxTarget.east, bezirkBboxTarget.north],
          ],
          { padding: 60, duration: 800 },
        )
        setBezirkBboxTarget(null)
      },
      onTimeout: () => setBezirkBboxTarget(null),
    })
  }, [bezirkBboxTarget, isActive, mapRef])

  // ?cat=<slug> pre-selects a category filter so a hub "Pizza"/"Frühstück"/
  // "Drinks" card (and the Deine-Welt pack CTA) lands on the map with that
  // filter already applied. We resolve to the exact slug the restaurants use
  // (case-safe) and only set it if it actually matches something — an unknown
  // slug is ignored so the map doesn't show an empty filtered list. The param
  // stays in the URL so the filtered view is shareable; the category chip UI
  // clears it.
  const categoryConsumed = useRef(false)
  useEffect(() => {
    if (categoryConsumed.current) return
    if (!isActive) return
    if (restaurants.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const slug = params.get('cat')
    if (!slug) return
    categoryConsumed.current = true
    const slugLower = slug.toLowerCase()
    const canonical = restaurants
      .flatMap(r => r.categories ?? [])
      .find(c => (c.slug ?? '').toLowerCase() === slugLower)?.slug
    if (!canonical) return
    userInteractedRef.current = true
    setCategory(canonical)
    if (sheetView === 'list') setSnap('mid')
  }, [isActive, restaurants, sheetView, setSnap, setCategory, userInteractedRef])
}
