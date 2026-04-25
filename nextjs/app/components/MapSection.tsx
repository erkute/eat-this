'use client'
import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import type { MapRestaurant, MapMustEat, MapLayer, MapCategory } from '@/lib/types'
import { useMapData } from '@/lib/map/useMapData'
import { useUserLocation } from '@/lib/map/useUserLocation'
import { useBounds } from '@/lib/map/useBounds'
import { useUnlockedMustEats } from '@/lib/map/useUnlockedMustEats'
import { useBottomSheet } from '@/lib/map/useBottomSheet'
import { getOpenStatus } from '@/lib/map/openingHours'
import { useTranslation } from '@/lib/i18n'
import MapCanvas from './map/MapCanvas'
import RestaurantMarker from './map/RestaurantMarker'
import MustEatMarker from './map/MustEatMarker'
import RestaurantList from './map/RestaurantList'
import RestaurantDetail from './map/RestaurantDetail'
import MustEatDetail from './map/MustEatDetail'
import UserLocationMarker from './map/UserLocationMarker'
import MapToolbar from './map/MapToolbar'
import LayerToggle from './map/LayerToggle'
import CategoryFilter from './map/CategoryFilter'
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
  const { t } = useTranslation()

  const { restaurants, mustEats, loading } = useMapData()
  const { location, request: requestLocation } = useUserLocation()
  const uid = auth.currentUser?.uid ?? null
  const { unlockedIds, unlock } = useUnlockedMustEats(uid)
  const { sheetRef, handleRef, contentRef, snap, setSnap, dragging } = useBottomSheet('mid')
  // Remember the sheet snap from before a detail opens so we can restore it on close.
  const returnSnapRef = useRef<typeof snap | null>(null)

  const [layer,              setLayer]              = useState<MapLayer>('restaurants')
  const [category,           setCategory]           = useState<MapCategory>('All')
  const [search,             setSearch]             = useState('')
  const [bezirk,             setBezirk]             = useState<string | null>(null)
  const [openOnly,           setOpenOnly]           = useState(false)
  const [selectedRestaurant, setSelectedRestaurant] = useState<MapRestaurant | null>(null)
  const [selectedMustEat,    setSelectedMustEat]    = useState<MapMustEat | null>(null)

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

  /* ---------- Filter pipeline (applied to markers + list) ---------- */
  const filterRestaurant = useCallback((r: MapRestaurant): boolean => {
    if (category !== 'All' && !r.categories?.includes(category)) return false
    if (bezirk && districtOf(r) !== bezirk) return false
    if (openOnly) {
      if (!r.openingHours) return false
      if (!getOpenStatus(r.openingHours).isOpen) return false
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      const hit =
        r.name.toLowerCase().includes(q) ||
        (districtOf(r) ?? '').toLowerCase().includes(q) ||
        r.categories?.some(c => c.toLowerCase().includes(q))
      if (!hit) return false
    }
    return true
  }, [category, bezirk, openOnly, search])

  const displayedRestaurants = useMemo(
    () => restaurants.filter(filterRestaurant),
    [restaurants, filterRestaurant]
  )

  const { updateBounds } = useBounds(displayedRestaurants, location)

  const displayedMustEats = useMemo(() => {
    if (!search.trim()) return mustEats
    const q = search.toLowerCase()
    return mustEats.filter(
      m =>
        m.dish.toLowerCase().includes(q) ||
        m.restaurant.name.toLowerCase().includes(q) ||
        m.restaurant.district?.toLowerCase().includes(q)
    )
  }, [mustEats, search])

  const restaurantMustEats = useMemo(() => {
    if (!selectedRestaurant) return []
    return mustEats.filter(m => m.restaurant._id === selectedRestaurant._id)
  }, [mustEats, selectedRestaurant])

  /* ---------- Handlers ---------- */
  // Remember the camera state from before a detail-open flyTo so closing the
  // detail can restore it (user can click through a filtered list without
  // losing their bird's-eye overview).
  const returnViewRef = useRef<{ lng: number; lat: number; zoom: number } | null>(null)

  // Padding the map should respect when centering on a point, so spots don't
  // land behind the bottom sheet (mobile) or side panel (desktop).
  const getFlyPadding = useCallback(() => {
    if (typeof window === 'undefined') return undefined
    const isMobile = window.matchMedia('(max-width: 1023.98px)').matches
    if (!isMobile) return { top: 0, bottom: 0, left: 0, right: 420 }
    const sheetEl = document.querySelector<HTMLElement>('aside[aria-label]')
    const raw = sheetEl ? getComputedStyle(sheetEl).getPropertyValue('--sheet-visible-px').trim() : ''
    const visible = raw.endsWith('px') ? parseFloat(raw) : NaN
    const bottom = Number.isFinite(visible) && visible > 0 ? visible : 350
    return { top: 60, bottom: bottom + 20, left: 20, right: 20 }
  }, [])

  const rememberView = useCallback(() => {
    if (selectedRestaurant || selectedMustEat) return // nested open — keep first stash
    const m = mapRef.current
    if (m) {
      const c = m.getCenter()
      returnViewRef.current = { lng: c.lng, lat: c.lat, zoom: m.getZoom() }
    }
    returnSnapRef.current = snap
  }, [selectedRestaurant, selectedMustEat, snap])

  const restoreView = useCallback(() => {
    const v = returnViewRef.current
    if (v) {
      mapRef.current?.flyTo({ center: [v.lng, v.lat], zoom: v.zoom, duration: 500, padding: getFlyPadding() })
    }
    const s = returnSnapRef.current
    if (s) setSnap(s)
    returnViewRef.current = null
    returnSnapRef.current = null
  }, [setSnap, getFlyPadding])

  const handleRestaurantClick = useCallback((r: MapRestaurant) => {
    rememberView()
    setSelectedRestaurant(r)
    setSelectedMustEat(null)
    setSnap('peek')
    mapRef.current?.flyTo({ center: [r.lng, r.lat], zoom: 15, duration: 500, padding: getFlyPadding() })
  }, [setSnap, rememberView, getFlyPadding])

  const handleMustEatClick = useCallback((m: MapMustEat) => {
    const isLocked = !unlockedIds.has(m._id)
    rememberView()
    const open = () => {
      setSelectedMustEat(m)
      setSelectedRestaurant(null)
      setSnap('peek')
      mapRef.current?.flyTo({ center: [m.restaurant.lng, m.restaurant.lat], zoom: 15, duration: 500, padding: getFlyPadding() })
    }
    // Let the back-card wiggle animation play before the detail modal covers it.
    if (isLocked) setTimeout(open, 420)
    else open()
  }, [setSnap, unlockedIds, rememberView, getFlyPadding])

  const handleRestaurantClose = useCallback(() => {
    setSelectedRestaurant(null)
    restoreView()
  }, [restoreView])

  const handleMustEatClose = useCallback(() => {
    setSelectedMustEat(null)
    restoreView()
  }, [restoreView])

  const handleMapClick = useCallback(() => {
    // Clicking the map also counts as dismissing the detail → restore view.
    if (selectedRestaurant || selectedMustEat) restoreView()
    setSelectedRestaurant(null)
    setSelectedMustEat(null)
    setSnap('peek')
  }, [setSnap, selectedRestaurant, selectedMustEat, restoreView])

  const handleBezirkChange = useCallback((name: string | null) => {
    setBezirk(name)
    if (name) {
      const c = bezirkCenters.get(name)
      if (c) mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom: 13, duration: 600, padding: getFlyPadding() })
    } else {
      // "Alle Bezirke" → zoom out to a city-wide overview of Berlin.
      mapRef.current?.flyTo({ center: [13.405, 52.52], zoom: 10.5, duration: 700, padding: getFlyPadding() })
    }
  }, [bezirkCenters, getFlyPadding])

  const handleUnlock = useCallback(async () => {
    if (!selectedMustEat) return
    await unlock(selectedMustEat._id, selectedMustEat.restaurant._id, selectedMustEat.dish)
  }, [selectedMustEat, unlock])

  const handleLocateMe = useCallback(async () => {
    const loc = await requestLocation()
    if (loc) {
      mapRef.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 14, duration: 600, padding: getFlyPadding() })
    }
  }, [requestLocation, getFlyPadding])

  /* Auto-center on the user's position the first time the map page opens.
     Ref guard handles React strict-mode double-mount so we don't double-prompt. */
  const autoLocatedRef = useRef(false)
  useEffect(() => {
    if (autoLocatedRef.current) return
    autoLocatedRef.current = true
    let cancelled = false
    requestLocation().then(loc => {
      if (cancelled || !loc) return
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
  const toolbarProps = {
    search, onSearch: setSearch,
    category, onCategory: setCategory,
    bezirke: bezirkNames, bezirk, onBezirk: handleBezirkChange,
    openOnly, onOpenOnly: setOpenOnly,
    showCategory: layer === 'restaurants',
    layer, onLayer: setLayer,
  }

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

          <MapToolbar variant="desktop" {...toolbarProps} />

          <div className={styles.body}>
            <div className={styles.mapWrap}>
              <MapCanvas ref={mapRef} onMove={updateBounds} onMapClick={handleMapClick}>
                {layer === 'restaurants' && displayedRestaurants.map(r => (
                  <RestaurantMarker
                    key={r._id}
                    restaurant={r}
                    isSelected={selectedRestaurant?._id === r._id}
                    onClick={handleRestaurantClick}
                  />
                ))}
                {layer === 'mustEats' && displayedMustEats.map(m => (
                  <MustEatMarker
                    key={m._id}
                    mustEat={m}
                    isUnlocked={unlockedIds.has(m._id)}
                    isSelected={selectedMustEat?._id === m._id}
                    userLocation={location}
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

              <MapToolbar variant="mobile" {...toolbarProps} />

              {selectedRestaurant && (
                <RestaurantDetail
                  restaurant={selectedRestaurant}
                  mustEats={restaurantMustEats}
                  unlockedIds={unlockedIds}
                  userLocation={location}
                  onClose={handleRestaurantClose}
                  onMustEatClick={handleMustEatClick}
                />
              )}
              {selectedMustEat && (
                <MustEatDetail
                  mustEat={selectedMustEat}
                  userLocation={location}
                  isUnlocked={unlockedIds.has(selectedMustEat._id)}
                  onUnlock={handleUnlock}
                  onClose={handleMustEatClose}
                />
              )}
            </div>

            <aside
              ref={sheetRef}
              className={`${styles.list} ${dragging ? styles.listDragging : ''}`}
              aria-label={layer === 'restaurants' ? 'Restaurants nearby' : 'Must-Eats'}
            >
              <div ref={handleRef} className={styles.handle} aria-hidden="true" />

              {layer === 'restaurants' ? (
                <>
                  <div className={styles.listHeader}>
                    <div className={styles.listTitle}>
                      {displayedRestaurants.length}{' '}
                      {displayedRestaurants.length === 1 ? t('map.restaurantOne') : t('map.restaurantMany')}
                    </div>
                  </div>
                  <div className={styles.sheetCategories}>
                    <CategoryFilter active={category} onChange={setCategory} />
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
                  <div className={styles.listHeader}>
                    <div className={styles.listTitle}>
                      {unlockedIds.size}/{mustEats.length} {t('map.mustEatsUnlocked')}
                    </div>
                  </div>
                  <div ref={contentRef} className={styles.listScroll}>
                    {displayedMustEats.length === 0 ? (
                      <div className={styles.empty}>{t('map.noMustEatsMatch')}</div>
                    ) : (
                      displayedMustEats.map(m => (
                        <button
                          key={m._id}
                          className={`${styles.row} ${selectedMustEat?._id === m._id ? styles.rowActive : ''}`}
                          onClick={() => handleMustEatClick(m)}
                        >
                          <img
                            src={unlockedIds.has(m._id) ? m.image : '/pics/card-back.webp'}
                            alt=""
                            className={unlockedIds.has(m._id) ? styles.rowPhoto : styles.rowPhotoCard}
                            loading="lazy"
                          />
                          <div className={styles.rowMain}>
                            <div className={styles.rowName}>
                              {unlockedIds.has(m._id) ? m.dish : t('map.hiddenMustEat')}
                            </div>
                            <div className={styles.rowMeta}>
                              {m.restaurant.name}{m.restaurant.district ? ` · ${m.restaurant.district}` : ''}
                            </div>
                          </div>
                          <div className={styles.rowSide} />
                        </button>
                      ))
                    )}
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
