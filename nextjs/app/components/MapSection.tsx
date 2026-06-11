'use client'
import { useRef, useState, useMemo, useCallback, useEffect, useLayoutEffect } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import type { MapRestaurant, MapMustEat } from '@/lib/types'
import {
  useMapData,
  useUserLocation,
  useBounds,
  useUnlockedMustEats,
  useFavorites,
  useMapFilters,
  useMapSheet,
  useMapDeepLinks,
  useUserTier,
  buildPrimaryMustEatMap,
  resolveUnlockedMustEatIds,
} from '@/lib/map'
import { useTranslation } from '@/lib/i18n'
import MapSectionBody from './map/MapSectionBody'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import { resolveAdjacent } from '@/lib/map/pager'
import { prefetchRestaurantDetail } from '@/lib/map/useRestaurantDetail'
import { auth, getDb } from '@/lib/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'

interface Props {
  isActive?:       boolean
  initialMapData?: InitialMapData
}

export default function MapSection({ isActive = false, initialMapData }: Props) {
  const mapRef = useRef<MapRef>(null)
  // Set true synchronously in any click handler that flies the camera so
  // the slow auto-locate Promise can't overwrite the user's selection.
  const userInteractedRef = useRef(false)
  const { t } = useTranslation()

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
    revealedMustEatIds,
    refetch: refetchMapData,
    mergeMustEat,
  } = useMapData({ uid, authLoading, initialMapData })
  const { location, loading: locating, request: requestLocation } = useUserLocation()
  const { unlockedIds: storedUnlockedIds, unlock } = useUnlockedMustEats(uid)
  // Free-and-open map: anon visitors see exactly the server-revealed set
  // face-up — 10 curated cards (one per spot) + the daily spot-of-day gift.
  // Everything else stays card-back until revealed on site (50 m). Authed
  // users keep the stored Firestore unlock set ∪ the public anon face-up
  // set — what a guest sees open on /must-eats never flips back after signup
  // ("publicly face-up means face-up everywhere"). Shared helper — the SAME
  // face-up computation drives the /must-eats gallery, the profile collection
  // and the /home teaser.
  const publicFaceUpIds = useMemo(
    () =>
      initialMapData
        ? resolveUnlockedMustEatIds({
            uid: null,
            storedUnlockedIds: new Set<string>(),
            revealedMustEatIds: new Set<string>(initialMapData.revealedMustEatIds),
          })
        : undefined,
    [initialMapData],
  )
  const unlockedIds = useMemo(
    () => resolveUnlockedMustEatIds({ uid, storedUnlockedIds, revealedMustEatIds, publicFaceUpIds }),
    [uid, storedUnlockedIds, revealedMustEatIds, publicFaceUpIds],
  )
  const { favoriteIds, toggle: toggleFavorite } = useFavorites(uid)
  const userTier = useUserTier(uid)

  // Live-refetch map data whenever the user's entitlements change (e.g. after
  // purchase). Firestore SDK is code-split (see getDb) — loaded on demand here
  // so it stays out of the landing first-load bundle.
  useEffect(() => {
    if (!uid) return
    let unsub = () => {}
    let active = true
    void (async () => {
      const [{ collection, onSnapshot }, db] = await Promise.all([
        import('firebase/firestore'),
        getDb(),
      ])
      if (!active) return
      const ref = collection(db, 'users', uid, 'entitlements')
      unsub = onSnapshot(ref, () => { refetchMapData() })
    })()
    return () => { active = false; unsub() }
  }, [uid, refetchMapData])

  // Live-refetch when a referral bonus lands — covers both the inviter
  // (friend just signed up) and the friend (their welcome bonus was written).
  useEffect(() => {
    if (!uid) return
    let unsub = () => {}
    let active = true
    void (async () => {
      const [{ collection, onSnapshot }, db] = await Promise.all([
        import('firebase/firestore'),
        getDb(),
      ])
      if (!active) return
      const ref = collection(db, 'users', uid, 'referralBonuses')
      unsub = onSnapshot(ref, () => { refetchMapData() })
    })()
    return () => { active = false; unsub() }
  }, [uid, refetchMapData])

  // Swipe the open detail down past peek → close it (back to the list). The
  // close logic lives in the handlers below, so route the sheet's dismiss
  // through a ref we keep pointed at the right handler (restaurant vs must-eat).
  const dismissDetailRef = useRef<() => void>(() => {})
  const dismissDetail = useCallback(() => { dismissDetailRef.current() }, [])

  const {
    handleRef, contentRef, setContentRef, setHeaderRef,
    snap, setSnap, dragging, reapplySnap,
    sheetView, setSheetView,
    sheetElRef, setSheetRef,
  } = useMapSheet(dismissDetail)

  const {
    category, setCategory,
    search, setSearch,
    bezirk, setBezirk,
    cuisine, setCuisine,
    openOnly, setOpenOnly,
    bezirkNames, bezirkCenters,
    cuisineNames,
    displayedRestaurants, displayedLockedRestaurants,
  } = useMapFilters({ restaurants, lockedRestaurants, location })

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
  const prevFiltersRef = useRef({ category, bezirk, cuisine, openOnly, search })
  useEffect(() => {
    if (sheetView !== 'list') return
    const prev = prevFiltersRef.current
    const next = { category, bezirk, cuisine, openOnly, search }
    prevFiltersRef.current = next
    const filtersChanged =
      prev.category !== next.category ||
      prev.bezirk !== next.bezirk ||
      prev.cuisine !== next.cuisine ||
      prev.openOnly !== next.openOnly ||
      prev.search !== next.search
    if (!filtersChanged) return
    listScrollRef.current = 0
    const el = contentRef.current
    if (el) el.scrollTop = 0
  }, [sheetView, category, bezirk, cuisine, openOnly, search, contentRef])

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
  }, [updateBounds])

  const restaurantMustEats = useMemo(() => {
    if (!selectedRestaurant) return []
    return mustEats.filter(m => m.restaurant._id === selectedRestaurant._id)
  }, [mustEats, selectedRestaurant])

  const primaryMustEats = useMemo(
    () => buildPrimaryMustEatMap(mustEats),
    [mustEats],
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
    // The mobile canvas extends (100lvh − 100dvh) + 80px past the visual
    // viewport (iOS-bar apron, see --map-bar-overhang in map.module.css).
    // flyTo padding is in CANVAS coordinates, so without this correction the
    // centre lands ~overhang/2 too low on screen. Measure the real container
    // height so lvh/dvh bar states are handled for free.
    const canvasH = mapRef.current?.getContainer().clientHeight ?? window.innerHeight
    const overhang = Math.max(0, canvasH - window.innerHeight)
    // top: 70 leaves room for the floating top controls plus a tiny gap.
    // Centring then matches the geometric centre of the actually-visible
    // map area between the controls and the sheet top.
    return { top: 70, bottom: Math.round(visible + overhang) + 20, left: 20, right: 20 }
  }, [snap, sheetElRef])

  const handleRestaurantClick = useCallback((r: MapRestaurant) => {
    userInteractedRef.current = true
    // Kick off the detail-field fetch now so it's usually cached by the time
    // the sheet finishes opening (the map payload no longer carries them).
    prefetchRestaurantDetail(r.slug)
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

  // Pager: neighbours of the open restaurant within the filtered list the
  // user is browsing (same order as the list view). Paging swaps the
  // selection in place — no list↔detail view switch (already in detail).
  const pagerAdjacent = useMemo(
    () => selectedRestaurant
      ? resolveAdjacent(displayedRestaurants, selectedRestaurant._id)
      : { index: -1, prev: null, next: null },
    [displayedRestaurants, selectedRestaurant],
  )

  // Warm the neighbours' detail fields while a detail pane is open, so a
  // pager swipe lands on fully-populated content instead of popping the
  // story text in after the transition.
  useEffect(() => {
    if (!selectedRestaurant) return
    if (pagerAdjacent.prev) prefetchRestaurantDetail(pagerAdjacent.prev.slug)
    if (pagerAdjacent.next) prefetchRestaurantDetail(pagerAdjacent.next.slug)
  }, [selectedRestaurant, pagerAdjacent])

  const handlePageRestaurant = useCallback((dir: 'prev' | 'next') => {
    const target = dir === 'prev' ? pagerAdjacent.prev : pagerAdjacent.next
    if (!target) return
    userInteractedRef.current = true
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023.98px)').matches
    setSelectedRestaurant(target)
    mapRef.current?.flyTo({
      center: [target.lng, target.lat],
      zoom: 15,
      duration: 400,
      padding: getFlyPadding(isMobile ? 'full' : undefined),
    })
    const sc = document.querySelector('[data-detail-scroll]')
    if (sc) (sc as HTMLElement).scrollTop = 0
  }, [pagerAdjacent, getFlyPadding])

  // Global must-eat pager: neighbours within the FULL must-eat list (no
  // filtering — the layer/list is gone). Paging swaps the selection in place.
  const mustEatPagerAdjacent = useMemo(
    () => selectedMustEat
      ? resolveAdjacent(mustEats, selectedMustEat._id)
      : { index: -1, prev: null, next: null },
    [mustEats, selectedMustEat],
  )

  const handlePageMustEat = useCallback((dir: 'prev' | 'next') => {
    const target = dir === 'prev' ? mustEatPagerAdjacent.prev : mustEatPagerAdjacent.next
    if (!target) return
    userInteractedRef.current = true
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023.98px)').matches
    setSelectedMustEat(target)
    mapRef.current?.flyTo({
      center: [target.restaurant.lng, target.restaurant.lat],
      zoom: 15,
      duration: 400,
      padding: getFlyPadding(isMobile ? 'full' : undefined),
    })
    const sc = document.querySelector('[data-detail-scroll]')
    if (sc) (sc as HTMLElement).scrollTop = 0
  }, [mustEatPagerAdjacent, getFlyPadding])

  const handleMustEatClick = useCallback((m: MapMustEat) => {
    userInteractedRef.current = true
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023.98px)').matches
    // Capture the list scroll before the view switches (mirrors handleRestaurantClick).
    if (sheetView === 'list' && contentRef.current) {
      listScrollRef.current = contentRef.current.scrollTop
    }
    // Selecting a search result accepts it — clear the query so the list
    // shows the full result set again when the user returns to it.
    setSearch('')
    setSearchOpen(false)
    // Coming from a restaurant detail (mobile sheet OR desktop floating modal)
    // → open the must-eat detail, fly to the must-eat. Same flow on both
    // platforms.
    if (selectedRestaurant) {
      setSelectedRestaurant(null)
      setSelectedMustEat(m)
      setSheetView('detail', 'mustEat')
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
    const isLocked = !unlockedIds.has(m._id)
    const open = () => {
      setSelectedMustEat(m)
      setSheetView('detail', 'mustEat')
      // Must-Eat-Detail Mobile = viewport-füllend → immer full snap.
      if (isMobile) setSnap('full')
      mapRef.current?.flyTo({ center: [m.restaurant.lng, m.restaurant.lat], zoom: 15, duration: 500, padding: getFlyPadding(isMobile ? 'full' : undefined) })
    }
    // Let the back-card wiggle animation play before the detail modal covers it.
    if (isLocked) setTimeout(open, 420)
    else open()
  }, [unlockedIds, getFlyPadding, selectedRestaurant, setSearch, setSheetView, setSnap, sheetView, contentRef])

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
    handleRestaurantClick(restaurant)
  }, [selectedMustEat, restaurants, handleRestaurantClick])

  const handleMustEatClose = useCallback(() => {
    const m = selectedMustEat
    setSelectedMustEat(null)
    // If we were stacked on a restaurant detail, fall back to it instead of the list.
    if (selectedRestaurant) {
      mapRef.current?.flyTo({ center: [selectedRestaurant.lng, selectedRestaurant.lat], zoom: 15, duration: 400, padding: getFlyPadding() })
      return
    }
    // Closing a must-eat detail (reached from a restaurant detail or deep
    // link) puts the user back on the restaurants list.
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

  // Point the sheet's swipe-down-dismiss at the right close handler for
  // whichever detail is open (must-eat stacked on a restaurant, or plain).
  useEffect(() => {
    dismissDetailRef.current = () => {
      if (selectedMustEat) handleMustEatClose()
      else handleRestaurantClose()
    }
  }, [selectedMustEat, handleMustEatClose, handleRestaurantClose])

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
    // Anon taps never reach this handler — useMustEatDetailState routes
    // in-range guests to the login gate instead.
    if (!uid) return
    // The reveal response carries the full card data (covered cards ship
    // stripped) — merge it so the open detail and the list peek flip face-up.
    const full = await unlock(selectedMustEat._id)
    if (full) {
      mergeMustEat(full)
      setSelectedMustEat(full)
    }
  }, [selectedMustEat, uid, unlock, mergeMustEat])

  const handleLocateMe = useCallback(async () => {
    userInteractedRef.current = true
    const { location: loc, error } = await requestLocation()
    if (loc) {
      mapRef.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 14, duration: 600, padding: getFlyPadding() })
    } else if (error) {
      // Icon-only FAB has no room for an inline hint — toast instead. Only on
      // explicit click; the silent auto-locate on mount must NOT toast.
      window.showNotification?.(
        error === 'denied' ? t('hub.nearby.errDenied') : t('hub.nearby.errRetry'),
        4000,
      )
    }
  }, [requestLocation, getFlyPadding, t])

  /* Default camera = the user's position. Request it once on mount and, as
     soon as it resolves, centre the map there — unless the user already
     interacted, a deep-link is steering the camera (?r/?me/?bezirk/?cat all
     set userInteractedRef, but they may consume AFTER the location resolves,
     so check the URL too), or the position is outside Berlin. When the
     location is denied/unavailable the canvas default stays: Berlin Mitte,
     zoomed (see BERLIN in MapCanvas). Polls mapRef like the deep-link
     effects — a granted permission can resolve before the canvas mounts. */
  const getFlyPaddingRef = useRef(getFlyPadding)
  getFlyPaddingRef.current = getFlyPadding
  const autoLocatedRef = useRef(false)
  useEffect(() => {
    if (autoLocatedRef.current) return
    autoLocatedRef.current = true
    const params = new URLSearchParams(window.location.search)
    const hasDeepLink = ['r', 'me', 'bezirk', 'cat'].some(p => params.has(p))
    void requestLocation().then(({ location: loc }) => {
      if (!loc || hasDeepLink) return
      const inBerlin = loc.lat > 52.3 && loc.lat < 52.7 && loc.lng > 12.9 && loc.lng < 13.8
      if (!inBerlin) return
      const tryFly = () => {
        if (userInteractedRef.current) return
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [loc.lng, loc.lat],
            zoom: 14,
            duration: 600,
            padding: getFlyPaddingRef.current(),
          })
        } else {
          setTimeout(tryFly, 120)
        }
      }
      tryFly()
    })
  }, [requestLocation])

  /* Refit the map whenever a structured filter narrows or widens the visible
     set. Without this the user picks "Pizza" → 3 spots in the list but the
     map stays parked on Mitte and they have to manually zoom out to find the
     other two. Search (live keystrokes) is intentionally excluded — refitting
     mid-type feels jittery. Skip during a detail view so the selected pin's
     centering isn't overridden. */
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

  /* Scroll keeper — the map page is in-flow and taller than the visual
     viewport (100lvh + 80px apron, see globals.css) so its bottom sheet can
     blur through iOS Safari's translucent URL bar. That gives the window a
     ~bar-height of scroll range it must never actually use: every map
     gesture is captured (canvas touch-action none, sheet drags
     preventDefault, list overscroll contained), but stray vectors (input
     focus, rubber-band edge cases) could leave the page parked mid-scroll
     with the toolbar clipped. Pin it back to 0. */
  useEffect(() => {
    if (!isActive) return
    if (!window.matchMedia('(max-width: 1023.98px)').matches) return
    const onScroll = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0)
    }
    onScroll() // entering the map with a leftover scroll position
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isActive])

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
  // canvas finishes mounting.
  useMapDeepLinks({
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
    onRestaurantSlugMatch: handleRestaurantClick,
    onMustEatIdMatch: handleMustEatClick,
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
      displayedRestaurants={displayedRestaurants}
      displayedLockedRestaurants={displayedLockedRestaurants}
      pagerPrev={pagerAdjacent.prev}
      pagerNext={pagerAdjacent.next}
      onPageRestaurant={handlePageRestaurant}
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
      locateLoading={locating}
      onRestaurantClose={handleRestaurantClose}
      onMustEatClose={handleMustEatClose}
      mustEatPagerPrev={mustEatPagerAdjacent.prev}
      mustEatPagerNext={mustEatPagerAdjacent.next}
      onPageMustEat={handlePageMustEat}
      onViewRestaurantFromMustEat={handleViewRestaurantFromMustEat}
      onUnlock={handleUnlock}
      onSearchChange={handleSearchChange}
      onBezirkChange={handleBezirkChange}
      onToggleFavorite={() => { if (selectedRestaurant) toggleFavorite(selectedRestaurant) }}
      desktopPanelHidden={desktopPanelHidden}
      onToggleDesktopPanel={() => setDesktopPanelHidden(v => !v)}
      myLocationAriaLabel={t('map.myLocationAriaLabel') ?? 'My location'}
      restaurantsListAriaLabel={t('map.restaurantsListAriaLabel') ?? 'Restaurants nearby'}
    />
  )
}
