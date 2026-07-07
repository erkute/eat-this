'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import type { Ref, RefObject } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type { MapRestaurant, MapMustEat, MapCategory } from '@/lib/types';
import type { CategoryDef } from '@/lib/categories';
import type { SheetView, SheetSnap, UserLocation, UserTier } from '@/lib/map';
import type { UserLocationError } from '@/lib/map/useUserLocation';
import { getLocationStatus } from '@/lib/map/locationStatus';
import { openBurgerDrawer } from '../burgerDrawerState';

import dynamic from 'next/dynamic';
import RestaurantList from './RestaurantList';
import MapSheetDetail from './MapSheetDetail';
import MapListHeader from './MapListHeader';
/* BezirkFilterPill removed — redundant now that the bezirk filter shows
   as a chip in the list header. The chip also has reset built in. */
import styles from './map.module.css';

/* The map canvas pulls in react-map-gl + maplibre-gl (~800 KB) and only runs
   in the browser. Lazy-load it (ssr: false) so the SSR'd list/sheet paints and
   hydrates immediately, with the heavy maplibre chunk streaming in behind a
   neutral placeholder. */
const MapCanvasLayer = dynamic(() => import('./MapCanvasLayer'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading} aria-hidden="true" />,
});

const STATIC_PEEK_ZOOM = 15;
const TILE_SIZE = 256;

function projectTilePoint(lng: number, lat: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const sinLat = Math.sin((Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function StaticDetailMapPeek({
  restaurant,
  restaurants,
  onRestaurantClick,
}: {
  restaurant: MapRestaurant | null;
  restaurants: MapRestaurant[];
  onRestaurantClick: (restaurant: MapRestaurant) => void;
}) {
  if (!restaurant || typeof restaurant.lat !== 'number' || typeof restaurant.lng !== 'number') {
    return null;
  }
  const point = projectTilePoint(restaurant.lng, restaurant.lat, STATIC_PEEK_ZOOM);
  const tileCount = 2 ** STATIC_PEEK_ZOOM;
  const centerX = Math.floor(point.x / TILE_SIZE);
  const centerY = Math.floor(point.y / TILE_SIZE);
  const offsetX = point.x - centerX * TILE_SIZE;
  const offsetY = point.y - centerY * TILE_SIZE;
  const tiles = [-1, 0, 1].flatMap((dy) =>
    [-1, 0, 1].map((dx) => {
      const x = (centerX + dx + tileCount) % tileCount;
      const y = Math.max(0, Math.min(tileCount - 1, centerY + dy));
      const subdomain = ['a', 'b', 'c'][Math.abs(x + y) % 3];
      return {
        key: `${x}-${y}`,
        src: `https://${subdomain}.basemaps.cartocdn.com/light_all/${STATIC_PEEK_ZOOM}/${x}/${y}.png`,
        left: `calc(50% + ${Math.round(dx * TILE_SIZE - offsetX)}px)`,
        top: `calc(var(--detail-map-peek, 150px) * 0.6 + ${Math.round(dy * TILE_SIZE - offsetY)}px)`,
      };
    })
  );
  const markerRestaurants = restaurants.some((r) => r._id === restaurant._id)
    ? restaurants
    : [...restaurants, restaurant];
  const markers = markerRestaurants
    .map((r) => {
      const markerPoint = projectTilePoint(r.lng, r.lat, STATIC_PEEK_ZOOM);
      const x = markerPoint.x - point.x;
      const y = markerPoint.y - point.y;
      return {
        id: r._id,
        restaurant: r,
        isSelected: r._id === restaurant._id,
        hasMustEat: r.mustEatCount > 0,
        x,
        y,
        left: `calc(50% + ${Math.round(x)}px)`,
        top: `calc(var(--detail-map-peek, 150px) * 0.6 + ${Math.round(y)}px)`,
      };
    })
    .filter((marker) => marker.isSelected || (Math.abs(marker.x) < 360 && Math.abs(marker.y) < 240));

  return (
    <div className={styles.staticDetailMapPeek} aria-hidden="true">
      {tiles.map((tile) => (
        <img
          key={tile.key}
          src={tile.src}
          alt=""
          className={styles.staticDetailMapTile}
          style={{ left: tile.left, top: tile.top }}
          draggable={false}
        />
      ))}
      {markers.map((marker) => (
        <button
          key={marker.id}
          type="button"
          className={[
            styles.staticDetailPin,
            marker.isSelected && styles.staticDetailPinActive,
            marker.hasMustEat && styles.staticDetailPinHasMust,
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ left: marker.left, top: marker.top }}
          onClick={() => {
            if (!marker.isSelected) onRestaurantClick(marker.restaurant);
          }}
          aria-label={marker.restaurant.name}
          aria-current={marker.isSelected ? 'true' : undefined}
        >
          <span className={styles.pinLogoShape}>
            <img src="/pics/eat-this-square.webp?v=5" alt="" draggable={false} />
          </span>
        </button>
      ))}
      <div className={styles.staticDetailAttribution}>© CARTO © OpenStreetMap</div>
    </div>
  );
}

/* Refs (mutable + callback) wired up by `useMapSheet` / `useBottomSheet`. */
interface MapBodyRefs {
  mapRef: RefObject<MapRef | null>;
  /* The sticky map wrapper. MapSection hides its live GL child while the
     phone detail is open (iOS URL-bar frosting, see MapSection.tsx), leaving
     the static raster peek visible. */
  mapWrapRef: RefObject<HTMLDivElement | null>;
  handleRef: Ref<HTMLDivElement | null>;
  setHeaderRef: (el: HTMLDivElement | null) => void;
  setContentRef: (el: HTMLDivElement | null) => void;
  setSheetRef: (el: HTMLDivElement | null) => void;
}

/* What the body renders: pure UI flags (sheet view, snap, drag) plus the
   data lists / selections / user context that drive markers and the sheet. */
interface MapBodyState {
  isActive: boolean;
  sheetView: SheetView;
  snap: SheetSnap;
  dragging: boolean;
  desktopPanelHidden: boolean;
  displayedRestaurants: MapRestaurant[];
  /** Locked preview rows — same filter pipeline as displayedRestaurants,
   *  rendered as blurred entries below the booster banner in the list. */
  displayedLockedRestaurants: MapRestaurant[];
  restaurantMustEats: MapMustEat[];
  selectedRestaurant: MapRestaurant | null;
  selectedMustEat: MapMustEat | null;
  primaryMustEats: Map<string, MapMustEat>;
  unlockedIds: Set<string>;
  /** Must-eat IDs pre-revealed for anon visitors. Empty for signed-in users. */
  revealedMustEatIds: Set<string>;
  favoriteIds: Set<string>;
  location: UserLocation | null;
  locationError: UserLocationError | null;
  uid: string | null;
  userTier: UserTier;
}

/* Filter values + their setters / change handlers. Bundled together because
   each value travels with its setter in the same render. */
interface MapBodyFilterState {
  categories: CategoryDef[];
  category: MapCategory;
  setCategory: (c: MapCategory) => void;
  search: string;
  onSearchChange: (v: string) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  bezirk: string | null;
  bezirkNames: string[];
  onBezirkChange: (name: string | null) => void;
  cuisine: string | null;
  setCuisine: (c: string | null) => void;
  cuisineNames: string[];
  openOnly: boolean;
  setOpenOnly: (v: boolean) => void;
}

/* Map / sheet event handlers (everything not filter-related). */
interface MapBodyHandlers {
  onMapClick: () => void;
  onRestaurantClick: (r: MapRestaurant, origin?: 'list' | 'map') => void;
  onMustEatClick: (m: MapMustEat) => void;
  pagerPrev: MapRestaurant | null;
  pagerNext: MapRestaurant | null;
  onPageRestaurant: (dir: 'prev' | 'next') => void;
  onLocateMe: () => void;
  locateLoading: boolean;
  onRestaurantClose: () => void;
  onMustEatClose: () => void;
  mustEatPagerPrev: MapMustEat | null;
  mustEatPagerNext: MapMustEat | null;
  onPageMustEat: (dir: 'prev' | 'next') => void;
  onViewRestaurantFromMustEat: () => void;
  onUnlock: () => Promise<void>;
  onToggleFavorite: () => void;
  onToggleDesktopPanel: () => void;
}

/* Host-locale-aware aria copy passed in from the server-rendered shell. */
interface MapBodyAria {
  myLocationAriaLabel: string;
  restaurantsListAriaLabel: string;
}

export type MapSectionBodyProps = MapBodyRefs &
  MapBodyState &
  MapBodyFilterState &
  MapBodyHandlers &
  MapBodyAria;

export default function MapSectionBody(props: MapSectionBodyProps) {
  const locale = useLocale();
  const searchLabel = locale === 'en' ? 'Search' : 'Suche';
  const {
    isActive,
    mapRef,
    mapWrapRef,
    handleRef,
    setHeaderRef,
    setContentRef,
    setSheetRef,
    sheetView,
    snap,
    dragging,
    displayedRestaurants,
    displayedLockedRestaurants,
    restaurantMustEats,
    pagerPrev,
    pagerNext,
    onPageRestaurant,
    selectedRestaurant,
    selectedMustEat,
    primaryMustEats,
    unlockedIds,
    revealedMustEatIds,
    favoriteIds,
    location,
    locationError,
    uid,
    userTier,
    categories,
    category,
    setCategory,
    search,
    bezirk,
    bezirkNames,
    cuisine,
    setCuisine,
    cuisineNames,
    openOnly,
    setOpenOnly,
    searchOpen,
    setSearchOpen,
    onMapClick,
    onRestaurantClick,
    onMustEatClick,
    onLocateMe,
    locateLoading,
    onRestaurantClose,
    onMustEatClose,
    mustEatPagerPrev,
    mustEatPagerNext,
    onPageMustEat,
    onViewRestaurantFromMustEat,
    onUnlock,
    onSearchChange,
    onBezirkChange,
    onToggleFavorite,
    desktopPanelHidden,
    onToggleDesktopPanel,
    myLocationAriaLabel,
    restaurantsListAriaLabel,
  } = props;

  const handleResetFilters = () => {
    setCategory('All');
    onBezirkChange(null);
    setCuisine(null);
    setOpenOnly(false);
    onSearchChange('');
  };
  const handleMapRestaurantClick = useCallback(
    (r: MapRestaurant) => onRestaurantClick(r, 'map'),
    [onRestaurantClick]
  );
  const openBurgerMenu = useCallback(() => {
    openBurgerDrawer();
  }, []);
  const locationStatus = getLocationStatus({ locale, location, locationError, locateLoading });
  const visibleLocationStatus =
    locateLoading && !locationError
      ? { copy: null, isError: false, canRetry: false }
      : locateLoading && locationError
        ? getLocationStatus({ locale, location, locationError, locateLoading: false })
        : locationStatus;
  const locationStatusKey = visibleLocationStatus.copy
    ? `${visibleLocationStatus.copy}:${visibleLocationStatus.isError ? 'error' : 'ok'}`
    : null;
  const [dismissedLocationStatusKey, setDismissedLocationStatusKey] = useState<string | null>(null);
  const showLocationStatus = Boolean(
    sheetView !== 'detail' &&
      visibleLocationStatus.copy &&
      locationStatusKey !== dismissedLocationStatusKey
  );
  const handleLocationRetry = useCallback(() => {
    setDismissedLocationStatusKey(null);
    onLocateMe();
  }, [onLocateMe]);
  const handleDismissLocationStatus = useCallback(() => {
    if (locationStatusKey) setDismissedLocationStatusKey(locationStatusKey);
  }, [locationStatusKey]);

  /* In-flow phone list: the sticky header rests below the iOS status-bar/
     notch zone (top: env(safe-area-inset-top), see map.module.css). While it
     is STUCK, a fixed white cap (.listHeaderStuck .listHeader::before) covers
     that zone so rows don't scroll visibly through the notch area. Stuck is
     detected via a 0-height sentinel right above the header: once it leaves
     the (viewport top + safe-area) line, the header is pinned. */
  const stuckSentinelRef = useRef<HTMLDivElement | null>(null);
  const [headerStuck, setHeaderStuck] = useState(false);
  useEffect(() => {
    if (sheetView !== 'list') {
      setHeaderStuck(false);
      return;
    }
    if (!window.matchMedia('(max-width: 767.98px)').matches) return;
    const sentinel = stuckSentinelRef.current;
    if (!sentinel) return;
    /* px value of env(safe-area-inset-top) — IO rootMargin can't use env(). */
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top,0px);';
    document.body.appendChild(probe);
    const safeTop = parseFloat(getComputedStyle(probe).paddingTop) || 0;
    document.body.removeChild(probe);
    const io = new IntersectionObserver(([entry]) => setHeaderStuck(!entry.isIntersecting), {
      rootMargin: `-${Math.ceil(safeTop) + 1}px 0px 0px 0px`,
    });
    io.observe(sentinel);
    return () => io.disconnect();
  }, [sheetView]);

  return (
    <div className={`app-page${isActive ? ' active' : ''}`} data-page="map">
      <div
        className={`${styles.shell}${sheetView === 'detail' ? ` ${styles.shellDetailOpen}` : ''}`}
      >
        {/* bodyListAtFull / bodyDetailOpen slide the floating search toolbar +
            burger chip up off-screen (see map.module.css) — Google-Maps
            behavior. */}
        <div
          className={`${styles.body}${sheetView === 'detail' ? ` ${styles.bodyDetailOpen}` : ''}${sheetView === 'list' && snap === 'full' ? ` ${styles.bodyListAtFull}` : ''}${desktopPanelHidden ? ` ${styles.bodyPanelHidden}` : ''}`}
        >
          <div className={styles.mapWrap} ref={mapWrapRef}>
            <div className={styles.liveMapLayer} data-live-map-layer="">
              <MapCanvasLayer
                mapRef={mapRef}
                onMapClick={onMapClick}
                displayedRestaurants={displayedRestaurants}
                selectedRestaurant={selectedRestaurant}
                onRestaurantClick={handleMapRestaurantClick}
                location={location}
              />
            </div>

            {/* Floating search — collapsed to a square icon button by
                default (2026-06-04: the always-on toolbar read too loud over
                the tiles). Tapping expands the full input; it stays open
                while a query is active so the filter is never invisible. */}
            {searchOpen || search ? (
              <div className={styles.mapSearchToolbar}>
                <svg className={styles.mapSearchIcon} viewBox="0 0 24 24" aria-hidden="true">
                  <circle
                    cx="10.8"
                    cy="10.8"
                    r="5.9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.1"
                  />
                  <path
                    d="M15.2 15.2 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  type="search"
                  name="map-search"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onBlur={() => {
                    if (!search) setSearchOpen(false);
                  }}
                  placeholder="Spot, Kiez, Gericht"
                  className={styles.mapSearchInput}
                  aria-label={searchLabel}
                  autoComplete="off"
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.mapSearchClear}
                  onClick={() => {
                    onSearchChange('');
                    setSearchOpen(false);
                  }}
                  aria-label="Clear"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
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
                aria-label={searchLabel}
              >
                <svg className={styles.mapSearchIcon} viewBox="0 0 24 24" aria-hidden="true">
                  <circle
                    cx="10.8"
                    cy="10.8"
                    r="5.9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.1"
                  />
                  <path
                    d="M15.2 15.2 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
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
                <circle cx="12" cy="12" r="6.8" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
                <path
                  d="M12 3.8v2.2M12 18v2.2M3.8 12h2.2M18 12h2.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Desktop floating modals removed — both mobile and desktop now
                render the detail in the side panel / bottom sheet so the
                selected marker stays visible on the map. */}
          </div>

          <button
            type="button"
            className={styles.mapBurger}
            onClick={openBurgerMenu}
            aria-label="Menu"
          >
            <span className={styles.mapBurgerLines} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>

          <aside
            ref={setSheetRef}
            className={`${styles.list} ${dragging ? styles.listDragging : ''}${headerStuck && sheetView === 'list' ? ` ${styles.listHeaderStuck}` : ''}`}
            data-snap={snap}
            data-view={sheetView}
            aria-label={restaurantsListAriaLabel}
          >
            <div
              ref={handleRef}
              className={styles.handle}
              data-sheet-handle=""
              aria-hidden="true"
            />

            {/* Restaurant detail's chrome now lives on the photo hero (back
                pill + save bookmark, per the Chewy mockup) — no handle-bar
                icons here. */}

            {/* Must-Eat detail has no handle-bar X/back chrome — the sheet is
                dismissed by dragging it down; "Zum Spot" + the pager are the
                in-sheet actions. */}

            {sheetView === 'detail' && selectedRestaurant ? (
              <StaticDetailMapPeek
                restaurant={selectedRestaurant}
                restaurants={displayedRestaurants}
                onRestaurantClick={handleMapRestaurantClick}
              />
            ) : null}

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
                {/* Stuck-detection sentinel for the sticky header (phones). */}
                <div ref={stuckSentinelRef} className={styles.stuckSentinel} aria-hidden="true" />
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

          {showLocationStatus && (
            <div
              className={`${styles.mapStatusLayer} ${visibleLocationStatus.isError ? styles.mapStatusLayerError : ''} ${location ? styles.mapStatusLayerOk : ''}`}
              role={visibleLocationStatus.isError ? 'alert' : 'status'}
            >
              <span className={styles.mapStatusText}>{visibleLocationStatus.copy}</span>
              {visibleLocationStatus.isError && visibleLocationStatus.canRetry && (
                <button
                  type="button"
                  className={styles.mapStatusAction}
                  onClick={handleLocationRetry}
                  disabled={locateLoading}
                >
                  {locale === 'en' ? 'Retry' : 'Nochmal'}
                </button>
              )}
              <button
                type="button"
                className={styles.mapStatusDismiss}
                onClick={handleDismissLocationStatus}
                aria-label={
                  locale === 'en' ? 'Dismiss location notice' : 'Standort-Hinweis ausblenden'
                }
              >
                ×
              </button>
            </div>
          )}

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
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points={desktopPanelHidden ? '15 6 9 12 15 18' : '9 6 15 12 9 18'} />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
