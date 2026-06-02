'use client'
import type { Ref, RefObject } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import type { MapRestaurant, MapMustEat, MapLayer, MapCategory } from '@/lib/types'
import type { CategoryDef } from '@/lib/categories'
import type {
  SheetView,
  SheetSnap,
  MustEatWithDisplay,
  UserLocation,
  UserTier,
} from '@/lib/map'

import MapCanvas from './MapCanvas'
import RestaurantMarker from './RestaurantMarker'
import MustEatMarker from './MustEatMarker'
import RestaurantList from './RestaurantList'
import MapSheetDetail from './MapSheetDetail'
import UserLocationMarker from './UserLocationMarker'
import MapMustEatsList from './MapMustEatsList'
import MapListHeader from './MapListHeader'
import { BackIcon, CloseIcon, HeartIcon, ShareIcon } from './icons'
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
  layer: MapLayer
  desktopPanelHidden: boolean
  displayedRestaurants: MapRestaurant[]
  /** Locked preview rows — same filter pipeline as displayedRestaurants,
   *  rendered as blurred entries below the booster banner in the list. */
  displayedLockedRestaurants: MapRestaurant[]
  fannedMustEats: MustEatWithDisplay<MapMustEat>[]
  displayedMustEats: MapMustEat[]
  restaurantMustEats: MapMustEat[]
  /** Total restaurant count in Sanity — shown in the sheet-count-mini so
   *  visitors see the catalog size, not the trial-cap-filtered count. */
  totalCount: number
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
  onResetBezirkPill: () => void
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
  onLocateMe: () => void
  onRestaurantClose: () => void
  onMustEatClose: () => void
  onMustEatBack: (() => void) | undefined
  onViewAllMustEats: () => void
  onSwitchToRestaurants: () => void
  onViewRestaurantFromMustEat: () => void
  onUnlock: () => Promise<void>
  onToggleFavorite: () => void
  onCollapseDetailToMid: () => void
  onToggleDesktopPanel: () => void
}

/* Host-locale-aware aria copy passed in from the server-rendered shell. */
interface MapBodyAria {
  myLocationAriaLabel: string
  restaurantsListAriaLabel: string
  mustEatsListAriaLabel: string
}

export type MapSectionBodyProps =
  & MapBodyRefs
  & MapBodyState
  & MapBodyFilterState
  & MapBodyHandlers
  & MapBodyAria

export default function MapSectionBody(props: MapSectionBodyProps) {
  const {
    isActive,
    mapRef, handleRef, setHeaderRef, setContentRef, setSheetRef,
    sheetView, snap, dragging, layer,
    displayedRestaurants, displayedLockedRestaurants, fannedMustEats, displayedMustEats, restaurantMustEats,
    totalCount,
    selectedRestaurant, selectedMustEat,
    primaryMustEats, unlockedIds, revealedMustEatIds, favoriteIds, location, uid, userTier,
    categories, category, setCategory, search, bezirk, bezirkNames,
    cuisine, setCuisine, cuisineNames,
    openOnly, setOpenOnly,
    searchOpen, setSearchOpen,
    onMapMove, onMapClick, onRestaurantClick, onMustEatClick, onLocateMe,
    onRestaurantClose, onMustEatClose, onMustEatBack,
    onViewAllMustEats,
    onSwitchToRestaurants,
    onViewRestaurantFromMustEat, onUnlock,
    onSearchChange, onBezirkChange, onResetBezirkPill, onToggleFavorite,
    onCollapseDetailToMid,
    desktopPanelHidden, onToggleDesktopPanel,
    myLocationAriaLabel, restaurantsListAriaLabel, mustEatsListAriaLabel,
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

        <div className={`${styles.body}${sheetView === 'detail' ? ` ${styles.bodyDetailOpen}` : ''}${sheetView === 'list' && snap === 'full' ? ` ${styles.bodyListAtFull}` : ''}${desktopPanelHidden ? ` ${styles.bodyPanelHidden}` : ''}`}>
          <div className={styles.mapWrap}>
            <MapCanvas ref={mapRef} onMove={onMapMove} onMapClick={onMapClick}>
              {layer === 'restaurants' && displayedRestaurants.map(r => (
                <RestaurantMarker
                  key={r._id}
                  restaurant={r}
                  isSelected={selectedRestaurant?._id === r._id}
                  onClick={onRestaurantClick}
                />
              ))}
              {layer === 'mustEats' && fannedMustEats.map(m => (
                <MustEatMarker
                  key={m._id}
                  mustEat={m}
                  isUnlocked={unlockedIds.has(m._id)}
                  isCoveredAnon={!uid && !revealedMustEatIds.has(m._id)}
                  isSelected={selectedMustEat?._id === m._id}
                  userLocation={location}
                  displayLat={m.displayLat}
                  displayLng={m.displayLng}
                  fanRotation={m.fanRotation}
                  fanIndex={m.fanIndex}
                  fanCount={m.fanCount}
                  onClick={onMustEatClick}
                />
              ))}
              {location && <UserLocationMarker location={location} />}
            </MapCanvas>

            {/* Floating search bar — Apple/Google-Maps-style toolbar over
                the map, always visible. Was previously a toggle inside
                the sheet header (per editorial v13 preview). */}
            <div className={styles.mapSearchToolbar}>
              <svg className={styles.mapSearchIcon} viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Suchen in Berlin"
                className={styles.mapSearchInput}
                aria-label="Search"
              />
              {search && (
                <button
                  type="button"
                  className={styles.mapSearchClear}
                  onClick={() => onSearchChange('')}
                  aria-label="Clear"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onLocateMe}
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

          {/* Floating burger — moved outside mapWrap so it lives in .body's
              stacking context and paints above the bottom-sheet (z-index 4).
              Inside mapWrap the burger's z-index:60 is contained by
              isolation:isolate and loses to aside.list at z-index:4 on mobile
              when the sheet is at full snap. */}
          <button
            type="button"
            className={styles.mapBurger}
            aria-label="Menü"
            onClick={() => { document.getElementById('burgerBtn')?.click() }}
          >
            <img src="/pics/icon-burger.webp?v=3" alt="" aria-hidden="true" draggable={false} />
          </button>

          <aside
            ref={setSheetRef}
            className={`${styles.list} ${dragging ? styles.listDragging : ''}${
              sheetView === 'list' && snap === 'peek' ? ` ${styles.listAtPeek}` : ''
            }`}
            data-snap={snap}
            data-view={sheetView}
            aria-label={layer === 'restaurants' ? restaurantsListAriaLabel : mustEatsListAriaLabel}
          >
            <div ref={handleRef} className={styles.handle} data-sheet-handle="" aria-hidden="true" />

            {/* Detail-only handle-bar icons — share / save / close. Sit on
                the swipe-handle strip so they stay fixed regardless of
                content scroll (they're rendered OUTSIDE detailMount which
                owns the inner overflow). */}
            {sheetView === 'detail' && selectedRestaurant && (
              <div className={styles.sheetHandleActions}>
                <button
                  type="button"
                  className={`${styles.heroAction} ${styles.heroActionOnHandle}`}
                  aria-label="Teilen"
                  onClick={async () => {
                    const url = typeof window !== 'undefined' ? window.location.href : ''
                    const shareData = { title: selectedRestaurant.name, url }
                    try {
                      if (typeof navigator !== 'undefined' && 'share' in navigator) {
                        await navigator.share(shareData)
                        return
                      }
                    } catch {}
                    try {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        await navigator.clipboard.writeText(url)
                      }
                    } catch {}
                  }}
                >
                  <ShareIcon />
                </button>
                <button
                  type="button"
                  className={`${styles.heroAction} ${styles.heroActionOnHandle} ${favoriteIds.has(selectedRestaurant._id) ? styles.heroActionSaved : ''}`}
                  aria-label={favoriteIds.has(selectedRestaurant._id) ? 'Remove from saved' : 'Speichern'}
                  aria-pressed={favoriteIds.has(selectedRestaurant._id)}
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
                >
                  <HeartIcon filled={favoriteIds.has(selectedRestaurant._id)} />
                </button>
                <button
                  type="button"
                  className={`${styles.heroAction} ${styles.heroActionOnHandle} ${styles.heroActionClose}`}
                  aria-label="Close"
                  onClick={onRestaurantClose}
                >
                  <CloseIcon />
                </button>
              </div>
            )}

            {/* Must-Eat-Detail handle-bar icons: Back (zum Restaurant) +
                Close. Auf Mobile sind die heroActionsDesktop-Icons im
                Coral-Hero unsichtbar (display:none), deshalb hier
                explizit auf der Handle-Bar gerendert. */}
            {sheetView === 'detail' && selectedMustEat && (
              <div className={styles.sheetHandleActions}>
                {onMustEatBack && (
                  <button
                    type="button"
                    className={`${styles.heroAction} ${styles.heroActionOnHandle}`}
                    aria-label="Zurück zum Restaurant"
                    onClick={onMustEatBack}
                  >
                    <BackIcon />
                  </button>
                )}
                <button
                  type="button"
                  className={`${styles.heroAction} ${styles.heroActionOnHandle} ${styles.heroActionClose}`}
                  aria-label="Close"
                  onClick={onMustEatClose}
                >
                  <CloseIcon />
                </button>
              </div>
            )}

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
                onBack={onMustEatBack}
                onViewAllMustEats={onViewAllMustEats}
                onViewRestaurant={onViewRestaurantFromMustEat}
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
                onClose={onRestaurantClose}
                onMustEatClick={onMustEatClick}
                isFavorite={favoriteIds.has(selectedRestaurant._id)}
                onToggleFavorite={onToggleFavorite}
              />
            ) : (
              <>
                <MapListHeader
                  headerRef={setHeaderRef}
                  resultCount={layer === 'restaurants' ? displayedRestaurants.length : displayedMustEats.length}
                  totalCount={totalCount}
                  searchOpen={searchOpen}
                  setSearchOpen={setSearchOpen}
                  search={search}
                  onSearchChange={onSearchChange}
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
                  layer={layer}
                  onSwitchToRestaurants={onSwitchToRestaurants}
                />
                {layer === 'restaurants' ? (
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
                    />
                  </div>
                ) : (
                  <MapMustEatsList
                    displayedMustEats={displayedMustEats}
                    unlockedIds={unlockedIds}
                    selectedMustEat={selectedMustEat}
                    location={location}
                    uid={uid}
                    userTier={userTier}
                    contentRef={setContentRef}
                    onSelect={onMustEatClick}
                  />
                )}
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
