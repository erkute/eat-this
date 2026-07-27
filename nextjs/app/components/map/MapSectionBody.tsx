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
import MapDataNotice from './MapDataNotice';
/* BezirkFilterPill removed — redundant now that the bezirk filter shows
   as a chip in the list header. The chip also has reset built in. */
import styles from './MapLayout.module.css';
import controlStyles from './MapControls.module.css';
import sheetStyles from './MapSheet.module.css';

/* The map canvas pulls in react-map-gl + maplibre-gl (~800 KB) and only runs
   in the browser. Lazy-load it (ssr: false) so the SSR'd list/sheet paints and
   hydrates immediately, with the heavy maplibre chunk streaming in behind a
   neutral placeholder. */
const MapCanvasLayer = dynamic(() => import('./MapCanvasLayer'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading} aria-hidden="true" />,
});

/* Refs (mutable + callback) wired up by `useMapSheet` / `useBottomSheet`. */
interface MapBodyRefs {
  mapRef: RefObject<MapRef | null>;
  handleRef: Ref<HTMLDivElement | null>;
  setHeaderRef: (el: HTMLDivElement | null) => void;
  setContentRef: (el: HTMLDivElement | null) => void;
  setSheetRef: (el: HTMLDivElement | null) => void;
}

/* What the body renders: pure UI flags (sheet view, snap, drag) plus the
   data lists / selections / user context that drive markers and the sheet. */
interface MapBodyState {
  isActive: boolean;
  fontClassName?: string;
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
  mapDataLoading: boolean;
  mapDataError: string | null;
  mapDataHasContent: boolean;
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
  onUnlock: () => Promise<boolean>;
  onToggleFavorite: () => void;
  onToggleDesktopPanel: () => void;
  onRetryMapData: () => void;
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
    fontClassName,
    mapRef,
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
    mapDataLoading,
    mapDataError,
    mapDataHasContent,
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
    onRetryMapData,
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
  const locationStatusKey = locationStatus.copy
    ? `${locationStatus.copy}:${locationStatus.isError ? 'error' : 'ok'}:${locateLoading ? 'loading' : 'idle'}`
    : null;
  const [dismissedLocationStatusKey, setDismissedLocationStatusKey] = useState<string | null>(null);
  const showLocationStatus = Boolean(
    sheetView !== 'detail' &&
      locationStatus.copy &&
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
     notch zone (top: env(safe-area-inset-top), see MapFilters.module.css).
     That zone deliberately stays uncapped so Safari can sample the scrolling
     rows behind its translucent status bar. Stuck is still detected via a
     0-height sentinel to move the floating map controls out of the way. */
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
    <main
      className={`app-page${isActive ? ' active' : ''}${fontClassName ? ` ${fontClassName}` : ''}`}
      data-page="map"
      data-map-view={sheetView}
      data-map-snap={snap}
      data-panel-hidden={desktopPanelHidden ? 'true' : undefined}
    >
      <h1 className={styles.srOnly}>{locale === 'en' ? 'Eat This map' : 'Eat This Karte'}</h1>
      <div
        className={styles.shell}
        data-map-shell=""
        data-map-view={sheetView}
      >
        {/* The body data attributes slide the floating search toolbar + burger
            chip off-screen at full/detail states (see MapControls.module.css). */}
        <div
          className={styles.body}
          data-map-body=""
          data-map-view={sheetView}
          data-map-snap={snap}
          data-detail-kind={
            sheetView === 'detail'
              ? selectedMustEat
                ? 'must-eat'
                : selectedRestaurant
                  ? 'restaurant'
                  : undefined
              : undefined
          }
          data-panel-hidden={desktopPanelHidden ? 'true' : undefined}
          data-header-stuck={headerStuck && sheetView === 'list' ? 'true' : undefined}
        >
          <div className={styles.mapWrap} data-map-canvas="">
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
              <div
                className={controlStyles.mapSearchToolbar}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <svg className={controlStyles.mapSearchIcon} viewBox="0 0 24 24" aria-hidden="true">
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
                  className={controlStyles.mapSearchInput}
                  aria-label={searchLabel}
                  autoComplete="off"
                  autoFocus
                />
                <button
                  type="button"
                  className={controlStyles.mapSearchClear}
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
                className={controlStyles.mapSearchBtn}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchOpen(true);
                }}
                aria-label={searchLabel}
              >
                <svg className={controlStyles.mapSearchIcon} viewBox="0 0 24 24" aria-hidden="true">
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
              className={controlStyles.fab}
            >
              <svg className={controlStyles.fabIcon} viewBox="0 0 24 24" aria-hidden="true">
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
            className={controlStyles.mapBurger}
            onClick={openBurgerMenu}
            aria-label="Menu"
          >
            <span className={controlStyles.mapBurgerLines} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>

          {/* Desktop disclosure sits before its controlled panel in the DOM so
              the next Tab enters newly revealed panel content. */}
          <button
            type="button"
            className={controlStyles.panelToggle}
            aria-label={
              locale === 'en'
                ? desktopPanelHidden
                  ? 'Show results panel'
                  : 'Hide results panel'
                : desktopPanelHidden
                  ? 'Ergebnisliste einblenden'
                  : 'Ergebnisliste ausblenden'
            }
            aria-controls="map-results-panel"
            aria-expanded={!desktopPanelHidden}
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

          <aside
            id="map-results-panel"
            ref={setSheetRef}
            className={sheetStyles.list}
            data-map-sheet=""
            data-snap={snap}
            data-view={sheetView}
            data-dragging={dragging ? 'true' : undefined}
            data-header-stuck={headerStuck && sheetView === 'list' ? 'true' : undefined}
            data-detail-kind={
              sheetView === 'detail'
                ? selectedMustEat
                  ? 'must-eat'
                  : selectedRestaurant
                    ? 'restaurant'
                    : undefined
                : undefined
            }
            aria-label={restaurantsListAriaLabel}
            aria-hidden={desktopPanelHidden || undefined}
            inert={desktopPanelHidden || undefined}
          >
            <div
              ref={handleRef}
              className={sheetStyles.handle}
              data-sheet-handle=""
              aria-hidden="true"
            />

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
                {/* Stuck-detection sentinel for the sticky header (phones). */}
                <div ref={stuckSentinelRef} className={sheetStyles.stuckSentinel} aria-hidden="true" />
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
                <div ref={setContentRef} className={sheetStyles.listScroll}>
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

          <MapDataNotice
            loading={mapDataLoading}
            error={mapDataError}
            hasData={mapDataHasContent}
            onRetry={onRetryMapData}
          />

          {!mapDataLoading && !mapDataError && showLocationStatus && (
            <div
              className={`${controlStyles.mapStatusLayer} ${locationStatus.isError ? controlStyles.mapStatusLayerError : ''}`}
              role={locationStatus.isError ? 'alert' : 'status'}
            >
              <span className={controlStyles.mapStatusText}>{locationStatus.copy}</span>
              {locationStatus.isError && locationStatus.canRetry && (
                <button
                  type="button"
                  className={controlStyles.mapStatusAction}
                  onClick={handleLocationRetry}
                  disabled={locateLoading}
                >
                  {locale === 'en' ? 'Retry' : 'Nochmal'}
                </button>
              )}
              <button
                type="button"
                className={controlStyles.mapStatusDismiss}
                onClick={handleDismissLocationStatus}
                aria-label={
                  locale === 'en' ? 'Dismiss location notice' : 'Standort-Hinweis ausblenden'
                }
              >
                ×
              </button>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
