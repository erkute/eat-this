'use client'
import type { Ref, RefObject } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import type { MapRestaurant, MapMustEat, MapLayer, MapCategory } from '@/lib/types'
import type {
  SortMode,
  SortDir,
  SheetView,
  SheetSnap,
  MustEatWithDisplay,
  UserLocation,
} from '@/lib/map'

import MapCanvas from './MapCanvas'
import RestaurantMarker from './RestaurantMarker'
import MustEatMarker from './MustEatMarker'
import RestaurantList from './RestaurantList'
import MapSheetDetail from './MapSheetDetail'
import UserLocationMarker from './UserLocationMarker'
import CategoryFilter from './CategoryFilter'
import BezirkFilterPill from './BezirkFilterPill'
import MapMustEatsList from './MapMustEatsList'
import MapListHeader from './MapListHeader'
import styles from './map.module.css'

export interface MapSectionBodyProps {
  isActive: boolean

  // Refs (mutable + callback) wired up by `useMapSheet`/`useBottomSheet`.
  mapRef: RefObject<MapRef | null>
  filterBtnRef: RefObject<HTMLButtonElement | null>
  handleRef: Ref<HTMLDivElement | null>
  setHeaderRef: (el: HTMLDivElement | null) => void
  setContentRef: (el: HTMLDivElement | null) => void
  setSheetRef: (el: HTMLDivElement | null) => void

  // View state
  sheetView: SheetView
  snap: SheetSnap
  dragging: boolean
  layer: MapLayer

  // Data
  displayedRestaurants: MapRestaurant[]
  fannedMustEats: MustEatWithDisplay<MapMustEat>[]
  displayedMustEats: MapMustEat[]
  restaurantMustEats: MapMustEat[]
  selectedRestaurant: MapRestaurant | null
  selectedMustEat: MapMustEat | null
  unlockedIds: Set<string>
  favoriteIds: Set<string>
  location: UserLocation | null
  uid: string | null

  // Filter state
  category: MapCategory
  setCategory: (c: MapCategory) => void
  search: string
  bezirk: string | null
  bezirkNames: string[]
  openOnly: boolean
  setOpenOnly: (v: boolean) => void
  sort: SortMode
  setSort: (s: SortMode) => void
  sortDir: SortDir
  onToggleSortDir: () => void
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  filterOpen: boolean
  setFilterOpen: (next: boolean | ((prev: boolean) => boolean)) => void

  // Map / sheet handlers
  onMapMove: (bounds: { north: number; south: number; east: number; west: number }) => void
  onMapClick: () => void
  onRestaurantClick: (r: MapRestaurant) => void
  onMustEatClick: (m: MapMustEat) => void
  onLocateMe: () => void
  onRestaurantClose: () => void
  onMustEatClose: () => void
  onMustEatBack: (() => void) | undefined
  onBackToRestaurants: () => void
  onViewRestaurantFromMustEat: () => void
  onShowMustEatList: () => void
  onUnlock: () => Promise<void>
  onSearchChange: (v: string) => void
  onBezirkChange: (name: string | null) => void
  onResetBezirkPill: () => void
  onToggleFavorite: () => void
  onCollapseDetailToMid: () => void
  desktopPanelHidden: boolean
  onToggleDesktopPanel: () => void

  // Aria copy (host-locale aware)
  myLocationAriaLabel: string
  restaurantsListAriaLabel: string
  mustEatsListAriaLabel: string
}

export default function MapSectionBody(props: MapSectionBodyProps) {
  const {
    isActive,
    mapRef, filterBtnRef, handleRef, setHeaderRef, setContentRef, setSheetRef,
    sheetView, snap, dragging, layer,
    displayedRestaurants, fannedMustEats, displayedMustEats, restaurantMustEats,
    selectedRestaurant, selectedMustEat,
    unlockedIds, favoriteIds, location, uid,
    category, setCategory, search, bezirk, bezirkNames,
    openOnly, setOpenOnly, sort, setSort, sortDir, onToggleSortDir,
    searchOpen, setSearchOpen, filterOpen, setFilterOpen,
    onMapMove, onMapClick, onRestaurantClick, onMustEatClick, onLocateMe,
    onRestaurantClose, onMustEatClose, onMustEatBack, onBackToRestaurants,
    onViewRestaurantFromMustEat, onShowMustEatList, onUnlock,
    onSearchChange, onBezirkChange, onResetBezirkPill, onToggleFavorite,
    onCollapseDetailToMid,
    desktopPanelHidden, onToggleDesktopPanel,
    myLocationAriaLabel, restaurantsListAriaLabel, mustEatsListAriaLabel,
  } = props

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

            {bezirk && (
              <BezirkFilterPill bezirkName={bezirk} onReset={onResetBezirkPill} />
            )}

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

            {sheetView === 'detail' && snap === 'full' && (
              <button
                type="button"
                className={styles.detailCollapseBtn}
                aria-label="Show map"
                onClick={onCollapseDetailToMid}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            )}

            {sheetView === 'detail' && selectedMustEat ? (
              <MapSheetDetail
                kind="mustEat"
                contentRef={setContentRef}
                uid={uid}
                userLocation={location}
                unlockedIds={unlockedIds}
                mustEat={selectedMustEat}
                onUnlock={onUnlock}
                onClose={onMustEatClose}
                onBack={onMustEatBack}
                onViewRestaurant={onViewRestaurantFromMustEat}
                onShowMustEatList={onShowMustEatList}
              />
            ) : sheetView === 'detail' && selectedRestaurant ? (
              <MapSheetDetail
                kind="restaurant"
                contentRef={setContentRef}
                uid={uid}
                userLocation={location}
                unlockedIds={unlockedIds}
                restaurant={selectedRestaurant}
                mustEats={restaurantMustEats}
                onClose={onRestaurantClose}
                onMustEatClick={onMustEatClick}
                isFavorite={favoriteIds.has(selectedRestaurant._id)}
                onToggleFavorite={onToggleFavorite}
              />
            ) : layer === 'restaurants' ? (
              <>
                <MapListHeader
                  headerRef={setHeaderRef}
                  filterBtnRef={filterBtnRef}
                  resultCount={displayedRestaurants.length}
                  searchOpen={searchOpen}
                  setSearchOpen={setSearchOpen}
                  search={search}
                  onSearchChange={onSearchChange}
                  filterOpen={filterOpen}
                  setFilterOpen={setFilterOpen}
                  sort={sort}
                  onSort={setSort}
                  sortDir={sortDir}
                  onToggleSortDir={onToggleSortDir}
                  openOnly={openOnly}
                  onOpenOnly={setOpenOnly}
                  bezirkNames={bezirkNames}
                  bezirk={bezirk}
                  onBezirk={onBezirkChange}
                />
                {/* Zone C — category chips: NO drag handler, pure native horizontal scroll */}
                <div className={styles.listHeaderTabs}>
                  <CategoryFilter active={category} onChange={setCategory} variant="tabs" />
                </div>
                <div ref={setContentRef} className={styles.listScroll}>
                  <RestaurantList
                    restaurants={displayedRestaurants}
                    userLocation={location}
                    selectedId={selectedRestaurant?._id ?? null}
                    onSelect={onRestaurantClick}
                  />
                </div>
              </>
            ) : (
              <MapMustEatsList
                displayedMustEats={displayedMustEats}
                unlockedIds={unlockedIds}
                selectedMustEat={selectedMustEat}
                location={location}
                uid={uid}
                contentRef={setContentRef}
                onSelect={onMustEatClick}
                onBackToRestaurants={onBackToRestaurants}
              />
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
