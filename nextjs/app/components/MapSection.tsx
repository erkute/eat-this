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
  useMapFilters,
  useMapSheet,
  useMapDeepLinks,
  applyFanOffset,
} from '@/lib/map'
import { useTranslation } from '@/lib/i18n'
import { useLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import MapSectionBody from './map/MapSectionBody'
import { auth } from '@/lib/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import styles from './map/map.module.css'

interface Props {
  isActive?: boolean
}

export default function MapSection({ isActive = false }: Props) {
  const mapRef = useRef<MapRef>(null)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  // Set true synchronously in any click handler that flies the camera so
  // the slow auto-locate Promise can't overwrite the user's selection.
  const userInteractedRef = useRef(false)
  const { t } = useTranslation()
  const locale = useLocale()

  const { restaurants, mustEats, loading: dataLoading } = useMapData()
  // Keep the card-shuffle brand moment but make it fast: 1.5 s bar fill +
  // 100 ms grace = 1.6 s minimum. If data hasn't arrived by then we still
  // wait; if data loads in 200 ms we still show ≈1.6 s of brand.
  const [minDelayElapsed, setMinDelayElapsed] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setMinDelayElapsed(true), 1600)
    return () => window.clearTimeout(id)
  }, [])
  const loading = dataLoading || !minDelayElapsed
  const { location, request: requestLocation } = useUserLocation()
  const [uid, setUid] = useState<string | null>(() => auth.currentUser?.uid ?? null)
  useEffect(() => onAuthStateChanged(auth, u => setUid(u?.uid ?? null)), [])
  const { unlockedIds, unlock } = useUnlockedMustEats(uid)
  const { favoriteIds, toggle: toggleFavorite } = useFavorites(uid)

  const [layer,              setLayer]              = useState<MapLayer>('restaurants')

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
    openOnly, setOpenOnly,
    sort, setSort,
    sortDir, toggleSortDir,
    bezirkNames, bezirkCenters,
    displayedRestaurants, displayedMustEats,
  } = useMapFilters({ restaurants, mustEats, location })

  const [mapZoom,            setMapZoom]            = useState(12)
  const [selectedRestaurant, setSelectedRestaurant] = useState<MapRestaurant | null>(null)
  const [selectedMustEat,    setSelectedMustEat]    = useState<MapMustEat | null>(null)
  const [filterOpen,         setFilterOpen]         = useState(false)
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

  /* Filter / sort changes — reset list scroll to the top so the user always
     sees the first results of the new filter, not where they happened to be
     scrolled in the previous list. */
  useEffect(() => {
    if (sheetView !== 'list') return
    const el = contentRef.current
    if (el) el.scrollTop = 0
  }, [sheetView, category, bezirk, openOnly, sort, sortDir, search, layer, contentRef])

  const { updateBounds } = useBounds(displayedRestaurants, location)

  const handleMapMove = useCallback((bounds: Parameters<typeof updateBounds>[0]) => {
    updateBounds(bounds)
    if (mapRef.current) setMapZoom(mapRef.current.getMap().getZoom())
  }, [updateBounds])

  const restaurantMustEats = useMemo(() => {
    if (!selectedRestaurant) return []
    return mustEats.filter(m => m.restaurant._id === selectedRestaurant._id)
  }, [mustEats, selectedRestaurant])

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
    // Selecting a search result implicitly accepts it — clear the query so
    // when the user later goes back to "alle Must-Eats" or the list, they
    // see the full data set, not the still-filtered subset.
    setSearch('')
    setSearchOpen(false)
    setSelectedRestaurant(r)
    setSelectedMustEat(null)
    // Both mobile sheet AND desktop sidebar render the detail inline now —
    // desktop no longer uses a centered floating modal that hid the marker.
    setSheetView('detail')
    // If the list was at full when clicking, the detail will also open at
    // full (preserved in the snap useLayoutEffect). Pad accordingly so the
    // marker isn't hidden behind the just-expanded sheet.
    const targetSnap = snap === 'full' ? 'full' : 'mid'
    mapRef.current?.flyTo({
      center: [r.lng, r.lat],
      zoom: 15,
      duration: 500,
      padding: getFlyPadding(isMobile ? targetSnap : undefined),
    })
  }, [getFlyPadding, setSearch, setSheetView, snap])

  const handleMustEatClick = useCallback((m: MapMustEat) => {
    userInteractedRef.current = true
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023.98px)').matches
    // Selecting a search result accepts it — clear the query so subsequent
    // navigation (e.g. tapping "alle Must-Eats") shows the full list.
    setSearch('')
    setSearchOpen(false)
    // Coming from a restaurant detail (mobile sheet OR desktop floating modal)
    // → switch to mustEats layer + list view, fly to the must-eat. Same flow
    // on both platforms.
    if (selectedRestaurant) {
      setLayer('mustEats')
      setSelectedRestaurant(null)
      setSelectedMustEat(m)
      setSheetView('detail')
      mapRef.current?.flyTo({
        center: [m.restaurant.lng, m.restaurant.lat],
        zoom: 15,
        duration: 500,
        padding: getFlyPadding('mid'),
      })
      return
    }
    const isLocked = !unlockedIds.has(m._id)
    const targetSnap = snap === 'full' ? 'full' : 'mid'
    const open = () => {
      setSelectedMustEat(m)
      setSheetView('detail')
      mapRef.current?.flyTo({ center: [m.restaurant.lng, m.restaurant.lat], zoom: 15, duration: 500, padding: getFlyPadding(isMobile ? targetSnap : undefined) })
    }
    // Let the back-card wiggle animation play before the detail modal covers it.
    if (isLocked) setTimeout(open, 420)
    else open()
  }, [unlockedIds, getFlyPadding, selectedRestaurant, setSearch, setSheetView, snap])

  const handleRestaurantClose = useCallback(() => {
    const r = selectedRestaurant
    setSelectedRestaurant(null)
    setSheetView('list')
    // Drop to peek so the user sees the marker on the map with no list
    // covering anything — they were looking at this restaurant, now they
    // can see WHERE it is. List is one drag away.
    setSnap('peek')
    reapplySnap('peek')
    // Stay centered on the just-closed restaurant.
    if (r && mapRef.current) {
      mapRef.current.flyTo({
        center: [r.lng, r.lat],
        zoom: 15,
        duration: 350,
        padding: getFlyPadding('peek'),
      })
    }
  }, [selectedRestaurant, getFlyPadding, setSnap, reapplySnap, setSheetView])

  /* Apple-style layer switch from the floating segmented control on the map.
     Same flow whichever direction: clear any selection, force list view, and
     drop to mid so the new layer's list shows immediately. No-op when the
     user taps the segment that's already active. */
  const handleLayerSwitch = useCallback((newLayer: MapLayer) => {
    if (newLayer === layer) return
    setLayer(newLayer)
    setSelectedRestaurant(null)
    setSelectedMustEat(null)
    setSheetView('list')
    setSnap('mid')
    reapplySnap('mid')
  }, [layer, setSnap, reapplySnap, setSheetView])

  const handleViewRestaurantFromMustEat = useCallback(() => {
    if (!selectedMustEat) return
    const restaurant = restaurants.find(r => r._id === selectedMustEat.restaurant._id)
    if (!restaurant) return
    setSelectedMustEat(null)
    setLayer('restaurants')
    handleRestaurantClick(restaurant)
  }, [selectedMustEat, restaurants, handleRestaurantClick])

  /* Back button inside the must-eat detail — always navigates to the
     must-eat's parent restaurant detail (regardless of whether the user
     came from a restaurant detail or from the must-eats list). */
  const handleMustEatBack = useCallback(() => {
    if (!selectedMustEat) return
    const restaurant = restaurants.find(r => r._id === selectedMustEat.restaurant._id)
    if (!restaurant) return
    setSelectedMustEat(null)
    setLayer('restaurants')
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
    setSheetView('list')
    // Drop to peek so the user sees the marker uncovered. List is one drag away.
    setSnap('peek')
    reapplySnap('peek')
    if (m && mapRef.current) {
      mapRef.current.flyTo({
        center: [m.restaurant.lng, m.restaurant.lat],
        zoom: 15,
        duration: 350,
        padding: getFlyPadding('peek'),
      })
    }
  }, [selectedMustEat, selectedRestaurant, getFlyPadding, setSnap, reapplySnap, setSheetView])

  const handleShowMustEatList = useCallback(() => {
    setSelectedMustEat(null)
    setLayer('mustEats')
    setSheetView('list')
    setSnap('mid')
    reapplySnap('mid')
  }, [setSnap, reapplySnap, setSheetView])

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
    if (!uid) {
      window.location.assign(locale === routing.defaultLocale ? '/login' : `/${locale}/login`)
      return
    }
    await unlock(selectedMustEat._id, selectedMustEat.restaurant._id, selectedMustEat.dish)
  }, [selectedMustEat, uid, unlock, locale])

  const handleLocateMe = useCallback(async () => {
    userInteractedRef.current = true
    const loc = await requestLocation()
    if (loc) {
      mapRef.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 14, duration: 600, padding: getFlyPadding() })
    }
  }, [requestLocation, getFlyPadding])

  /* Auto-center on the user's position the first time the map page opens.
     Ref guard handles React strict-mode double-mount so we don't double-prompt.
     userInteractedRef is set synchronously by click handlers — see top of
     component — so this slow Promise can't overwrite the user's selection. */
  const autoLocatedRef = useRef(false)
  useEffect(() => {
    if (autoLocatedRef.current) return
    autoLocatedRef.current = true
    let cancelled = false
    requestLocation().then(loc => {
      if (cancelled || !loc) return
      // Skip the auto-fly if the user has already selected something — their
      // click's flyTo would otherwise be overwritten by this delayed callback.
      if (userInteractedRef.current) return
      const tryFly = () => {
        if (mapRef.current) {
          mapRef.current.flyTo({ center: [loc.lng, loc.lat], zoom: 14, duration: 600, padding: getFlyPadding() })
        } else {
          setTimeout(tryFly, 120)
        }
      }
      tryFly()
    })
    return () => { cancelled = true }
  }, [requestLocation, getFlyPadding])

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
    isActive,
    sheetView,
    userInteractedRef,
    setBezirk,
    setSnap,
    onRestaurantSlugMatch: handleRestaurantClick,
    getFlyPadding,
  })

  /* ---------- Render ---------- */
  if (loading) {
    return (
      <div className={`app-page${isActive ? ' active' : ''}`} data-page="map">
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.loadingCard} aria-hidden="true" />
          <div className={styles.loadingTitle}>{t('map.loadingTitle')}</div>
          <div className={styles.loadingBar} aria-hidden="true">
            <span className={styles.loadingBarFill} />
          </div>
          <div className={styles.loadingSub}>{t('map.loadingSub')}</div>
        </div>
      </div>
    )
  }

  return (
    <MapSectionBody
      isActive={isActive}
      mapRef={mapRef}
      filterBtnRef={filterBtnRef}
      handleRef={handleRef}
      setHeaderRef={setHeaderRef}
      setContentRef={setContentRef}
      setSheetRef={setSheetRef}
      sheetView={sheetView}
      snap={snap}
      dragging={dragging}
      layer={layer}
      displayedRestaurants={displayedRestaurants}
      fannedMustEats={fannedMustEats}
      displayedMustEats={displayedMustEats}
      restaurantMustEats={restaurantMustEats}
      selectedRestaurant={selectedRestaurant}
      selectedMustEat={selectedMustEat}
      unlockedIds={unlockedIds}
      favoriteIds={favoriteIds}
      location={location}
      uid={uid}
      category={category}
      setCategory={setCategory}
      search={search}
      bezirk={bezirk}
      bezirkNames={bezirkNames}
      openOnly={openOnly}
      setOpenOnly={setOpenOnly}
      sort={sort}
      setSort={setSort}
      sortDir={sortDir}
      onToggleSortDir={toggleSortDir}
      searchOpen={searchOpen}
      setSearchOpen={setSearchOpen}
      filterOpen={filterOpen}
      setFilterOpen={setFilterOpen}
      onMapMove={handleMapMove}
      onMapClick={handleMapClick}
      onRestaurantClick={handleRestaurantClick}
      onMustEatClick={handleMustEatClick}
      onLocateMe={handleLocateMe}
      onRestaurantClose={handleRestaurantClose}
      onMustEatClose={handleMustEatClose}
      onMustEatBack={handleMustEatBack}
      onLayerSwitch={handleLayerSwitch}
      onViewRestaurantFromMustEat={handleViewRestaurantFromMustEat}
      onShowMustEatList={handleShowMustEatList}
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
