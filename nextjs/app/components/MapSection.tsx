'use client'
import { useRef, useState, useMemo, useCallback, useEffect, useLayoutEffect } from 'react'
import { flushSync } from 'react-dom'
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
import { useLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
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
import { onAuthStateChanged } from 'firebase/auth'
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
  const { sheetRef, handleRef, contentRef, setContentRef, setHeaderRef, snap, setSnap, dragging, reapplySnap, configure, snapToVisiblePx } = useBottomSheet('mid')
  // Mirror the sheet element so we can read its current --sheet-visible-px
  // (set by useBottomSheet on every applyY) for accurate flyTo padding.
  const sheetElRef = useRef<HTMLDivElement | null>(null)
  const setSheetRef = useCallback((el: HTMLDivElement | null) => {
    sheetElRef.current = el
    sheetRef(el)
  }, [sheetRef])

  const snapDetailToContent = useCallback(() => {
    if (typeof window === 'undefined') return
    const mount = contentRef.current
    if (!mount) return
    const scroller = mount.querySelector<HTMLElement>('[data-detail-scroll]')
    if (!scroller) return

    const isMobile = window.matchMedia('(max-width: 1023.98px)').matches

    const heroEl =
      mount.querySelector<HTMLElement>(`.${styles.detailHeroWrap}`) ??
      mount.querySelector<HTMLElement>(`.${styles.mustEatHero}`)
    const heroInner = heroEl?.querySelector<HTMLElement>(
      'img, [class*="detailHero"]:not([class*="Wrap"])'
    ) ?? null

    // Reset any inline shrink applied for a previous (taller) detail so we
    // measure at the natural CSS-defined hero size for THIS detail. Without
    // this, navigating from Wen Cheng (heavy) → Crapulix (light) keeps the
    // hero at the shrunken Wen Cheng height.
    if (heroEl) {
      heroEl.style.maxHeight = ''
      heroEl.style.height = ''
    }
    if (heroInner) heroInner.style.maxHeight = ''

    const measure = () => {
      let h = 0
      for (const child of Array.from(scroller.children)) {
        h += (child as HTMLElement).offsetHeight
      }
      const cs = getComputedStyle(scroller)
      return h + parseFloat(cs.paddingTop || '0') + parseFloat(cs.paddingBottom || '0')
    }

    // Available height ceiling.
    // Mobile: min of the sheet's container height and 95 % of the visual
    // viewport (Safari URL bar safe). Desktop: the sidebar's own height
    // (100 % of .body, which is viewport minus the global header).
    const vh = window.visualViewport?.height ?? window.innerHeight
    const sheetH = sheetElRef.current?.getBoundingClientRect().height ?? Math.round(vh * 0.95)
    const maxH = isMobile
      ? Math.min(sheetH, Math.round(vh * 0.95))
      : sheetH

    // Reset any inline shrink we previously applied to the must-eat mini-card
    // grid so this detail measures at its natural sizes too.
    const mustGridEl = mount.querySelector<HTMLElement>(`.${styles.mustGrid}`)
    if (mustGridEl) mustGridEl.style.gridTemplateColumns = ''

    let contentH = measure()

    // Distribute overflow across two shrinkable elements before going to the
    // absolute hero floor:
    //   1. Hero photo (.detailHeroWrap or .mustEatHero) — primary visual,
    //      keep above a generous comfortable floor so it stays a real photo.
    //   2. Must-Eat mini-card grid (.mustGrid) — secondary visual, scale
    //      down by widening grid auto-fill so cards are smaller.
    // 16 px cushion guards against late-layout reflow (font metrics, etc.).
    // Comfortable floors are set high (200 / 240) so the hero only takes a
    // small bite of the overflow, and the must-eat grid (smaller cards)
    // absorbs the rest. Falls through to absolute floor only when grid
    // shrinking isn't enough.
    const cushion = 16
    const heroComfortableFloor = isMobile ? 200 : 240
    const heroAbsoluteFloor    = isMobile ? 100 : 140

    if (contentH > maxH - cushion && heroEl) {
      // Stage 1: shrink hero down to its comfortable floor.
      let overflow = contentH - (maxH - cushion)
      const currentHeroH = heroEl.offsetHeight
      const heroComfortableShrink = Math.max(0, currentHeroH - heroComfortableFloor)
      const heroShrink = Math.min(overflow, heroComfortableShrink)
      if (heroShrink > 0) {
        const newH = currentHeroH - heroShrink
        heroEl.style.maxHeight = `${newH}px`
        heroEl.style.height = `${newH}px`
        if (heroInner) heroInner.style.maxHeight = `${newH}px`
        contentH = measure()
        overflow = Math.max(0, contentH - (maxH - cushion))
      }

      // Stage 2: shrink must-eat grid (smaller mini cards) for the rest.
      if (overflow > 0 && mustGridEl) {
        const gridH = mustGridEl.offsetHeight
        if (gridH > 0) {
          const targetGridH = Math.max(60, gridH - overflow)
          const ratio = targetGridH / gridH
          // Default grid is `repeat(auto-fill, minmax(72px, 1fr))`. Scale
          // the min column width proportionally; floor at 48 px so cards
          // stay tappable.
          const newMinPx = Math.max(48, Math.floor(72 * ratio))
          mustGridEl.style.gridTemplateColumns = `repeat(auto-fill, minmax(${newMinPx}px, 1fr))`
          contentH = measure()
          overflow = Math.max(0, contentH - (maxH - cushion))
        }
      }

      // Stage 3 (last resort): keep shrinking hero past the comfortable
      // floor down to the absolute floor for very heavy content.
      if (overflow > 0) {
        const cur = heroEl.offsetHeight
        const newH = Math.max(heroAbsoluteFloor, cur - overflow)
        if (newH < cur) {
          heroEl.style.maxHeight = `${newH}px`
          heroEl.style.height = `${newH}px`
          if (heroInner) heroInner.style.maxHeight = `${newH}px`
          contentH = measure()
        }
      }
    }

    // Mobile only: snap the bottom sheet visible-px to the (now-fitting)
    // content height. Desktop's sidebar is already a fixed-height column,
    // CSS lays it out — no snap needed.
    if (isMobile) {
      snapToVisiblePx(Math.min(contentH + 8, maxH))
    }
  }, [snapToVisiblePx, contentRef])

  const [mapZoom,            setMapZoom]            = useState(12)
  const [layer,              setLayer]              = useState<MapLayer>('restaurants')
  const [category,           setCategory]           = useState<MapCategory>('All')
  const [search,             setSearch]             = useState('')
  const [bezirk,             setBezirk]             = useState<string | null>(null)
  const [openOnly,           setOpenOnly]           = useState(false)
  const [selectedRestaurant, setSelectedRestaurant] = useState<MapRestaurant | null>(null)
  const [selectedMustEat,    setSelectedMustEat]    = useState<MapMustEat | null>(null)
  const [sheetView,          setSheetView]          = useState<'list' | 'detail'>('list')
  const [sort,               setSort]               = useState<'distance' | 'name' | 'price'>('distance')
  const [filterOpen,         setFilterOpen]         = useState(false)
  const [searchOpen,         setSearchOpen]         = useState(false)

  useLayoutEffect(() => {
    if (sheetView !== 'detail') return
    if (typeof window === 'undefined') return
    // Initial snap after DOM is set + once after paint.
    snapDetailToContent()
    const id = requestAnimationFrame(snapDetailToContent)

    // Re-snap whenever the detail content's measured height changes — covers
    // hero image loading (was 0 px → now full size), font metrics settling,
    // and any late layout shifts that would otherwise leave the sheet stuck
    // at the initial under-measure size.
    let ro: ResizeObserver | null = null
    const mount = contentRef.current
    const scroller = mount?.querySelector<HTMLElement>('[data-detail-scroll]') ?? null
    if (scroller && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        snapDetailToContent()
      })
      // Observe each direct child individually — the scroller itself has
      // flex:1 so its own size doesn't change with content; the children's
      // sizes do.
      for (const child of Array.from(scroller.children)) {
        ro.observe(child as HTMLElement)
      }
    }

    // Re-snap when the hero image finishes loading (offsetHeight before load
    // is tiny → snap measures wrong → user sees the sheet at the under-sized
    // height with internal scroll). ResizeObserver catches most cases but
    // an explicit load handler is the belt to RO's suspenders.
    const onImgLoad = () => snapDetailToContent()
    const heroImgs = mount?.querySelectorAll<HTMLImageElement>('img') ?? []
    heroImgs.forEach(img => {
      if (!img.complete) img.addEventListener('load', onImgLoad, { once: true })
    })

    // iOS Safari's URL bar collapses/expands as the user scrolls — that
    // changes visualViewport.height, which is part of our maxH. Re-fit
    // whenever the viewport resizes so the shrink stays correct.
    const onVvResize = () => snapDetailToContent()
    window.visualViewport?.addEventListener('resize', onVvResize)

    return () => {
      cancelAnimationFrame(id)
      ro?.disconnect()
      heroImgs.forEach(img => img.removeEventListener('load', onImgLoad))
      window.visualViewport?.removeEventListener('resize', onVvResize)
    }
  }, [sheetView, selectedRestaurant, selectedMustEat, snapDetailToContent, contentRef])

  /* Swipe-down-to-close on detail. Only initiates from the hero area
     (top ~240 px) and only when the inner scroll is at the top — so users
     can still scroll the body content without triggering close. */

  /* Filter / sort changes — reset list scroll to the top so the user always
     sees the first results of the new filter, not where they happened to be
     scrolled in the previous list. */
  useEffect(() => {
    if (sheetView !== 'list') return
    const el = contentRef.current
    if (el) el.scrollTop = 0
  }, [sheetView, category, bezirk, openOnly, sort, search, layer, contentRef])

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
    if (sort === 'price') {
      // Ascending: € first, €€€€ last. Restaurants without a price land last.
      const priceRank = (p?: string | null): number => p ? p.length : 99
      return [...filtered].sort((a, b) => {
        const d = priceRank(a.price) - priceRank(b.price)
        if (d !== 0) return d
        return a.name.localeCompare(b.name, 'de')
      })
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
  }, [snap])

  /* After the auto-fit detail sheet settles at its content height, re-centre
     the camera so the marker actually lands above the (just-expanded) sheet.
     The initial flyTo in click handlers uses an estimate ('full') and is
     usually off — short detail (Crapulix) → too low; tall (Schüsseldienst) →
     hidden behind the sheet. Reads --sheet-visible-px which is now accurate. */
  useEffect(() => {
    if (sheetView !== 'detail') return
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(max-width: 1023.98px)').matches) return
    const target = selectedRestaurant
      ? { lat: selectedRestaurant.lat, lng: selectedRestaurant.lng }
      : selectedMustEat
        ? { lat: selectedMustEat.restaurant.lat, lng: selectedMustEat.restaurant.lng }
        : null
    if (!target) return
    let cancelled = false
    // Three frames: snapDetailToContent runs after two rAF; we recentre on
    // the third, by which point --sheet-visible-px reflects the final size.
    const id = requestAnimationFrame(() => {
      if (cancelled) return
      requestAnimationFrame(() => {
        if (cancelled) return
        requestAnimationFrame(() => {
          if (cancelled || !mapRef.current) return
          mapRef.current.easeTo({
            center: [target.lng, target.lat],
            duration: 320,
            padding: getFlyPadding(),
          })
        })
      })
    })
    return () => { cancelled = true; cancelAnimationFrame(id) }
  }, [sheetView, selectedRestaurant, selectedMustEat, getFlyPadding])

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
    // Pass 'full' on mobile because the sheet is about to expand to the
    // content-fit detail height (~58–95 % of viewport). Using current 'mid'
    // padding here means the marker would be centred ABOVE where the detail
    // sheet actually ends up — usually behind it.
    mapRef.current?.flyTo({
      center: [r.lng, r.lat],
      zoom: 15,
      duration: 500,
      padding: getFlyPadding(isMobile ? 'full' : undefined),
    })
  }, [getFlyPadding])

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
        padding: getFlyPadding('full'),
      })
      return
    }
    const isLocked = !unlockedIds.has(m._id)
    const open = () => {
      setSelectedMustEat(m)
      setSheetView('detail')
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
  }, [selectedMustEat, selectedRestaurant, getFlyPadding, setSnap, reapplySnap])

  const handleShowMustEatList = useCallback(() => {
    setSelectedMustEat(null)
    setLayer('mustEats')
    setSheetView('list')
    setSnap('mid')
    reapplySnap('mid')
  }, [setSnap, reapplySnap])

  const handleMapClick = useCallback(() => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023.98px)').matches
    if (!selectedRestaurant && !selectedMustEat) {
      // No detail open — collapse the list to peek so the map is visible.
      if (isMobile && snap !== 'peek') setSnap('peek')
      return
    }
    setSelectedRestaurant(null)
    setSelectedMustEat(null)
    setSheetView('list')
    if (isMobile) {
      setSnap('peek')
      // Force the CSS to peek even when React snap state was already 'peek'
      // (snapDetailToContent updates snapRef without setSnap, so the React
      // state may have ended up at 'peek' while CSS is at custom detail-height).
      reapplySnap('peek')
    }
  }, [selectedRestaurant, selectedMustEat, setSnap, snap, reapplySnap])

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
      : { maxSnap: null, locked: false } // list: allow drag up to full (under header)
    )
  }, [sheetView, configure])

  /* Swipe-down-to-close on detail. Mounts a touch listener on the sheet that
     starts dragging when the user touches the hero area (top ~240 px) AND the
     inner content scroll is at the top — so users can still scroll the body. */
  useEffect(() => {
    if (sheetView !== 'detail') return
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(max-width: 1023.98px)').matches) return
    const sheet = sheetElRef.current
    const mount = contentRef.current
    if (!sheet || !mount) return

    let startY: number | null = null
    let basePx = 0
    let active = false

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const sheetRect = sheet.getBoundingClientRect()
      const offset = e.touches[0].clientY - sheetRect.top
      // Only initiate from the hero region (avoids fighting body scrolls).
      if (offset > 240) return
      const scroller = mount.querySelector<HTMLElement>('[data-detail-scroll]')
      if (scroller && scroller.scrollTop > 5) return
      startY = e.touches[0].clientY
      const cssY = sheet.style.getPropertyValue('--sheet-y')
      basePx = cssY ? parseFloat(cssY) : 0
      active = false
    }

    const onMove = (e: TouchEvent) => {
      if (startY === null) return
      const dy = e.touches[0].clientY - startY
      if (dy < 0) return
      if (!active && dy < 8) return
      if (!active) {
        active = true
        // Kill the transition while the finger drives the sheet so movement
        // is 1:1 instead of stuttering through 0.28 s eases per frame.
        sheet.style.transition = 'none'
      }
      // Block native scroll / pull-to-refresh during the drag so Chrome's
      // mobile-emulation rubber-band can't fight our sheet movement and
      // leave it stuck at the bottom on release.
      if (e.cancelable) e.preventDefault()
      sheet.style.setProperty('--sheet-y', `${basePx + dy}px`)
    }

    const onEnd = (e: TouchEvent) => {
      if (startY === null) return
      const dy = (e.changedTouches[0]?.clientY ?? startY) - startY
      startY = null
      if (!active) return
      active = false
      if (dy > 110) {
        // Two-phase animation:
        //   Phase 1 (~180 ms): slide detail fully off-screen.
        //   Phase 2 (~280 ms): swap content to list, slide sheet UP to mid.
        // The user perceives "detail goes down, list comes up" — no visual
        // pop or bounce of the detail content during the transition.
        const sheetH = sheet.getBoundingClientRect().height
        sheet.style.transition = 'transform 0.18s ease-out'
        requestAnimationFrame(() => {
          sheet.style.setProperty('--sheet-y', `${sheetH}px`)
        })
        window.setTimeout(() => {
          // Sheet is now off-screen. Force the React re-render synchronously
          // (flushSync) so the DOM swap detail → list COMPLETES before the
          // browser paints the next frame. Without this, the up-animation
          // would briefly paint with the OLD detail content visible (a
          // ~16ms "Bup!" of the detail bouncing back up before list shows).
          sheet.style.transition = 'transform 0.22s cubic-bezier(.2,.7,.2,1)'
          flushSync(() => {
            if (selectedRestaurant) handleRestaurantClose()
            else if (selectedMustEat) handleMustEatClose()
          })
          // Now content is list and --sheet-y is at mid (set by reapplySnap
          // inside the close handler). Browser animates from off-screen
          // (set in phase 1) up to mid, with list visible the whole time.
          window.setTimeout(() => { sheet.style.transition = '' }, 240)
        }, 180)
      } else {
        // Snap back smoothly to the auto-sized detail height.
        sheet.style.transition = 'transform 0.18s ease-out'
        requestAnimationFrame(() => {
          sheet.style.setProperty('--sheet-y', `${basePx}px`)
        })
        window.setTimeout(() => { sheet.style.transition = '' }, 200)
      }
    }

    sheet.addEventListener('touchstart', onStart, { passive: true })
    sheet.addEventListener('touchmove', onMove, { passive: false })
    sheet.addEventListener('touchend', onEnd)
    sheet.addEventListener('touchcancel', onEnd)
    return () => {
      sheet.removeEventListener('touchstart', onStart)
      sheet.removeEventListener('touchmove', onMove)
      sheet.removeEventListener('touchend', onEnd)
      sheet.removeEventListener('touchcancel', onEnd)
    }
  }, [sheetView, selectedRestaurant, selectedMustEat, handleRestaurantClose, handleMustEatClose, contentRef])

  const handleUnlock = useCallback(async () => {
    if (!selectedMustEat) return
    if (!uid) {
      window.location.assign(locale === routing.defaultLocale ? '/login' : `/${locale}/login`)
      return
    }
    await unlock(selectedMustEat._id, selectedMustEat.restaurant._id, selectedMustEat.dish)
  }, [selectedMustEat, uid, unlock])

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

  // Deep-link: ?r=<slug> opens the matching restaurant detail directly.
  // Used by profile favourites and any external link that wants to land
  // on the map with a specific spot already open. Polls mapRef so the flyTo
  // doesn't silently no-op if the canvas hasn't finished mounting yet.
  const deepLinkConsumedRef = useRef(false)
  useEffect(() => {
    if (deepLinkConsumedRef.current) return
    if (!isActive) return
    if (restaurants.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const slug = params.get('r')
    if (!slug) return
    const target = restaurants.find(r => r.slug === slug)
    if (!target) return
    deepLinkConsumedRef.current = true
    // Strip the param from the URL so back/refresh doesn't re-trigger.
    params.delete('r')
    const next = window.location.pathname + (params.toString() ? `?${params}` : '') + window.location.hash
    window.history.replaceState(null, '', next)
    // Wait for the map canvas to mount before opening — otherwise the detail
    // sheet opens but the flyTo silently no-ops and the marker stays off-screen.
    let cancelled = false
    const tryOpen = () => {
      if (cancelled) return
      if (mapRef.current) {
        userInteractedRef.current = true
        handleRestaurantClick(target)
      } else {
        setTimeout(tryOpen, 120)
      }
    }
    tryOpen()
    return () => { cancelled = true }
  }, [isActive, restaurants, handleRestaurantClick])

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

          <div className={`${styles.body}${sheetView === 'detail' ? ` ${styles.bodyDetailOpen}` : ''}${sheetView === 'list' && snap === 'full' ? ` ${styles.bodyListAtFull}` : ''}`}>
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
                    fanRotation={m.fanRotation}
                    fanIndex={m.fanIndex}
                    fanCount={m.fanCount}
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
              ref={setSheetRef}
              className={`${styles.list} ${dragging ? styles.listDragging : ''}${
                sheetView === 'list' && snap === 'peek' ? ` ${styles.listAtPeek}` : ''
              }`}
              aria-label={layer === 'restaurants' ? 'Restaurants nearby' : 'Must-Eats'}
            >
              <div ref={handleRef} className={`${styles.handle}${sheetView === 'detail' ? ` ${styles.handleHidden}` : ''}`} aria-hidden="true" />

              {sheetView === 'detail' && selectedMustEat ? (
                <div ref={setContentRef} className={styles.detailMount}>
                  <MustEatDetail
                    mustEat={selectedMustEat}
                    userLocation={location}
                    isUnlocked={unlockedIds.has(selectedMustEat._id)}
                    onUnlock={handleUnlock}
                    onClose={handleMustEatClose}
                    onViewRestaurant={handleViewRestaurantFromMustEat}
                    onShowMustEatList={handleShowMustEatList}
                    uid={uid}
                    inSheet
                  />
                </div>
              ) : sheetView === 'detail' && selectedRestaurant ? (
                <div ref={setContentRef} className={styles.detailMount}>
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
                  {/* Zone B — count row + action buttons (drag handler attached, 8px threshold) */}
                  <div ref={setHeaderRef} className={styles.listHeader}>
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
                            onClick={() => setFilterOpen(v => !v)}
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
                      </div>
                    )}
                  </div>
                  {/* Zone C — category chips: NO drag handler, pure native horizontal scroll */}
                  <div className={styles.listHeaderTabs}>
                    <CategoryFilter active={category} onChange={setCategory} variant="tabs" />
                  </div>
                  <div ref={setContentRef} className={styles.listScroll}>
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
                  <div ref={setContentRef} className={`${styles.listScroll} ${styles.listScrollNoCats}`}>
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
                            <button
                              type="button"
                              className={styles.boosterCta}
                              onClick={() => {
                                if (uid) {
                                  window.location.href = '/profile'
                                } else {
                                  window.location.assign(locale === routing.defaultLocale ? '/login' : `/${locale}/login`)
                                }
                              }}
                            >Pack holen · 0,99 €</button>
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
