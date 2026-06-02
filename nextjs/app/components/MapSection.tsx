'use client'
import { useRef, useState, useMemo, useCallback, useEffect, useLayoutEffect } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import type { MapRestaurant, MapMustEat, MapLayer } from '@/lib/types'
import {
  useMapData,
  useUserLocation,
  useBounds,
  useUnlockedMustEats,
  useFavorites,
  useInitialFit,
  useMapFilters,
  useMapSheet,
  useMapDeepLinks,
  useUserTier,
  applyFanOffset,
  buildPrimaryMustEatMap,
} from '@/lib/map'
import { useTranslation } from '@/lib/i18n'
import { useLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import MapSectionBody from './map/MapSectionBody'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import { auth, db } from '@/lib/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, onSnapshot } from 'firebase/firestore'

interface Props {
  isActive?:       boolean
  initialMapData?: InitialMapData
}

export default function MapSection({ isActive = false, initialMapData }: Props) {
  const mapRef = useRef<MapRef>(null)
  // Set true synchronously in any click handler that flies the camera so
  // the slow auto-locate Promise can't overwrite the user's selection.
  const userInteractedRef = useRef(false)
  /* Tracks woher der gerade offene Must-Eat-Detail aufgemacht wurde, damit
     der Zurück-Button die Origin-View wiederherstellt:
     - 'restaurant' = aus dem Restaurant-Detail heraus → zurück zum Restaurant
     - 'list'       = direkter Map-Marker-Klick oder Click in der Must-Eats-Liste
                      → zurück zur Must-Eats-Liste */
  const mustEatOriginRef = useRef<'restaurant' | 'list'>('list')
  const { t } = useTranslation()
  const locale = useLocale()

  const [uid,         setUid]         = useState<string | null>(() => auth.currentUser?.uid ?? null)
  const [authLoading, setAuthLoading] = useState<boolean>(() => auth.currentUser === null)

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUid(u?.uid ?? null)
    setAuthLoading(false)
  }), [])

  // Map is open access — non-authed visitors can browse all 20 trial
  // restaurants and their must-eats. No login wall on entry.

  const {
    restaurants,
    lockedRestaurants,
    mustEats,
    categories,
    totalCount,
    revealedMustEatIds,
    refetch: refetchMapData,
  } = useMapData({ uid, authLoading, initialMapData })
  useInitialFit(mapRef, restaurants)
  const { location, request: requestLocation } = useUserLocation()
  const { unlockedIds: storedUnlockedIds, unlock } = useUnlockedMustEats(uid)
  // Free-and-open trial — 10/10 split: the first half of the trial-20
  // restaurants (deterministic order from /api/map-data, most-must-eats
  // first) get their must-eats unlocked; the second half stays locked
  // (card-back). Gives the map a sense of „discover more" without a
  // signup wall. Authed users keep the stored Firestore unlock set.
  const TRIAL_UNLOCKED_COUNT = 10
  const unlockedIds = useMemo(() => {
    if (uid) {
      // Signed-in: Firestore-collected reveals ∪ the server-curated revealed
      // set (the SAME set the profile deck shows as teasers). The curated set
      // is on visible anon-tier spots, so each revealed must-eat's spot shows.
      return new Set<string>([...storedUnlockedIds, ...revealedMustEatIds])
    }
    const unlockedRestaurantIds = new Set(
      restaurants.slice(0, TRIAL_UNLOCKED_COUNT).map((r) => r._id),
    )
    return new Set(
      mustEats
        .filter((m) => unlockedRestaurantIds.has(m.restaurant._id))
        .map((m) => m._id),
    )
  }, [uid, storedUnlockedIds, revealedMustEatIds, mustEats, restaurants])
  const { favoriteIds, toggle: toggleFavorite } = useFavorites(uid)
  const userTier = useUserTier(uid)

  // Live-refetch map data whenever the user's entitlements change (e.g. after purchase).
  useEffect(() => {
    if (!uid) return
    const ref = collection(db, 'users', uid, 'entitlements')
    return onSnapshot(ref, () => {
      refetchMapData()
    })
  }, [uid, refetchMapData])

  // Live-refetch when a referral bonus lands — covers both the inviter
  // (friend just signed up) and the friend (their welcome bonus was written).
  useEffect(() => {
    if (!uid) return
    const ref = collection(db, 'users', uid, 'referralBonuses')
    return onSnapshot(ref, () => {
      refetchMapData()
    })
  }, [uid, refetchMapData])

  const [layer, setLayer] = useState<MapLayer>('restaurants')

  const {
    handleRef, contentRef, setContentRef, setHeaderRef,
    snap, setSnap, dragging, reapplySnap,
    sheetView, setSheetView,
    sheetElRef, setSheetRef,
  } = useMapSheet({ layer })

  const {
    category, setCategory,
    search, setSearch,
    bezirk, setBezirk,
    cuisine, setCuisine,
    openOnly, setOpenOnly,
    bezirkNames, bezirkCenters,
    cuisineNames,
    displayedRestaurants, displayedLockedRestaurants, displayedMustEats,
  } = useMapFilters({ restaurants, lockedRestaurants, mustEats, location })

  const [mapZoom,            setMapZoom]            = useState(12)
  const [selectedRestaurant, setSelectedRestaurant] = useState<MapRestaurant | null>(null)
  const [selectedMustEat,    setSelectedMustEat]    = useState<MapMustEat | null>(null)
  const [searchOpen,         setSearchOpen]         = useState(false)
  // Desktop-only: lets the user collapse the side panel off to the right so
  // the map fills the viewport (Google-Maps-style toggle).
  const [desktopPanelHidden, setDesktopPanelHidden] = useState(false)

  // Snap the sheet when entering detail view (or switching selections).
  // Preserve the full snap if the user was at full when clicking — Google
  // Maps does the same: clicking a place from the full-screen list keeps
  // you in the full-screen view. Otherwise default to mid.
  const snapRef = useRef(snap)
  snapRef.current = snap
  useLayoutEffect(() => {
    if (sheetView !== 'detail') return
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(max-width: 1023.98px)').matches) return
    const target = snapRef.current === 'full' ? 'full' : 'mid'
    setSnap(target)
    reapplySnap(target)
  }, [sheetView, selectedRestaurant?._id, selectedMustEat?._id, setSnap, reapplySnap])

  /* Scroll-restore for back-nav (list → detail → list):
     - listScrollRef captures the list's scrollTop just before a detail opens
       (in handleRestaurantClick / handleMustEatClick).
     - On return to the list view, the useLayoutEffect below restores it so
       the user lands where they left off, not at the top.
     - Filter / sort changes reset it to 0 so a new filter always starts at
       the top of the new result set. */
  const listScrollRef = useRef(0)
  const prevFiltersRef = useRef({ category, bezirk, cuisine, openOnly, search, layer })
  useEffect(() => {
    if (sheetView !== 'list') return
    const prev = prevFiltersRef.current
    const next = { category, bezirk, cuisine, openOnly, search, layer }
    prevFiltersRef.current = next
    const filtersChanged =
      prev.category !== next.category ||
      prev.bezirk !== next.bezirk ||
      prev.cuisine !== next.cuisine ||
      prev.openOnly !== next.openOnly ||
      prev.search !== next.search ||
      prev.layer !== next.layer
    if (!filtersChanged) return
    listScrollRef.current = 0
    const el = contentRef.current
    if (el) el.scrollTop = 0
  }, [sheetView, category, bezirk, cuisine, openOnly, search, layer, contentRef])

  useLayoutEffect(() => {
    if (sheetView !== 'list') return
    if (listScrollRef.current === 0) return
    const el = contentRef.current
    if (!el) return
    el.scrollTop = listScrollRef.current
  }, [sheetView, contentRef])

  const { updateBounds } = useBounds(displayedRestaurants, location)

  const handleMapMove = useCallback((bounds: Parameters<typeof updateBounds>[0]) => {
    updateBounds(bounds)
    // Avoid updating mapZoom on every pan tick (60×/s) — fanOffset only
    // changes behavior around z≈13.5, so only re-render when crossing the
    // threshold. Without this guard, every pan re-renders every must-eat
    // marker (the fanned memo is keyed on mapZoom).
    if (!mapRef.current) return
    const z = mapRef.current.getMap().getZoom()
    setMapZoom(prev => {
      const wasBelow = prev < 13.5
      const isBelow  = z   < 13.5
      return wasBelow !== isBelow ? z : prev
    })
  }, [updateBounds])

  const restaurantMustEats = useMemo(() => {
    if (!selectedRestaurant) return []
    return mustEats.filter(m => m.restaurant._id === selectedRestaurant._id)
  }, [mustEats, selectedRestaurant])

  const primaryMustEats = useMemo(
    () => buildPrimaryMustEatMap(mustEats),
    [mustEats],
  )

  const fannedMustEats = useMemo(
    () => applyFanOffset(displayedMustEats, mapZoom),
    [displayedMustEats, mapZoom]
  )

  /* ---------- Handlers ---------- */
  // Padding the map should respect when centering on a point, so spots don't
  // land behind the bottom sheet (mobile) or side panel (desktop).
  // We derive the mobile bottom from the snap STATE rather than the DOM
  // CSS variable so flyTo always uses the up-to-date target — reading from
  // the DOM races the sheet's transform/animation tick.
  const getFlyPadding = useCallback((targetSnap?: 'peek' | 'mid' | 'full') => {
    if (typeof window === 'undefined') return { top: 60, bottom: 60, left: 40, right: 40 }
    const isMobile = window.matchMedia('(max-width: 1023.98px)').matches
    if (!isMobile) {
      // Desktop: the map canvas IS the left grid cell — the side panel is
      // outside the canvas. Reserve a bit of room at top (toolbar) and bottom
      // (zoom controls + FAB); horizontal stays symmetric so the marker lands
      // at the column's geometric center.
      return { top: 80, bottom: 100, left: 24, right: 24 }
    }
    // When the caller specifies a target snap, use known pixel heights for
    // that snap. Otherwise read the *actual* current sheet height from the
    // CSS var the bottom-sheet hook sets — this is the only source of truth
    // that handles drag in-progress AND the content-fit detail snap.
    let visible: number
    if (targetSnap) {
      visible = targetSnap === 'peek' ? 28
        : targetSnap === 'mid' ? 440
        : Math.round(window.innerHeight * 0.58)
    } else {
      const cssVar = sheetElRef.current?.style.getPropertyValue('--sheet-visible-px')
      const parsed = cssVar ? parseFloat(cssVar) : NaN
      visible = Number.isFinite(parsed) && parsed > 0
        ? parsed
        : (snap === 'peek' ? 28 : snap === 'mid' ? 440 : Math.round(window.innerHeight * 0.58))
    }
    // top: 70 leaves room for the global header (~60 px) plus a tiny gap.
    // Centring then matches the geometric centre of the actually-visible
    // map area between the header bottom and the sheet top.
    return { top: 70, bottom: Math.round(visible) + 20, left: 20, right: 20 }
  }, [snap, sheetElRef])

  const handleRestaurantClick = useCallback((r: MapRestaurant) => {
    userInteractedRef.current = true
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023.98px)').matches
    // Capture the list scroll *before* the view switches and the content
    // element unmounts — useLayoutEffect on return restores it.
    if (sheetView === 'list' && contentRef.current) {
      listScrollRef.current = contentRef.current.scrollTop
    }
    // Selecting a search result implicitly accepts it — clear the query so
    // when the user later goes back to "alle Must Eats" or the list, they
    // see the full data set, not the still-filtered subset.
    setSearch('')
    setSearchOpen(false)
    setSelectedRestaurant(r)
    setSelectedMustEat(null)
    // Both mobile sheet AND desktop sidebar render the detail inline now —
    // desktop no longer uses a centered floating modal that hid the marker.
    setSheetView('detail')
    // Always open the detail fully on restaurant select — peek/mid hides
    // the content the user just clicked to see.
    setSnap('full')
    mapRef.current?.flyTo({
      center: [r.lng, r.lat],
      zoom: 15,
      duration: 500,
      padding: getFlyPadding(isMobile ? 'full' : undefined),
    })
  }, [getFlyPadding, setSearch, setSheetView, setSnap, sheetView, contentRef])

  const handleMustEatClick = useCallback((m: MapMustEat) => {
    userInteractedRef.current = true
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023.98px)').matches
    // Capture the list scroll before the view switches (mirrors handleRestaurantClick).
    if (sheetView === 'list' && contentRef.current) {
      listScrollRef.current = contentRef.current.scrollTop
    }
    // Selecting a search result accepts it — clear the query so subsequent
    // navigation (e.g. tapping "alle Must Eats") shows the full list.
    setSearch('')
    setSearchOpen(false)
    // Coming from a restaurant detail (mobile sheet OR desktop floating modal)
    // → switch to mustEats layer + list view, fly to the must-eat. Same flow
    // on both platforms.
    if (selectedRestaurant) {
      mustEatOriginRef.current = 'restaurant'
      setLayer('mustEats')
      setSelectedRestaurant(null)
      setSelectedMustEat(m)
      setSheetView('detail')
      // Must-Eat-Detail Mobile = viewport-füllend → immer full snap.
      if (isMobile) setSnap('full')
      mapRef.current?.flyTo({
        center: [m.restaurant.lng, m.restaurant.lat],
        zoom: 15,
        duration: 500,
        padding: getFlyPadding(isMobile ? 'full' : undefined),
      })
      return
    }
    // Direct marker click oder Click in der Must-Eats-Liste — Origin = list.
    mustEatOriginRef.current = 'list'
    const isLocked = !unlockedIds.has(m._id)
    const open = () => {
      setSelectedMustEat(m)
      setSheetView('detail')
      // Must-Eat-Detail Mobile = viewport-füllend → immer full snap.
      if (isMobile) setSnap('full')
      mapRef.current?.flyTo({ center: [m.restaurant.lng, m.restaurant.lat], zoom: 15, duration: 500, padding: getFlyPadding(isMobile ? 'full' : undefined) })
    }
    // Let the back-card wiggle animation play before the detail modal covers it.
    if (isLocked) setTimeout(open, 420)
    else open()
  }, [unlockedIds, getFlyPadding, selectedRestaurant, setSearch, setSheetView, snap, sheetView, contentRef])

  const handleRestaurantClose = useCallback(() => {
    const r = selectedRestaurant
    setSelectedRestaurant(null)
    setSheetView('list')
    // If the user pushed the detail down to peek before tapping X, snap the
    // list back to 'mid' so the result set is actually readable. 'full' and
    // 'mid' are preserved as deliberate user positions.
    const nextSnap: typeof snap = snap === 'peek' ? 'mid' : snap
    if (nextSnap !== snap) setSnap(nextSnap)
    if (r && mapRef.current) {
      mapRef.current.flyTo({
        center: [r.lng, r.lat],
        zoom: 15,
        duration: 350,
        padding: getFlyPadding(nextSnap),
      })
    }
  }, [selectedRestaurant, getFlyPadding, setSheetView, snap, setSnap])

  const handleViewRestaurantFromMustEat = useCallback(() => {
    if (!selectedMustEat) return
    const restaurant = restaurants.find(r => r._id === selectedMustEat.restaurant._id)
    if (!restaurant) return
    setSelectedMustEat(null)
    setLayer('restaurants')
    handleRestaurantClick(restaurant)
  }, [selectedMustEat, restaurants, handleRestaurantClick])

  /* Back-Button im Must-Eat-Detail — restauriert die Origin-View:
     - origin 'restaurant' → öffnet den parent Restaurant-Detail
     - origin 'list'       → zurück zur Must-Eats-Liste (Detail clearen,
                             Sheet-View auf 'list'). */
  const handleMustEatBack = useCallback(() => {
    if (!selectedMustEat) return
    if (mustEatOriginRef.current === 'restaurant') {
      const restaurant = restaurants.find(r => r._id === selectedMustEat.restaurant._id)
      if (restaurant) {
        setSelectedMustEat(null)
        setLayer('restaurants')
        handleRestaurantClick(restaurant)
        return
      }
    }
    // origin 'list' (Default) — zurück zur Must-Eats-Liste.
    setSelectedMustEat(null)
    setSheetView('list')
  }, [selectedMustEat, restaurants, handleRestaurantClick, setSheetView])

  /* "Alle Must Eats anzeigen" button in must-eat detail — clears the
     current selection and flips the sheet from detail → list while
     staying on the mustEats layer, so the user sees the full list. */
  const handleViewAllMustEats = useCallback(() => {
    setSelectedMustEat(null)
    setSheetView('list')
    const nextSnap: typeof snap = snap === 'peek' ? 'mid' : snap
    if (nextSnap !== snap) setSnap(nextSnap)
  }, [setSheetView, snap, setSnap])

  /* „Zu den Restaurants"-Button auf der Must-Eats-Liste — flippt den
     Layer zurück auf 'restaurants', clearet die Must-Eat-Selection.
     Sheet-View bleibt 'list', der bisherige Snap bleibt erhalten. */
  const handleSwitchToRestaurants = useCallback(() => {
    setSelectedMustEat(null)
    setLayer('restaurants')
  }, [])

  const handleMustEatClose = useCallback(() => {
    const m = selectedMustEat
    setSelectedMustEat(null)
    // If we were stacked on a restaurant detail, fall back to it instead of the list.
    if (selectedRestaurant) {
      mapRef.current?.flyTo({ center: [selectedRestaurant.lng, selectedRestaurant.lat], zoom: 15, duration: 400, padding: getFlyPadding() })
      return
    }
    // No layer-toggle in the UI anymore — make sure closing a must-eat
    // detail (reached from a restaurant detail) puts the user back on the
    // restaurants list rather than stranding them in must-eats list with no
    // way to switch layers.
    setLayer('restaurants')
    setSheetView('list')
    // Same nudge as handleRestaurantClose: peek → mid so the list is usable.
    const nextSnap: typeof snap = snap === 'peek' ? 'mid' : snap
    if (nextSnap !== snap) setSnap(nextSnap)
    if (m && mapRef.current) {
      mapRef.current.flyTo({
        center: [m.restaurant.lng, m.restaurant.lat],
        zoom: 15,
        duration: 350,
        padding: getFlyPadding(nextSnap),
      })
    }
  }, [selectedMustEat, selectedRestaurant, getFlyPadding, setSheetView, snap, setSnap])

  const handleMapClick = useCallback(() => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023.98px)').matches
    if (!isMobile) return
    /* Tap on the map = collapse whatever sheet is currently open to peek so
       the map gets the focus. For a detail view, peek shows name + 3 round
       icons; for the list, peek shows the count + filter strip. The detail
       selection itself is preserved — the user can drag the sheet back up
       to keep reading without re-opening anything. */
    if (snap !== 'peek') {
      setSnap('peek')
      reapplySnap('peek')
    }
  }, [snap, setSnap, reapplySnap])

  // When the user starts typing in the search, surface the list (mid snap) so
  // they see the filtered results — typing into a hidden list is confusing.
  const handleSearchChange = useCallback((v: string) => {
    setSearch(v)
    if (v && snap === 'peek' && sheetView === 'list') setSnap('mid')
  }, [snap, sheetView, setSnap, setSearch])

  const handleBezirkChange = useCallback((name: string | null) => {
    userInteractedRef.current = true
    setBezirk(name)
    // Reopen the list when a bezirk is picked so the user sees the filtered results.
    if (sheetView === 'list') setSnap('mid')
    if (name) {
      const c = bezirkCenters.get(name)
      if (c) mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom: 13, duration: 600, padding: getFlyPadding() })
    } else {
      // "Alle Bezirke" → centre on Berlin Mitte, tight enough that the inner
      // ring (Mitte/Kreuzberg/Prenzlauer Berg) fills the viewport.
      mapRef.current?.flyTo({ center: [13.405, 52.52], zoom: 11.6, duration: 700, padding: getFlyPadding() })
    }
  }, [bezirkCenters, getFlyPadding, sheetView, setSnap, setBezirk])

  const handleUnlock = useCallback(async () => {
    if (!selectedMustEat) return
    // Free-and-open map: anon visitors already see every must-eat as
    // unlocked (see `unlockedIds` memo above). Nothing to persist.
    if (!uid) return
    await unlock(selectedMustEat._id, selectedMustEat.restaurant._id, selectedMustEat.dish)
  }, [selectedMustEat, uid, unlock])

  const handleLocateMe = useCallback(async () => {
    userInteractedRef.current = true
    const loc = await requestLocation()
    if (loc) {
      mapRef.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 14, duration: 600, padding: getFlyPadding() })
    }
  }, [requestLocation, getFlyPadding])

  /* Request the user's position once on mount so the user-location marker
     renders. Don't auto-fly — useInitialFit already framed all spots, and
     zooming back in to z=14 around the user clipped most pins off-screen
     (the typical "I see only Mitte" complaint). The "Mein Standort" button
     stays available for explicit centering. */
  const autoLocatedRef = useRef(false)
  useEffect(() => {
    if (autoLocatedRef.current) return
    autoLocatedRef.current = true
    requestLocation()
  }, [requestLocation])

  /* Refit the map whenever a structured filter narrows or widens the visible
     set. Without this the user picks "Pizza" → 3 spots in the list but the
     map stays parked on Mitte and they have to manually zoom out to find the
     other two. Search (live keystrokes) is intentionally excluded — refitting
     mid-type feels jittery. Skip during a detail view so the selected pin's
     centering isn't overridden. */
  const getFlyPaddingRef = useRef(getFlyPadding)
  getFlyPaddingRef.current = getFlyPadding
  const didFirstFilterRefitRef = useRef(false)
  const displayedRestaurantsRef = useRef(displayedRestaurants)
  displayedRestaurantsRef.current = displayedRestaurants
  useEffect(() => {
    if (!didFirstFilterRefitRef.current) {
      didFirstFilterRefitRef.current = true
      return
    }
    if (selectedRestaurant || selectedMustEat) return
    if (!mapRef.current) return
    const list = displayedRestaurantsRef.current
    if (!list.length) return
    if (list.length === 1) {
      const r = list[0]
      mapRef.current.flyTo({
        center: [r.lng, r.lat],
        zoom: 14,
        duration: 500,
        padding: getFlyPaddingRef.current(),
      })
      return
    }
    const lngs = list.map(r => r.lng)
    const lats = list.map(r => r.lat)
    mapRef.current.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: getFlyPaddingRef.current(), duration: 500, maxZoom: 14 },
    )
  }, [category, bezirk, cuisine, openOnly, selectedRestaurant, selectedMustEat])

  const prevActiveRef = useRef(false)
  useEffect(() => {
    const justActivated = isActive && !prevActiveRef.current
    prevActiveRef.current = isActive
    if (!justActivated) return
    if (selectedRestaurant || selectedMustEat) return
    if (!location) return
    mapRef.current?.flyTo({
      center: [location.lng, location.lat],
      zoom: 14,
      duration: 400,
      padding: getFlyPadding(),
    })
  }, [isActive, selectedRestaurant, selectedMustEat, location, getFlyPadding])

  // Deep-links: ?r=<slug> opens a restaurant detail; ?bezirk=<slug> pre-filters
  // the map. Both poll mapRef so the camera moves don't no-op before the
  // canvas finishes mounting. Returns the pill-reset handler that clears
  // ?bezirk= from the URL.
  const { resetBezirkPill } = useMapDeepLinks({
    mapRef,
    restaurants,
    mustEats,
    isActive,
    sheetView,
    userInteractedRef,
    setBezirk,
    setSnap,
    onRestaurantSlugMatch: handleRestaurantClick,
    onMustEatIdMatch: handleMustEatClick,
    getFlyPadding,
  })

  /* ---------- Render ---------- */
  return (
    <MapSectionBody
      isActive={isActive}
      mapRef={mapRef}
      handleRef={handleRef}
      setHeaderRef={setHeaderRef}
      setContentRef={setContentRef}
      setSheetRef={setSheetRef}
      sheetView={sheetView}
      snap={snap}
      dragging={dragging}
      layer={layer}
      displayedRestaurants={displayedRestaurants}
      displayedLockedRestaurants={displayedLockedRestaurants}
      fannedMustEats={fannedMustEats}
      displayedMustEats={displayedMustEats}
      totalCount={totalCount}
      restaurantMustEats={restaurantMustEats}
      selectedRestaurant={selectedRestaurant}
      selectedMustEat={selectedMustEat}
      primaryMustEats={primaryMustEats}
      unlockedIds={unlockedIds}
      revealedMustEatIds={revealedMustEatIds}
      favoriteIds={favoriteIds}
      location={location}
      uid={uid}
      userTier={userTier}
      categories={categories}
      category={category}
      setCategory={setCategory}
      search={search}
      bezirk={bezirk}
      bezirkNames={bezirkNames}
      cuisine={cuisine}
      setCuisine={setCuisine}
      cuisineNames={cuisineNames}
      openOnly={openOnly}
      setOpenOnly={setOpenOnly}
      searchOpen={searchOpen}
      setSearchOpen={setSearchOpen}
      onMapMove={handleMapMove}
      onMapClick={handleMapClick}
      onRestaurantClick={handleRestaurantClick}
      onMustEatClick={handleMustEatClick}
      onLocateMe={handleLocateMe}
      onRestaurantClose={handleRestaurantClose}
      onMustEatClose={handleMustEatClose}
      onMustEatBack={handleMustEatBack}
      onViewAllMustEats={handleViewAllMustEats}
      onSwitchToRestaurants={handleSwitchToRestaurants}
      onViewRestaurantFromMustEat={handleViewRestaurantFromMustEat}
      onUnlock={handleUnlock}
      onSearchChange={handleSearchChange}
      onBezirkChange={handleBezirkChange}
      onResetBezirkPill={resetBezirkPill}
      onToggleFavorite={() => { if (selectedRestaurant) toggleFavorite(selectedRestaurant) }}
      onCollapseDetailToMid={() => { setSnap('mid'); reapplySnap('mid') }}
      desktopPanelHidden={desktopPanelHidden}
      onToggleDesktopPanel={() => setDesktopPanelHidden(v => !v)}
      myLocationAriaLabel={t('map.myLocationAriaLabel') ?? 'My location'}
      restaurantsListAriaLabel={t('map.restaurantsListAriaLabel') ?? 'Restaurants nearby'}
      mustEatsListAriaLabel={t('map.mustEatsListAriaLabel') ?? 'Must Eats'}
    />
  )
}
