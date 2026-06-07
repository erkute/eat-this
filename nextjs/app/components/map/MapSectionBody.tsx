'use client'
import type { Ref, RefObject } from 'react'
import { useTranslations } from 'next-intl'
import type { MapRef } from 'react-map-gl/maplibre'
import type { MapRestaurant, MapMustEat, MapCategory } from '@/lib/types'
import type { CategoryDef } from '@/lib/categories'
import type {
  SheetView,
  SheetSnap,
  UserLocation,
  UserTier,
} from '@/lib/map'

import MapCanvas from './MapCanvas'
import RestaurantMarker from './RestaurantMarker'
import RestaurantList from './RestaurantList'
import MapSheetDetail from './MapSheetDetail'
import UserLocationMarker from './UserLocationMarker'
import MapListHeader from './MapListHeader'
/* BezirkFilterPill removed — redundant now that the bezirk filter shows
   as a chip in the list header. The chip also has reset built in. */
import styles from './map.module.css'

/* Refs (mutable + callback) wired up by `useMapSheet` / `useBottomSheet`. */
interface MapBodyRefs {
  mapRef: RefObject<MapRef | null>
  handleRef: Ref<HTMLDivElement | null>
  setHeaderRef: (el: HTMLDivElement | null) => void
  setContentRef: (el: HTMLDivElement | null) => void
  setSheetRef: (el: HTMLDivElement | null) => void
}

/* What the body renders: pure UI flags (sheet view, snap, drag) plus the
   data lists / selections / user context that drive markers and the sheet. */
interface MapBodyState {
  isActive: boolean
  sheetView: SheetView
  snap: SheetSnap
  dragging: boolean
  desktopPanelHidden: boolean
  displayedRestaurants: MapRestaurant[]
  /** Locked preview rows — same filter pipeline as displayedRestaurants,
   *  rendered as blurred entries below the booster banner in the list. */
  displayedLockedRestaurants: MapRestaurant[]
  restaurantMustEats: MapMustEat[]
  selectedRestaurant: MapRestaurant | null
  selectedMustEat: MapMustEat | null
  primaryMustEats: Map<string, MapMustEat>
  unlockedIds: Set<string>
  /** Must-eat IDs pre-revealed for anon visitors. Empty for signed-in users. */
  revealedMustEatIds: Set<string>
  favoriteIds: Set<string>
  location: UserLocation | null
  uid: string | null
  userTier: UserTier
}

/* Filter values + their setters / change handlers. Bundled together because
   each value travels with its setter in the same render. */
interface MapBodyFilterState {
  categories: CategoryDef[]
  category: MapCategory
  setCategory: (c: MapCategory) => void
  search: string
  onSearchChange: (v: string) => void
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  bezirk: string | null
  bezirkNames: string[]
  onBezirkChange: (name: string | null) => void
  cuisine: string | null
  setCuisine: (c: string | null) => void
  cuisineNames: string[]
  openOnly: boolean
  setOpenOnly: (v: boolean) => void
}

/* Map / sheet event handlers (everything not filter-related). */
interface MapBodyHandlers {
  onMapMove: (bounds: { north: number; south: number; east: number; west: number }) => void
  onMapClick: () => void
  onRestaurantClick: (r: MapRestaurant) => void
  onMustEatClick: (m: MapMustEat) => void
  pagerPrev: MapRestaurant | null
  pagerNext: MapRestaurant | null
  onPageRestaurant: (dir: 'prev' | 'next') => void
  onLocateMe: () => void
  locateLoading: boolean
  onRestaurantClose: () => void
  onMustEatClose: () => void
  mustEatPagerPrev: MapMustEat | null
  mustEatPagerNext: MapMustEat | null
  onPageMustEat: (dir: 'prev' | 'next') => void
  onViewRestaurantFromMustEat: () => void
  onUnlock: () => Promise<void>
  onToggleFavorite: () => void
  onToggleDesktopPanel: () => void
}

/* Host-locale-aware aria copy passed in from the server-rendered shell. */
interface MapBodyAria {
  myLocationAriaLabel: string
  restaurantsListAriaLabel: string
}

export type MapSectionBodyProps =
  & MapBodyRefs
  & MapBodyState
  & MapBodyFilterState
  & MapBodyHandlers
  & MapBodyAria

export default function MapSectionBody(props: MapSectionBodyProps) {
  const tNav = useTranslations('nav')
  const {
    isActive,
    mapRef, handleRef, setHeaderRef, setContentRef, setSheetRef,
    sheetView, snap, dragging,
    displayedRestaurants, displayedLockedRestaurants, restaurantMustEats,
    pagerPrev, pagerNext, onPageRestaurant,
    selectedRestaurant, selectedMustEat,
    primaryMustEats, unlockedIds, revealedMustEatIds, favoriteIds, location, uid, userTier,
    categories, category, setCategory, search, bezirk, bezirkNames,
    cuisine, setCuisine, cuisineNames,
    openOnly, setOpenOnly,
    searchOpen, setSearchOpen,
    onMapMove, onMapClick, onRestaurantClick, onMustEatClick, onLocateMe, locateLoading,
    onRestaurantClose, onMustEatClose,
    mustEatPagerPrev, mustEatPagerNext, onPageMustEat,
    onViewRestaurantFromMustEat, onUnlock,
    onSearchChange, onBezirkChange, onToggleFavorite,
    desktopPanelHidden, onToggleDesktopPanel,
    myLocationAriaLabel, restaurantsListAriaLabel,
  } = props

  const handleResetFilters = () => {
    setCategory('All')
    onBezirkChange(null)
    setCuisine(null)
    setOpenOnly(false)
    onSearchChange('')
  }

  return (
    <div
      className={`app-page${isActive ? ' active' : ''}`}
      data-page="map"
    >
      <div className={styles.shell}>

        {/* bodyListAtFull / bodyDetailOpen slide the floating search toolbar +
            burger chip up off-screen (see map.module.css) — Google-Maps
            behavior. */}
        <div className={`${styles.body}${sheetView === 'detail' ? ` ${styles.bodyDetailOpen}` : ''}${sheetView === 'list' && snap === 'full' ? ` ${styles.bodyListAtFull}` : ''}${desktopPanelHidden ? ` ${styles.bodyPanelHidden}` : ''}`}>
          <div className={styles.mapWrap}>
            <MapCanvas ref={mapRef} onMove={onMapMove} onMapClick={onMapClick}>
              {displayedRestaurants.map(r => (
                <RestaurantMarker
                  key={r._id}
                  restaurant={r}
                  isSelected={selectedRestaurant?._id === r._id}
                  onClick={onRestaurantClick}
                />
              ))}
              {/* Deep-Link/Locked-Selektion: der selektierte Spot kann außerhalb
                  des sichtbaren Sets liegen (alter Share-Link, locked Preview).
                  Immer einen Pin geben — sonst zentriert die Kamera sichtbar
                  auf nichts. */}
              {selectedRestaurant &&
                !displayedRestaurants.some((r) => r._id === selectedRestaurant._id) && (
                  <RestaurantMarker
                    key={selectedRestaurant._id}
                    restaurant={selectedRestaurant}
                    isSelected
                    onClick={onRestaurantClick}
                  />
                )}
              {location && <UserLocationMarker location={location} />}
            </MapCanvas>

            {/* Floating search — collapsed to a square icon button by
                default (2026-06-04: the always-on toolbar read too loud over
                the tiles). Tapping expands the full input; it stays open
                while a query is active so the filter is never invisible. */}
            {searchOpen || search ? (
              <div className={styles.mapSearchToolbar}>
                <svg className={styles.mapSearchIcon} viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => onSearchChange(e.target.value)}
                  onBlur={() => { if (!search) setSearchOpen(false) }}
                  placeholder="Suchen in Berlin"
                  className={styles.mapSearchInput}
                  aria-label="Search"
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.mapSearchClear}
                  onClick={() => { onSearchChange(''); setSearchOpen(false) }}
                  aria-label="Clear"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.mapSearchBtn}
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
              >
                <svg className={styles.mapSearchIcon} viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={onLocateMe}
              disabled={locateLoading}
              aria-label={myLocationAriaLabel}
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

          {/* Floating burger — lives in .body's stacking context, BELOW the
              bottom-sheet (z-index 3 vs 4): when the sheet is dragged up it
              slides over the burger, same as the search toolbar. */}
          <button
            type="button"
            className={styles.mapBurger}
            aria-label={tNav('menuAriaLabel')}
            onClick={() => { document.getElementById('burgerBtn')?.click() }}
          >
            <img src="/pics/icon-burger.webp?v=3" alt="" aria-hidden="true" draggable={false} />
          </button>

          <aside
            ref={setSheetRef}
            className={`${styles.list} ${dragging ? styles.listDragging : ''}`}
            data-snap={snap}
            data-view={sheetView}
            aria-label={restaurantsListAriaLabel}
          >
            <div ref={handleRef} className={styles.handle} data-sheet-handle="" aria-hidden="true" />

            {/* Restaurant detail's chrome now lives on the photo hero (back
                pill + save bookmark, per the Chewy mockup) — no handle-bar
                icons here. */}

            {/* Must-Eat detail has no handle-bar X/back chrome — the sheet is
                dismissed by dragging it down; "Zum Spot" + the pager are the
                in-sheet actions. */}

            {sheetView === 'detail' && selectedMustEat ? (
              <MapSheetDetail
                kind="mustEat"
                contentRef={setContentRef}
                uid={uid}
                userTier={userTier}
                userLocation={location}
                unlockedIds={unlockedIds}
                mustEat={selectedMustEat}
                onUnlock={onUnlock}
                onClose={onMustEatClose}
                onViewRestaurant={onViewRestaurantFromMustEat}
                prevMustEat={mustEatPagerPrev}
                nextMustEat={mustEatPagerNext}
                onPagePrev={() => onPageMustEat('prev')}
                onPageNext={() => onPageMustEat('next')}
              />
            ) : sheetView === 'detail' && selectedRestaurant ? (
              <MapSheetDetail
                kind="restaurant"
                contentRef={setContentRef}
                uid={uid}
                userTier={userTier}
                userLocation={location}
                unlockedIds={unlockedIds}
                restaurant={selectedRestaurant}
                mustEats={restaurantMustEats}
                revealedMustEatIds={revealedMustEatIds}
                onClose={onRestaurantClose}
                onMustEatClick={onMustEatClick}
                isFavorite={favoriteIds.has(selectedRestaurant._id)}
                onToggleFavorite={onToggleFavorite}
                prevRestaurant={pagerPrev}
                nextRestaurant={pagerNext}
                onPagePrev={() => onPageRestaurant('prev')}
                onPageNext={() => onPageRestaurant('next')}
              />
            ) : (
              <>
                <MapListHeader
                  headerRef={setHeaderRef}
                  categories={categories}
                  category={category}
                  onCategoryChange={setCategory}
                  openOnly={openOnly}
                  onOpenOnly={setOpenOnly}
                  bezirkNames={bezirkNames}
                  bezirk={bezirk}
                  onBezirk={onBezirkChange}
                  cuisineNames={cuisineNames}
                  cuisine={cuisine}
                  onCuisine={setCuisine}
                />
                <div ref={setContentRef} className={styles.listScroll}>
                  <RestaurantList
                    restaurants={displayedRestaurants}
                    lockedRestaurants={displayedLockedRestaurants}
                    userLocation={location}
                    selectedId={selectedRestaurant?._id ?? null}
                    uid={uid}
                    userTier={userTier}
                    onSelect={onRestaurantClick}
                    primaryMustEats={primaryMustEats}
                    unlockedIds={unlockedIds}
                    revealedMustEatIds={revealedMustEatIds}
                    onResetFilters={handleResetFilters}
                    activeBezirk={bezirk}
                  />
                </div>
              </>
            )}
          </aside>

          {/* Desktop-only toggle to slide the side panel off to the right
              (Google-Maps-style). Mobile gets the chevron-collapse button
              inside the sheet handle area instead. Icon flips based on
              current state — points right when shown (= "hide"), left
              when hidden (= "show"). */}
          <button
            type="button"
            className={styles.panelToggle}
            aria-label={desktopPanelHidden ? 'Show panel' : 'Hide panel'}
            aria-pressed={desktopPanelHidden}
            onClick={onToggleDesktopPanel}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points={desktopPanelHidden ? '15 6 9 12 15 18' : '9 6 15 12 9 18'} />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
