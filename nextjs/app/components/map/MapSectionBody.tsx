'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import type { Ref, RefObject } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type { MapRestaurant, MapMustEat, MapCategory } from '@/lib/types';
import { localizedCategoryName, type CategoryDef } from '@/lib/categories';
import type { SheetView, SheetSnap, UserLocation, UserTier } from '@/lib/map';
import type { UserLocationError } from '@/lib/map/useUserLocation';
import {
  getLocatingCopy,
  getLocationStatus,
  LOCATING_MIN_VISIBLE_MS,
  LOCATING_SHOW_DELAY_MS,
  LOCATION_ERROR_VISIBLE_MS,
  type LocationStatus,
} from '@/lib/map/locationStatus';
import { useDeferredStatus } from '@/lib/map/useDeferredStatus';
import { safeAreaInsetTop } from '@/lib/map/safeArea';
import { openBurgerDrawer } from '../burgerDrawerState';
import { trackEvent } from '@/lib/analytics';

import dynamic from 'next/dynamic';
import RestaurantList from './RestaurantList';
import MapSheetDetail from './MapSheetDetail';
import LockedDetail from './LockedDetail';
import MapListHeader from './MapListHeader';
import MapDataNotice from './MapDataNotice';
import MapViewToggle from './MapViewToggle';
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
  /** Paywalled spots matching the active filter — drawn as muted dots. */
  displayedLockedRestaurants: MapRestaurant[];
  /** Unfiltered catalog size for the locked sheet's all-Berlin offer. */
  totalSpots: number;
  /** Every paywalled id, so the sheet knows which detail to render. */
  lockedIdSet: Set<string>;
  /** Uncapped locked-match count — see useMapFilters. */
  lockedMatchCount: number;
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
  /** Opens the search UI and reveals the result list — see MapSection. */
  onSearchOpen: () => void;
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
    totalSpots,
    lockedIdSet,
    lockedMatchCount,
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
    onSearchOpen,
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

  /* Every input that reorders or re-scopes the list, in one string. The map
     toggle forgets its remembered scroll position whenever this changes. */
  const listFilterKey = `${category}|${bezirk ?? ''}|${cuisine ?? ''}|${openOnly}|${search.trim()}`;

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
  /* A locked dot opens the sheet like any other spot. It used to navigate
     straight to the pack page, which threw away the map, the filter and the
     search for what is usually a "what is this?" tap. */
  const lockedMarkerLabel = locale === 'en' ? 'Locked spot' : 'Gesperrter Spot';
  const handleLockedClick = useCallback(
    (r: MapRestaurant) => {
      trackEvent('locked_spot_opened', { restaurant_id: r._id, restaurant_slug: r.slug });
      onRestaurantClick(r, 'map');
    },
    [onRestaurantClick]
  );
  /* What the "0 free hits" headline is a zero *of*. Search wins because a query
     overrides every other filter in useMapFilters; then the narrowest chip.
     "Open now" alone yields no label — the count still carries the message. */
  const emptyFilterLabel = useMemo(() => {
    const q = search.trim();
    if (q) return q;
    if (bezirk) return bezirk;
    if (cuisine) return cuisine;
    if (category !== 'All') {
      const def = categories.find((c) => c.slug === category);
      return def ? localizedCategoryName(def, locale === 'en' ? 'en' : 'de') : null;
    }
    return null;
  }, [search, bezirk, cuisine, category, categories, locale]);

  const rawLocationStatus = getLocationStatus({ locale, location, locationError, locateLoading });
  /* The only non-error copy is the "searching" one, so this is exactly the
     transient state that used to flash. Errors stay immediate — they are the
     messages the user actually needs to read. */
  const isLocating = Boolean(rawLocationStatus.copy) && !rawLocationStatus.isError;
  const locatingVisible =
    useDeferredStatus(isLocating, LOCATING_SHOW_DELAY_MS, LOCATING_MIN_VISIBLE_MS) &&
    !rawLocationStatus.isError;
  /* An error arriving mid-hold wins immediately (the && above), so the stale
     "searching" copy can't sit on top of it for a frame. */
  const locationStatus: LocationStatus = locatingVisible
    ? { copy: getLocatingCopy(locale), isError: false, canRetry: false }
    : isLocating
      ? { copy: null, isError: false, canRetry: false }
      : rawLocationStatus;
  const locationStatusKey = locationStatus.copy
    ? `${locationStatus.copy}:${locationStatus.isError ? 'error' : 'ok'}:${locatingVisible ? 'loading' : 'idle'}`
    : null;
  const [dismissedLocationStatusKey, setDismissedLocationStatusKey] = useState<string | null>(null);
  const showLocationStatus = Boolean(
    sheetView !== 'detail' &&
    locationStatus.copy &&
    locationStatusKey !== dismissedLocationStatusKey
  );
  /* Errors used to sit there until tapped away — and since the dismissal is
     component state, a denied permission put the bar back on every reload,
     permanently parked over the locate button. It is a notice, not a dialog:
     let it retire on its own. The "searching" copy is excluded — it clears
     itself the moment the request settles. */
  useEffect(() => {
    if (!showLocationStatus || !locationStatus.isError || !locationStatusKey) return;
    const id = window.setTimeout(
      () => setDismissedLocationStatusKey(locationStatusKey),
      LOCATION_ERROR_VISIBLE_MS
    );
    return () => window.clearTimeout(id);
  }, [showLocationStatus, locationStatus.isError, locationStatusKey]);
  const handleLocationRetry = useCallback(() => {
    setDismissedLocationStatusKey(null);
    onLocateMe();
  }, [onLocateMe]);
  const handleDismissLocationStatus = useCallback(() => {
    if (locationStatusKey) setDismissedLocationStatusKey(locationStatusKey);
  }, [locationStatusKey]);

  /* In-flow phone sheet: the sticky header rests below the iOS status-bar/
     notch zone (top: env(safe-area-inset-top), see MapFilters.module.css).
     That zone deliberately stays uncapped so Safari can sample the scrolling
     rows behind its translucent status bar. Stuck is still detected via a
     0-height sentinel to move the floating map controls out of the way.

     Runs in BOTH views. It used to be list-only, so search and burger left the
     screen at a different scroll position in the detail than in the list. */
  const stuckSentinelRef = useRef<HTMLDivElement | null>(null);
  const [headerStuck, setHeaderStuck] = useState(false);
  useEffect(() => {
    if (!window.matchMedia('(max-width: 767.98px)').matches) {
      setHeaderStuck(false);
      return;
    }
    const sentinel = stuckSentinelRef.current;
    if (!sentinel) return;
    /* px value of env(safe-area-inset-top) — IO rootMargin can't use env(). */
    const safeTop = safeAreaInsetTop();
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
      <div className={styles.shell} data-map-shell="" data-map-view={sheetView}>
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
          data-header-stuck={headerStuck ? 'true' : undefined}
        >
          <div className={styles.mapWrap} data-map-canvas="">
            <div className={styles.liveMapLayer} data-live-map-layer="">
              <MapCanvasLayer
                mapRef={mapRef}
                onMapClick={onMapClick}
                displayedRestaurants={displayedRestaurants}
                displayedLockedRestaurants={displayedLockedRestaurants}
                selectedRestaurant={selectedRestaurant}
                selectedIsLocked={!!selectedRestaurant && lockedIdSet.has(selectedRestaurant._id)}
                onRestaurantClick={handleMapRestaurantClick}
                onLockedClick={handleLockedClick}
                lockedLabel={lockedMarkerLabel}
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
                  placeholder={locale === 'en' ? 'Spot, area, dish' : 'Spot, Kiez, Gericht'}
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
                  aria-label={locale === 'en' ? 'Clear search' : 'Suche zurücksetzen'}
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
                  onSearchOpen();
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
            data-header-stuck={headerStuck ? 'true' : undefined}
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

            {/* Stuck-detection sentinel for the floating map controls (phones).
                Sits directly under the handle so it leaves the viewport the
                moment the sheet reaches the top — in BOTH views, so search and
                burger retreat at the same scroll position either way. */}
            <div ref={stuckSentinelRef} className={sheetStyles.stuckSentinel} aria-hidden="true" />

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
            ) : sheetView === 'detail' &&
              selectedRestaurant &&
              lockedIdSet.has(selectedRestaurant._id) ? (
              <LockedDetail
                restaurant={selectedRestaurant}
                totalSpots={totalSpots}
                contentRef={setContentRef}
                onClose={onRestaurantClose}
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
                <div ref={setContentRef} className={sheetStyles.listScroll}>
                  <RestaurantList
                    restaurants={displayedRestaurants}
                    userLocation={location}
                    selectedId={selectedRestaurant?._id ?? null}
                    uid={uid}
                    userTier={userTier}
                    onSelect={onRestaurantClick}
                    primaryMustEats={primaryMustEats}
                    unlockedIds={unlockedIds}
                    revealedMustEatIds={revealedMustEatIds}
                    onResetFilters={handleResetFilters}
                    lockedMatchCount={lockedMatchCount}
                    activeFilterLabel={emptyFilterLabel}
                  />
                </div>
              </>
            )}
          </aside>

          {/* Phone list only. Mounted unconditionally so the list position it
              remembers survives a trip into a detail and back — see the
              component. */}
          <MapViewToggle sheetView={sheetView} filterKey={listFilterKey} />

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
