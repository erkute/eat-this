'use client'
import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import type { MapRestaurant, MapMustEat, MapLayer, MapCategory } from '@/lib/types'
import { useMapData } from '@/lib/map/useMapData'
import { useUserLocation } from '@/lib/map/useUserLocation'
import { useBounds } from '@/lib/map/useBounds'
import { useUnlockedMustEats } from '@/lib/map/useUnlockedMustEats'
import { useFavorites } from '@/lib/map/useFavorites'
import { useBottomSheet } from '@/lib/map/useBottomSheet'
import { getOpenStatus } from '@/lib/map/openingHours'
import { haversineDistance, formatDistance } from '@/lib/map/distance'
import { applyFanOffset } from '@/lib/map/fanOffset'
import { useTranslation } from '@/lib/i18n'
import MapCanvas from './map/MapCanvas'
import RestaurantMarker from './map/RestaurantMarker'
import MustEatMarker from './map/MustEatMarker'
import RestaurantList from './map/RestaurantList'
import RestaurantDetail from './map/RestaurantDetail'
import MustEatDetail from './map/MustEatDetail'
import UserLocationMarker from './map/UserLocationMarker'
import CategoryFilter from './map/CategoryFilter'
import FilterDropdown, { type SortOption } from './map/FilterDropdown'
import { auth } from '@/lib/firebase/config'
import styles from './map/map.module.css'

interface Props {
  isActive?: boolean
}

function districtOf(r: MapRestaurant): string | null {
  return r.bezirk?.name ?? r.district ?? null
}

export default function MapSection({ isActive = false }: Props) {
  const mapRef = useRef<MapRef>(null)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  // Set true synchronously in any click handler that flies the camera so
  // the slow auto-locate Promise can't overwrite the user's selection.
  const userInteractedRef = useRef(false)
  const { t } = useTranslation()

  const { restaurants, mustEats, loading: dataLoading } = useMapData()
  // Hold the card-shuffle loading animation for at least a beat on first
  // mount so users see the brand moment even when data resolves instantly.
  const [minDelayElapsed, setMinDelayElapsed] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setMinDelayElapsed(true), 1100)
    return () => window.clearTimeout(id)
  }, [])
  const loading = dataLoading || !minDelayElapsed
  const { location, request: requestLocation } = useUserLocation()
  const uid = auth.currentUser?.uid ?? null
  const { unlockedIds, unlock } = useUnlockedMustEats(uid)
  const { favoriteIds, toggle: toggleFavorite } = useFavorites(uid)
  const { sheetRef, handleRef, contentRef, snap, setSnap, dragging, reapplySnap, configure } = useBottomSheet('mid')

  const [mapZoom,            setMapZoom]            = useState(12)
  const [layer,              setLayer]              = useState<MapLayer>('restaurants')
  const [category,           setCategory]           = useState<MapCategory>('All')
  const [search,             setSearch]             = useState('')
  const [bezirk,             setBezirk]             = useState<string | null>(null)
  const [openOnly,           setOpenOnly]           = useState(false)
  const [selectedRestaurant, setSelectedRestaurant] = useState<MapRestaurant | null>(null)
  const [selectedMustEat,    setSelectedMustEat]    = useState<MapMustEat | null>(null)
  const [sheetView,          setSheetView]          = useState<'list' | 'detail'>('list')
  const [sort,               setSort]               = useState<'distance' | 'name'>('distance')
  const [filterOpen,         setFilterOpen]         = useState(false)
  const [searchOpen,         setSearchOpen]         = useState(false)

  /* ---------- Bezirk list + centroid map ---------- */
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

  /* ---------- Filter pipeline (applied to markers + list) ----------
     A non-empty search query overrides all other filters: the user expects
     to find anything on the map regardless of the active bezirk/category/open
     selection. Without a query, the filter chips apply normally. */
  const filterRestaurant = useCallback((r: MapRestaurant): boolean => {
    const q = search.trim().toLowerCase()
    if (q) {
      const hit =
        r.name.toLowerCase().includes(q) ||
        (districtOf(r) ?? '').toLowerCase().includes(q) ||
        r.categories?.some(c => c.toLowerCase().includes(q))
      return Boolean(hit)
    }
    if (category !== 'All' && !r.categories?.includes(category)) return false
    if (bezirk && districtOf(r) !== bezirk) return false
    if (openOnly) {
      if (!r.openingHours) return false
      if (!getOpenStatus(r.openingHours).isOpen) return false
    }
    return true
  }, [category, bezirk, openOnly, search])

  const displayedRestaurants = useMemo(() => {
    const filtered = restaurants.filter(filterRestaurant)
    if (sort === 'name') {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'de'))
    }
    if (!location) return filtered
    return [...filtered].sort((a, b) => {
      const aD = haversineDistance(location.lat, location.lng, a.lat, a.lng)
      const bD = haversineDistance(location.lat, location.lng, b.lat, b.lng)
      return aD - bD
    })
  }, [restaurants, filterRestaurant, sort, location])

  const { updateBounds } = useBounds(displayedRestaurants, location)

  const handleMapMove = useCallback((bounds: Parameters<typeof updateBounds>[0]) => {
    updateBounds(bounds)
    if (mapRef.current) setMapZoom(mapRef.current.getMap().getZoom())
  }, [updateBounds])

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
    // Default sort: distance from user location (closest first), falling back
    // to Berlin Mitte when GPS is unavailable. When a bezirk filter is active,
    // items in that bezirk float to the top; everything else stays sorted by
    // distance below them.
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
    const s = targetSnap ?? snap
    let visible = 28 // peek
    if (s === 'mid') visible = 440
    else if (s === 'full') visible = window.innerHeight
    return { top: 110, bottom: visible + 20, left: 20, right: 20 }
  }, [snap])

  const handleRestaurantClick = useCallback((r: MapRestaurant) => {
    userInteractedRef.current = true
    setSelectedRestaurant(r)
    setSelectedMustEat(null)
    // Both mobile sheet AND desktop sidebar render the detail inline now —
    // desktop no longer uses a centered floating modal that hid the marker.
    setSheetView('detail')
    setSnap('full')
    mapRef.current?.flyTo({ center: [r.lng, r.lat], zoom: 15, duration: 500, padding: getFlyPadding() })
  }, [setSnap, getFlyPadding])

  const handleMustEatClick = useCallback((m: MapMustEat) => {
    userInteractedRef.current = true
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023.98px)').matches
    // Coming from a restaurant detail (mobile sheet OR desktop floating modal)
    // → switch to mustEats layer + list view, fly to the must-eat. Same flow
    // on both platforms.
    if (selectedRestaurant) {
      setLayer('mustEats')
      setSelectedRestaurant(null)
      setSelectedMustEat(m)
      setSheetView('detail')
      setSnap('full')
      mapRef.current?.flyTo({
        center: [m.restaurant.lng, m.restaurant.lat],
        zoom: 15,
        duration: 500,
        padding: getFlyPadding('full'),
      })
      return
    }
    const isLocked = !unlockedIds.has(m._id)
    const open = () => {
      setSelectedMustEat(m)
      setSheetView('detail')
      setSnap('full')
      mapRef.current?.flyTo({ center: [m.restaurant.lng, m.restaurant.lat], zoom: 15, duration: 500, padding: getFlyPadding(isMobile ? 'full' : undefined) })
    }
    // Let the back-card wiggle animation play before the detail modal covers it.
    if (isLocked) setTimeout(open, 420)
    else open()
  }, [setSnap, unlockedIds, getFlyPadding, selectedRestaurant])

  const handleRestaurantClose = useCallback(() => {
    const r = selectedRestaurant
    setSelectedRestaurant(null)
    setSheetView('list')
    // Detail-open set snap to 'full' (or auto-sized custom px). Force back
    // to 'mid' so the sheet drops to the standard list height.
    setSnap('mid')
    reapplySnap('mid')
    // Stay centered on the just-closed restaurant — user wants to see WHERE
    // it is on the map after dismissing the detail. Re-fly with the new
    // (mid-snap) padding so the marker recenters above the smaller sheet.
    if (r && mapRef.current) {
      mapRef.current.flyTo({
        center: [r.lng, r.lat],
        zoom: 15,
        duration: 350,
        padding: getFlyPadding('mid'),
      })
    }
  }, [selectedRestaurant, getFlyPadding, setSnap, reapplySnap])

  const handleBackToRestaurants = useCallback(() => {
    setLayer('restaurants')
    setSelectedMustEat(null)
    setSheetView('list')
    setSnap('mid')
    reapplySnap('mid')
  }, [setSnap, reapplySnap])

  const handleViewRestaurantFromMustEat = useCallback(() => {
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
    setSnap('mid')
    reapplySnap('mid')
    // Stay centered on the just-closed must-eat — same as restaurant close.
    if (m && mapRef.current) {
      mapRef.current.flyTo({
        center: [m.restaurant.lng, m.restaurant.lat],
        zoom: 15,
        duration: 350,
        padding: getFlyPadding('mid'),
      })
    }
  }, [selectedMustEat, selectedRestaurant, getFlyPadding, setSnap, reapplySnap])

  const handleShowMustEatList = useCallback(() => {
    setSelectedMustEat(null)
    setLayer('mustEats')
    setSheetView('list')
    setSnap('mid')
    reapplySnap('mid')
  }, [setSnap, reapplySnap])

  const handleMapClick = useCallback(() => {
    // Tapping the map dismisses the detail. Keep the camera where the user
    // tapped — don't fly back to a remembered position.
    setSelectedRestaurant(null)
    setSelectedMustEat(null)
    setSheetView('list')
    setSnap('peek')
  }, [setSnap])

  // When the user starts typing in the search, surface the list (mid snap) so
  // they see the filtered results — typing into a hidden list is confusing.
  const handleSearchChange = useCallback((v: string) => {
    setSearch(v)
    if (v && snap === 'peek' && sheetView === 'list') setSnap('mid')
  }, [snap, sheetView, setSnap])

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
  }, [bezirkCenters, getFlyPadding, sheetView, setSnap])

  // Configure sheet drag behaviour based on view mode.
  // List → cap at mid (no full-screen list). Detail → locked (no drag, no handle).
  useEffect(() => {
    configure(sheetView === 'detail'
      ? { maxSnap: null, locked: true }
      : { maxSnap: 'mid', locked: false }
    )
  }, [sheetView, configure])

  const handleUnlock = useCallback(async () => {
    if (!selectedMustEat) return
    await unlock(selectedMustEat._id, selectedMustEat.restaurant._id, selectedMustEat.dish)
  }, [selectedMustEat, unlock])

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
  }, [requestLocation])

  /* ---------- Render ---------- */
  return (
    <div
      className={`app-page${isActive ? ' active' : ''}`}
      data-page="map"
      suppressHydrationWarning
    >
      {loading ? (
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.loadingCard} aria-hidden="true" />
          <div className={styles.loadingTitle}>{t('map.loadingTitle')}</div>
          <div className={styles.loadingBar} aria-hidden="true">
            <span className={styles.loadingBarFill} />
          </div>
          <div className={styles.loadingSub}>{t('map.loadingSub')}</div>
        </div>
      ) : (
        <div className={styles.shell}>

          <div className={`${styles.body}${sheetView === 'detail' ? ` ${styles.bodyDetailOpen}` : ''}`}>
            <div className={styles.mapWrap}>
              <MapCanvas ref={mapRef} onMove={handleMapMove} onMapClick={handleMapClick}>
                {layer === 'restaurants' && displayedRestaurants.map(r => (
                  <RestaurantMarker
                    key={r._id}
                    restaurant={r}
                    isSelected={selectedRestaurant?._id === r._id}
                    onClick={handleRestaurantClick}
                  />
                ))}
                {layer === 'mustEats' && fannedMustEats.map(m => (
                  <MustEatMarker
                    key={m._id}
                    mustEat={m}
                    isUnlocked={unlockedIds.has(m._id)}
                    isSelected={selectedMustEat?._id === m._id}
                    userLocation={location}
                    displayLat={m.displayLat}
                    displayLng={m.displayLng}
                    onClick={handleMustEatClick}
                  />
                ))}
                {location && <UserLocationMarker location={location} />}
              </MapCanvas>

              <button
                type="button"
                onClick={handleLocateMe}
                aria-label="My location"
                className={styles.fab}
              >
                <svg className={styles.fabIcon} viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="8" />
                  <line x1="12" y1="2"  x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="2"  y1="12" x2="5"  y2="12" />
                  <line x1="19" y1="12" x2="22" y2="12" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
              </button>

              {/* Desktop floating modals removed — both mobile and desktop now
                  render the detail in the side panel / bottom sheet so the
                  selected marker stays visible on the map. */}
            </div>

            <aside
              ref={sheetRef}
              className={`${styles.list} ${dragging ? styles.listDragging : ''}`}
              aria-label={layer === 'restaurants' ? 'Restaurants nearby' : 'Must-Eats'}
            >
              <div ref={handleRef} className={`${styles.handle}${sheetView === 'detail' ? ` ${styles.handleHidden}` : ''}`} aria-hidden="true" />

              {sheetView === 'detail' && selectedMustEat ? (
                <div ref={contentRef} className={styles.detailMount}>
                  <MustEatDetail
                    mustEat={selectedMustEat}
                    userLocation={location}
                    isUnlocked={unlockedIds.has(selectedMustEat._id)}
                    onUnlock={handleUnlock}
                    onClose={handleMustEatClose}
                    onViewRestaurant={handleViewRestaurantFromMustEat}
                    onShowMustEatList={handleShowMustEatList}
                    inSheet
                  />
                </div>
              ) : sheetView === 'detail' && selectedRestaurant ? (
                <div ref={contentRef} className={styles.detailMount}>
                  <RestaurantDetail
                    restaurant={selectedRestaurant}
                    mustEats={restaurantMustEats}
                    unlockedIds={unlockedIds}
                    userLocation={location}
                    onClose={handleRestaurantClose}
                    onMustEatClick={handleMustEatClick}
                    isFavorite={favoriteIds.has(selectedRestaurant._id)}
                    onToggleFavorite={() => toggleFavorite(selectedRestaurant)}
                    inSheet
                  />
                </div>
              ) : layer === 'restaurants' ? (
                <>
                  <div className={styles.listHeader}>
                    {searchOpen ? (
                      <div className={styles.listHeaderRow}>
                        <input
                          type="text"
                          autoFocus
                          value={search}
                          onChange={e => handleSearchChange(e.target.value)}
                          placeholder={t('map.searchPlaceholder')}
                          className={styles.searchInputInline}
                          aria-label={t('nav.searchAriaLabel') ?? 'Search'}
                        />
                        <button
                          type="button"
                          className={styles.searchCloseBtn}
                          onClick={() => { setSearchOpen(false); handleSearchChange('') }}
                          aria-label="Suche schließen"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="6" y1="6" x2="18" y2="18" />
                            <line x1="18" y1="6" x2="6" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className={styles.listHeaderRow}>
                        <span className={styles.listHeaderCount}>
                          {displayedRestaurants.length}{' '}
                          {displayedRestaurants.length === 1 ? t('map.restaurantOne') : t('map.restaurantMany')}
                        </span>
                        <div className={styles.listHeaderActions}>
                          <button
                            type="button"
                            className={`${styles.filterIconBtn} ${search ? styles.filterIconBtnActive : ''}`}
                            onClick={() => setSearchOpen(true)}
                            aria-label="Suchen"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <circle cx="11" cy="11" r="7" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            {search && <span className={styles.filterActiveDot} aria-hidden="true" />}
                          </button>
                          <button
                            ref={filterBtnRef}
                            type="button"
                            className={`${styles.filterIconBtn} ${(openOnly || bezirk || sort !== 'distance') ? styles.filterIconBtnActive : ''}`}
                            onClick={() => setFilterOpen(true)}
                            aria-label="Filter und Sortierung"
                            aria-expanded={filterOpen}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <line x1="4" y1="6" x2="20" y2="6" />
                              <line x1="7" y1="12" x2="17" y2="12" />
                              <line x1="10" y1="18" x2="14" y2="18" />
                            </svg>
                            {(openOnly || bezirk || sort !== 'distance') && <span className={styles.filterActiveDot} aria-hidden="true" />}
                          </button>
                        </div>
                      </div>
                    )}
                    <CategoryFilter active={category} onChange={setCategory} variant="tabs" />
                    {filterOpen && (
                      <FilterDropdown
                        sort={sort}
                        onSort={s => { setSort(s as SortOption) }}
                        openOnly={openOnly}
                        onOpenOnly={setOpenOnly}
                        bezirke={bezirkNames}
                        bezirk={bezirk}
                        onBezirk={handleBezirkChange}
                        onClose={() => setFilterOpen(false)}
                        anchorEl={filterBtnRef.current}
                      />
                    )}
                  </div>
                  <div ref={contentRef} className={styles.listScroll}>
                    <RestaurantList
                      restaurants={displayedRestaurants}
                      userLocation={location}
                      selectedId={selectedRestaurant?._id ?? null}
                      onSelect={handleRestaurantClick}
                    />
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.mustEatsBack}
                    onClick={handleBackToRestaurants}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                    Restaurants
                  </button>
                  <div ref={contentRef} className={`${styles.listScroll} ${styles.listScrollNoCats}`}>
                    {displayedMustEats.length === 0 ? (
                      <div className={styles.empty}>{t('map.noMustEatsMatch')}</div>
                    ) : (() => {
                      // Render unlocked → locked, with the booster CTA injected
                      // after the 10th item overall (or at the end if list shorter).
                      const unlocked = displayedMustEats.filter(m => unlockedIds.has(m._id))
                      const locked = displayedMustEats.filter(m => !unlockedIds.has(m._id))
                      const total = unlocked.length + locked.length
                      const insertAt = Math.min(10, total)
                      const nodes: React.ReactNode[] = []
                      let pos = 0
                      const boosterNode = (
                        <div key="booster" className={styles.boosterOfferList}>
                          <img src="/pics/booster/booster5.webp" alt="" className={styles.boosterImg} loading="lazy" />
                          <div className={styles.boosterInfo}>
                            <div className={styles.boosterEyebrow}>Skip the Wait</div>
                            <div className={styles.boosterTitle}>Booster Pack</div>
                            <div className={styles.boosterDesc}>10 zufällige Must-Eats sofort freischalten — kein Hinlaufen nötig.</div>
                            <button type="button" className={styles.boosterCta}>Pack holen · 0,99 €</button>
                          </div>
                        </div>
                      )
                      const maybeInsertBooster = () => {
                        if (pos === insertAt) nodes.push(boosterNode)
                      }
                      if (unlocked.length > 0) {
                        nodes.push(<div key="lbl-u" className={styles.mustDeckSectionLabel}>Freigeschaltet</div>)
                      }
                      for (const m of unlocked) {
                        nodes.push(
                          <button
                            key={m._id}
                            className={`${styles.row} ${selectedMustEat?._id === m._id ? styles.rowActive : ''}`}
                            onClick={() => handleMustEatClick(m)}
                          >
                            <img src={m.image} alt="" className={styles.mustDeckThumb} loading="lazy" />
                            <div className={styles.rowMain}>
                              <div className={styles.rowName}>{m.dish}</div>
                              <div className={styles.mustDeckRestaurant}>{m.restaurant.name}</div>
                              <div className={styles.rowMeta}>
                                <span>{[m.restaurant.district, m.price].filter(Boolean).join(' · ')}</span>
                              </div>
                            </div>
                            <div className={styles.rowSide} />
                          </button>
                        )
                        pos++
                        maybeInsertBooster()
                      }
                      if (locked.length > 0) {
                        nodes.push(<div key="lbl-l" className={styles.mustDeckSectionLabel}>Noch nicht entdeckt</div>)
                      }
                      for (const m of locked) {
                        const dist = location
                          ? haversineDistance(location.lat, location.lng, m.restaurant.lat, m.restaurant.lng)
                          : null
                        nodes.push(
                          <button
                            key={m._id}
                            className={`${styles.row} ${selectedMustEat?._id === m._id ? styles.rowActive : ''}`}
                            onClick={() => handleMustEatClick(m)}
                          >
                            <div className={styles.mustDeckThumbWrap}>
                              <img src="/pics/card-back.webp" alt="" className={styles.mustDeckThumbCard} loading="lazy" />
                            </div>
                            <div className={styles.rowMain}>
                              <div className={styles.rowName}>{m.restaurant.name}</div>
                              <div className={styles.mustDeckRestaurant}>{m.restaurant.district}</div>
                              <div className={styles.mustDeckLockedTag}>
                                <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/>
                                </svg>
                                Verschlossen
                              </div>
                            </div>
                            {dist !== null && (
                              <div className={styles.mustDeckDist}>{formatDistance(dist)}</div>
                            )}
                            <div className={styles.rowSide} />
                          </button>
                        )
                        pos++
                        maybeInsertBooster()
                      }
                      return <>{nodes}</>
                    })()}
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>
      )}
    </div>
  )
}
