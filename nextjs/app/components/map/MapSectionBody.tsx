'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import type { Ref, RefObject } from 'react';
import type { MapRef, ViewStateChangeEvent } from 'react-map-gl/maplibre';
import type { MapRestaurant, MapMustEat, MapCategory } from '@/lib/types';
import type { CategoryDef } from '@/lib/categories';
import type { SheetView, SheetSnap, UserLocation, UserTier, MapOptionCounts } from '@/lib/map';
import type { DetailOrigin } from '@/lib/map/phoneSheetSnaps';
import type { InitialMustEatsData } from '@/lib/map/initial-surface-data';
import type { UserLocationError } from '@/lib/map/useUserLocation';
import {
  getLocatingCopy,
  getLocationStatus,
  LOCATING_MIN_VISIBLE_MS,
  LOCATING_SHOW_DELAY_MS,
  LOCATION_ERROR_VISIBLE_MS,
  type LocationStatus,
} from '@/lib/map/locationStatus';
import { useLocationInvite } from '@/lib/map/useLocationInvite';
import { useLocationWelcome } from '@/lib/map/useLocationWelcome';
import { useExplorationSettled } from '@/lib/map/useExplorationSettled';
import { notify, type NoticeKind } from '@/lib/notice';
import { locationBlockedOptions } from '@/lib/map/locationHelp';
import { useDeferredStatus } from '@/lib/map/useDeferredStatus';
import { openBurgerDrawer } from '../burgerDrawerState';
import { trackEvent, trackEventOnce } from '@/lib/analytics';

import MapCanvasLayer from './LazyMapCanvasLayer';
import RestaurantList from './RestaurantList';
import { INITIAL_LIST_ROWS, LIST_ROWS_PER_BATCH } from '@/lib/map/listWindow';
import MapSheetDetail from './MapSheetDetail';
import MapListHeader from './MapListHeader';
import MapIntro from './MapIntro';
import { CloseIcon, SearchGlassIcon } from './icons';
import MapDataNotice from './MapDataNotice';
import MapSearchSuggestions from './MapSearchSuggestions';
import type { InitialCamera } from '@/lib/map/useMapCamera';
/* BezirkFilterPill removed — redundant now that the bezirk filter shows
   as a chip in the list header. The chip also has reset built in. */
import styles from './MapLayout.module.css';
import controlStyles from './MapControls.module.css';
import sheetStyles from './MapSheet.module.css';

/* Refs (mutable + callback) wired up by `useMapSheet` / `useBottomSheet`. */

/* How long iOS takes to bring the keyboard up or put it away — the window in
   which a scroll without a finger on the screen is the keyboard's, not the
   user's. */
const KEYBOARD_SETTLE_MS = 700;

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
  /** Die Kamera, auf der die Karte aufgeht (useMapCamera.initialCamera). */
  getInitialCamera: () => InitialCamera | null;
  /** Was die Liste zeigt: dieselben Treffer, nach Nähe statt nach Karte. */
  listRestaurants: MapRestaurant[];
  restaurantMustEats: MapMustEat[];
  selectedRestaurant: MapRestaurant | null;
  /** Row the list points at once no detail is open — the spot that was just
   *  closed. Keeps that row rendered past the windowed budget and marks it, so
   *  closing a spot lands you next to it instead of somewhere in the list. */
  listFocusId: string | null;
  /** Where the open detail came from — its close button says where it goes. */
  detailOrigin: DetailOrigin;
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
  /** The query the list is filtered by — set on submit, not per key. */
  search: string;
  onSearchChange: (v: string) => void;
  /** Spots to suggest for what is typed (useMapFilters). */
  suggestSpots: (query: string) => MapRestaurant[];
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  /** Opens the search UI and reveals the result list — see MapSection. */
  onSearchOpen: () => void;
  bezirk: string | null;
  bezirkNames: string[];
  onBezirkChange: (name: string | null) => void;
  price: string | null;
  setPrice: (id: string | null) => void;
  priceBucketIds: string[];
  optionCounts: MapOptionCounts;
  openOnly: boolean;
  setOpenOnly: (v: boolean) => void;
}

/* Map / sheet event handlers (everything not filter-related). */
interface MapBodyHandlers {
  onMapClick: () => void;
  onMapMoveEnd: (e: ViewStateChangeEvent) => void;
  /* Meldet zurueck, OB der Spot aufgegangen ist. Bei offener Sheet raeumt der
     erste Tipp auf die Karte nur weg und waehlt nichts aus (siehe
     mapTapOnlyDismisses in MapSection) — der gesperrte Pin darf dann auch
     keinen Oeffnungs-Treffer melden. */
  onRestaurantClick: (r: MapRestaurant, origin?: 'list' | 'map') => boolean | void;
  onMustEatClick: (m: MapMustEat) => void;
  onLocateMe: () => void;
  locateLoading: boolean;
  onRestaurantClose: () => void;
  onMustEatClose: () => void;
  mustEatPagerPrev: MapMustEat | null;
  mustEatPagerNext: MapMustEat | null;
  mustEatPagerPosition?: { index: number; count: number };
  mustEatCollection?: { count: number; total: number };
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

type MapSectionBodyProps = MapBodyRefs &
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
    listFocusId,
    detailOrigin,
    snap,
    dragging,
    displayedRestaurants,
    getInitialCamera,
    listRestaurants,
    restaurantMustEats,
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
    price,
    setPrice,
    priceBucketIds,
    optionCounts,
    openOnly,
    setOpenOnly,
    searchOpen,
    setSearchOpen,
    onSearchOpen,
    onMapClick,
    onMapMoveEnd,
    onRestaurantClick,
    onMustEatClick,
    onLocateMe,
    locateLoading,
    onRestaurantClose,
    onMustEatClose,
    mustEatPagerPrev,
    mustEatPagerNext,
    mustEatPagerPosition,
    mustEatCollection,
    onPageMustEat,
    onViewRestaurantFromMustEat,
    onUnlock,
    onSearchChange,
    suggestSpots,
    onBezirkChange,
    onToggleFavorite,
    desktopPanelHidden,
    onToggleDesktopPanel,
    onRetryMapData,
    myLocationAriaLabel,
    restaurantsListAriaLabel,
  } = props;

  /* Die Must-Eats-Erklärung im Detail gibt es nur für Gäste; ihre Demo-Karte
     ist eine der offenen aus dem Stapel (MustEatsOnboarding). */
  const onboardingData = useMemo<InitialMustEatsData | undefined>(
    () =>
      uid
        ? undefined
        : {
            mustEats: [...primaryMustEats.values()],
            revealedMustEatIds: [...revealedMustEatIds],
          },
    [uid, primaryMustEats, revealedMustEatIds]
  );

  /* Every input that reorders or re-scopes the list, in one string. */
  const listFilterKey = `${category}|${bezirk ?? ''}|${price ?? ''}|${openOnly}|${search.trim()}`;

  /* Wie viele Listenzeilen gerendert werden. Der Stand liegt hier und nicht in
     RestaurantList, weil ein Sprung ins Detail die Liste aushängt: beim
     Zurück wird die alte Scroll-Position wiederhergestellt, und
     eine in der Liste gehaltene Zahl wäre dann wieder bei INITIAL_LIST_ROWS —
     die Seite wäre kürzer als die Position, auf die zurückgesprungen wird.
     Ein neuer Filter ist dagegen eine neue Liste und fängt oben an. */
  const [listRows, setListRows] = useState(INITIAL_LIST_ROWS);
  /* Keyed on the FILTER, not on the list array: that array is also rebuilt
     when a position fix re-sorts it or the catalogue refetches after sign-in —
     both happen with a detail open. Falling back to 12 rows then made the
     list shorter than the position it was about to return to, and the row the
     user came from ended up clamped to the bottom of the screen. */
  useEffect(() => {
    setListRows(INITIAL_LIST_ROWS);
  }, [listFilterKey]);
  const showMoreRows = useCallback(() => setListRows((n) => n + LIST_ROWS_PER_BATCH), []);

  const handleResetFilters = () => {
    setCategory('All');
    onBezirkChange(null);
    setPrice(null);
    setOpenOnly(false);
  };
  const handleClearSearch = () => {
    onSearchChange('');
    setSearchOpen(false);
  };
  const handleMapRestaurantClick = useCallback(
    (r: MapRestaurant) => onRestaurantClick(r, 'map'),
    [onRestaurantClick]
  );
  const openBurgerMenu = useCallback(() => {
    openBurgerDrawer();
  }, []);
  /* Esc schließt das Spot-Detail wie sein Zurück-Knopf. Offene Ebenen darüber
     (Galerie, Zoom, Menü, Login) haben eigene Esc-Handler und gehen vor. */
  const restaurantDetailOpen = sheetView === 'detail' && !selectedMustEat && !!selectedRestaurant;
  useEffect(() => {
    if (!restaurantDetailOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      /* Das Menü liegt verborgen immer im DOM — nur sichtbare Ebenen zählen. */
      const layerOpen = [...document.querySelectorAll('[aria-modal="true"]')].some(
        (el) => el.getClientRects().length > 0
      );
      if (layerOpen) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      onRestaurantClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [restaurantDetailOpen, onRestaurantClose]);
  const rawLocationStatus = getLocationStatus({
    locale,
    location,
    locationError,
    locateLoading,
    whileLocated: true,
  });
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

  /* A first visit with the location question still open: the map asks once,
     through the info card (useLocationWelcome), never over a detail. That is
     also the funnel step — a visitor who already answered has nothing to
     decide, and counting them would pad the denominator; neither would one
     who never touched the map and so was never asked. */
  const invited = useLocationInvite(location !== null);
  /* Not straight after the cookie answer: only once the visitor has moved the
     map or the list and let go (useExplorationSettled). Before that the map
     had not even been looked at, and the question came as a second dialog. */
  const explored = useExplorationSettled();
  const isRealInvite =
    invited && explored && isActive && !locationError && !locateLoading && sheetView !== 'detail';
  const locationStatusKey = locationStatus.copy
    ? `${locationStatus.copy}:${locationStatus.isError ? 'error' : 'ok'}:${locatingVisible ? 'loading' : 'idle'}`
    : null;
  const [dismissedLocationStatusKey, setDismissedLocationStatusKey] = useState<string | null>(null);
  const showLocationStatus = Boolean(
    sheetView !== 'detail' &&
    locationStatus.copy &&
    locationStatusKey !== dismissedLocationStatusKey
  );
  /* The denominator for map_location_invite_accepted. Consent-free: trackEvent
     counts the NAME through /api/count for everyone and only the params need a
     consent grant, so "labelled vs. pressed" stays readable even though most
     visitors never accept cookies. Once per session — a re-render would
     inflate it past any use. */
  useEffect(() => {
    if (!isRealInvite) return;
    trackEventOnce('map_location_invite', 'map_location_invite_shown');
  }, [isRealInvite]);

  /* Errors used to sit there until tapped away — and since the dismissal is
     component state, a denied permission put the bar back on every reload,
     permanently parked over the locate button. It is a notice, not a dialog:
     let it retire on its own. The "searching" copy is excluded — it clears
     itself the moment the request settles. */
  useEffect(() => {
    /* Blockiert bleibt stehen: die Meldung traegt „So geht's", und wer die
       Schritte sucht, braucht laenger als eine Frist (locationHelp). */
    if (!showLocationStatus || !locationStatus.isError || !locationStatusKey) return;
    if (locationError === 'denied') return;
    const id = window.setTimeout(
      () => setDismissedLocationStatusKey(locationStatusKey),
      LOCATION_ERROR_VISIBLE_MS
    );
    return () => window.clearTimeout(id);
  }, [showLocationStatus, locationStatus.isError, locationStatusKey, locationError]);
  const handleLocationRetry = useCallback(() => {
    setDismissedLocationStatusKey(null);
    onLocateMe();
  }, [onLocateMe]);
  /* One control, one path into geolocation — the label only changes what it
     says, never what it does.

     Jeder Tipp ist eine neue Frage und bekommt eine neue Antwort: der Merker
     fuer eine weggeklickte (oder abgelaufene) Meldung faellt hier, wie bei
     „Nochmal". Bis 25.09.2026 blieb er stehen — der zweite Tipp endete im
     selben Fehler, der galt als schon gesehen, und der Knopf tat sichtbar
     nichts (Betreiber: „wenn ich wieder auf Icon klicke kommt keine
     Meldung"). */
  const handleLocateMe = useCallback(() => {
    if (isRealInvite) trackEvent('map_location_invite_accepted');
    setDismissedLocationStatusKey(null);
    onLocateMe();
  }, [isRealInvite, onLocateMe]);
  useLocationWelcome(isRealInvite && !mapDataLoading && !mapDataError, locale, handleLocateMe);

  const handleDismissLocationStatus = useCallback(() => {
    if (locationStatusKey) setDismissedLocationStatusKey(locationStatusKey);
  }, [locationStatusKey]);

  /* Die Standort-Meldung geht durch die zentrale Info-Karte, nicht mehr durch
     eine eigene Leiste am unteren Rand. Zwei Infoflaechen auf einem Schirm
     waren eine zu viel: die Leiste sass unter dem Sheet-Griff, die Toasts
     daneben, und welche der beiden gerade sprach, war Zufall. Der
     Zustandsautomat bleibt hier — er kennt die Nachfrist, den Selbstabgang
     und das Weggeklickte; die Karte zeigt nur.
     `duration: 0`, weil genau dieser Automat das Abraeumen besitzt. */
  const noticeKind: NoticeKind | null =
    showLocationStatus && !mapDataLoading && !mapDataError
      ? locatingVisible
        ? 'locating'
        : locationError === 'denied'
          ? 'locationBlocked'
          : locationError
            ? 'locationNotFound'
            : null
      : null;
  const noticeIsError = locationStatus.isError;
  const noticeCanRetry = locationStatus.canRetry;
  useEffect(() => {
    if (!noticeKind) return;
    /* Der Rueckgabewert raeumt genau diese Meldung ab und laesst eine
       inzwischen nachgerueckte stehen. Nur die Fehler tragen Knoepfe und
       liegen damit als Layer ueber der Karte; das Suchen geht von allein,
       sobald der Standort da ist. */
    if (noticeKind === 'locationBlocked') {
      return notify(
        noticeKind,
        locale,
        locationBlockedOptions(locale, handleDismissLocationStatus)
      );
    }
    return notify(noticeKind, locale, {
      action: noticeCanRetry
        ? { label: locale === 'en' ? 'Retry' : 'Nochmal', onClick: handleLocationRetry }
        : undefined,
      onDismiss: noticeIsError ? handleDismissLocationStatus : undefined,
      duration: 0,
    });
  }, [
    noticeKind,
    noticeIsError,
    noticeCanRetry,
    locale,
    handleLocationRetry,
    handleDismissLocationStatus,
  ]);

  /* What is typed but not sent yet. The suggestions follow it; the list and
     the pins wait for Enter — a list that changed with every letter was
     restless, and what you look for is usually one spot (Betreiber,
     29.09.2026). Follows `search` when that changes elsewhere (a picked
     suggestion, a cleared filter). */
  const [draft, setDraft] = useState(search);
  const [draftFor, setDraftFor] = useState(search);
  if (draftFor !== search) {
    setDraftFor(search);
    setDraft(search);
  }
  const suggesting = Boolean(draft.trim()) && draft !== search;
  const suggestions = useMemo(
    () => (suggesting ? suggestSpots(draft) : []),
    [suggesting, suggestSpots, draft]
  );
  const pickSuggestion = useCallback(
    (r: MapRestaurant) => {
      setDraft('');
      searchInputRef.current?.blur();
      onRestaurantClick(r, 'list');
    },
    [onRestaurantClick]
  );

  /* The search field takes focus without moving the page. `autoFocus` let
     iOS Safari scroll the document to "reveal" the field — it is fixed
     over the map strip and never needed revealing — and the keyboard going away
     moved it again, so every tap on the magnifier walked the list further
     down (user, 23.09.2026). Focus with preventScroll, and for as long as the
     keyboard takes to come and go, put back any scroll that happened without
     a finger on the screen. */
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchVisible = searchOpen || Boolean(search);
  /* Only an actual open or close holds the page — not the first render (nor
     its strict-mode re-run). */
  const searchWasVisibleRef = useRef(searchVisible);
  useEffect(() => {
    if (searchWasVisibleRef.current === searchVisible) return;
    searchWasVisibleRef.current = searchVisible;
    if (!window.matchMedia('(max-width: 767.98px)').matches) {
      if (searchVisible && searchOpen) searchInputRef.current?.focus({ preventScroll: true });
      return;
    }
    const heldY = window.scrollY;
    let touching = false;
    const onTouchStart = () => {
      touching = true;
    };
    const onScroll = () => {
      if (touching || Math.abs(window.scrollY - heldY) < 1) return;
      window.scrollTo({ top: heldY, behavior: 'instant' });
    };
    if (searchVisible && searchOpen) searchInputRef.current?.focus({ preventScroll: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    const done = window.setTimeout(() => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchstart', onTouchStart);
    }, KEYBOARD_SETTLE_MS);
    return () => {
      window.clearTimeout(done);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchstart', onTouchStart);
    };
  }, [searchVisible, searchOpen]);

  const renderLocateControl = () => (
    <button
      type="button"
      onClick={handleLocateMe}
      disabled={locateLoading}
      /* In the invite state the accessible name IS the visible label —
               anything else leaves a screen reader hearing one control and
               everyone else reading another. */
      aria-label={myLocationAriaLabel}
      className={controlStyles.fab}
      data-locate-fab=""
    >
      <svg
        className={controlStyles.fabIcon}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="6.5" />
        <circle cx="12" cy="12" r="2" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
    </button>
  );

  const sheetHandle = (
    <div ref={handleRef} className={sheetStyles.handle} data-sheet-handle="" aria-hidden="true" />
  );

  return (
    <main
      className={`app-page${isActive ? ' active' : ''}${fontClassName ? ` ${fontClassName}` : ''}`}
      data-page="map"
      data-map-view={sheetView}
      data-map-snap={snap}
    >
      {/* Die H1 der Seite steht in MapIntro, über der Karte. Sie lag bis zum
          01.09.2026 als `srOnly` hier: unsichtbar, und im Detail-Zustand stand
          sie neben der H1 des geöffneten Spots — zwei H1 auf einer Seite.
          Seitdem tragen die Detail-Panels h2, und die einzige H1 gehört der
          Kartenseite selbst. */}
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
          /* Die aufgeklappte Suchleiste liegt in derselben Zeile wie der
             Titel. Statt sie zu kürzen, bis sie irgendwo gerade so vorbeikommt,
             tritt der Titel zur Seite — siehe MapIntro.module.css. */
          data-search-open={searchOpen || search ? '' : undefined}

        >
          {/* The map's frame. On the phone it lies OVER the sheet and ends
              where the sheet begins — at its top edge, and never above the
              strip line — so the real map covers the strip above the stuck
              bar and no row shows there, however fast the page flies
              (MapLayout.module.css, "The map frame"). Elsewhere it has no
              box. */}
          <div className={styles.mapFrame} data-map-frame="">
            <div className={styles.mapWrap} data-map-canvas="">
              {/* Die H1 der Seite — im HTML, aber visuell ausgeblendet (seit
                23.09.2026, siehe MapIntro). Steht in der Kartenhülle, damit
                sie im Must-Eat-Takeover mit der Karte verschwindet. */}
              <MapIntro locale={locale} />
              <div className={styles.liveMapLayer} data-live-map-layer="">
                <MapCanvasLayer
                  mapRef={mapRef}
                  getInitialCamera={getInitialCamera}
                  onMapClick={onMapClick}
                  onMoveEnd={onMapMoveEnd}
                  displayedRestaurants={displayedRestaurants}
                  selectedRestaurant={selectedRestaurant}
                  onRestaurantClick={handleMapRestaurantClick}
                  /* Der Spot, um den es gerade geht. Beim Must-Eat-Detail ist
                   `selectedRestaurant` null (siehe handleMustEatClick), das
                   Gericht gehört aber zu einem Spot — auf der Karte ist das
                   derselbe Punkt, also tritt auch dort der Rest zurück. */
                  focusedRestaurantId={
                    selectedRestaurant?._id ?? selectedMustEat?.restaurant._id ?? null
                  }
                  location={location}
                />
              </div>

              {/* Desktop floating modals removed — both mobile and desktop now
                render the detail in the side panel / bottom sheet so the
                selected marker stays visible on the map. */}
            </div>

            {/* Geometry anchor for the map credit during phone sheet gestures. */}
            <div className={controlStyles.locateDock} data-locate-dock="" aria-hidden="true" />
          </div>

          {/* Search stays visible above the map and the phone sheet. */}
          {/* Ein Formular, damit Enter bzw. „Suchen" auf der Handy-Tastatur
               etwas tut: erst das Abschicken filtert Liste und Karte, und die
               Tastatur geht und gibt den Blick darauf frei. Ohne <form> lief
               die Taste ins Leere (23.09.2026). */}
            <>
              <form
                role="search"
                className={controlStyles.mapSearchToolbar}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onSubmit={(e) => {
                  e.preventDefault();
                  onSearchChange(draft.trim() ? draft : '');
                  searchInputRef.current?.blur();
                }}
              >
                <SearchGlassIcon className={controlStyles.mapSearchIcon} />
                <input
                  ref={searchInputRef}
                  type="search"
                  enterKeyHint="search"
                  name="map-search"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onFocus={onSearchOpen}
                  onBlur={() => {
                    if (!search && !draft) setSearchOpen(false);
                  }}
                  placeholder={locale === 'en' ? 'Spot, area, dish' : 'Spot, Kiez, Gericht'}
                  className={controlStyles.mapSearchInput}
                  aria-label={searchLabel}
                  autoComplete="off"
                />
                {!draft && renderLocateControl()}
                {(draft || search) && <button
                  type="button"
                  className={controlStyles.mapSearchClear}
                  onClick={() => {
                    setDraft('');
                    onSearchChange('');
                    setSearchOpen(false);
                  }}
                  aria-label={locale === 'en' ? 'Clear search' : 'Suche zurücksetzen'}
                >
                  <CloseIcon />
                </button>}
              </form>
              {suggesting && (
                <MapSearchSuggestions
                  spots={suggestions}
                  locale={locale === 'en' ? 'en' : 'de'}
                  onPick={pickSuggestion}
                />
              )}
            </>

          <button
            type="button"
            className={`et-btn et-btn-paper et-btn-map-control ${controlStyles.mapBurger}`}
            data-map-burger=""
            onClick={openBurgerMenu}
            aria-label={locale === 'en' ? 'Menu' : 'Menü'}
          >
            <span className={controlStyles.mapBurgerLines} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>{locale === 'en' ? 'Menu' : 'Menü'}</span>
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
            {/* Einzige Richtungsmarke der Map: die Desktop-Panel-Lasche. */}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 5 7 7-7 7" />
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
            /* Die aufgeklappte Suchleiste liegt in derselben Zeile wie der
             Titel. Statt sie zu kürzen, bis sie irgendwo gerade so vorbeikommt,
             tritt der Titel zur Seite — siehe MapIntro.module.css. */
            data-search-open={searchOpen || search ? '' : undefined}
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
            {/* In the list the handle rides in the sticky filter bar instead
                (see MapListHeader); in a restaurant detail it sticks itself
                (MapSheet.module.css). Either way it is the way back to the
                map, so it has to stay on screen. */}
            {sheetView === 'detail' && sheetHandle}

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
                locationError={locationError}
                onRequestLocation={onLocateMe}
                unlockedIds={unlockedIds}
                mustEat={selectedMustEat}
                onUnlock={onUnlock}
                onClose={onMustEatClose}
                onViewRestaurant={onViewRestaurantFromMustEat}
                prevMustEat={mustEatPagerPrev}
                nextMustEat={mustEatPagerNext}
                mustEatPosition={mustEatPagerPosition}
                mustEatCollection={mustEatCollection}
                onboardingData={onboardingData}
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
                closeTarget={detailOrigin}
                onMustEatClick={onMustEatClick}
                isFavorite={favoriteIds.has(selectedRestaurant._id)}
                onToggleFavorite={onToggleFavorite}
              />
            ) : (
              <>
                <MapListHeader
                  headerRef={setHeaderRef}
                  grabber={sheetHandle}
                  categories={categories}
                  category={category}
                  onCategoryChange={setCategory}
                  openOnly={openOnly}
                  onOpenOnly={setOpenOnly}
                  bezirkNames={bezirkNames}
                  bezirk={bezirk}
                  onBezirk={onBezirkChange}
                  priceBucketIds={priceBucketIds}
                  price={price}
                  onPrice={setPrice}
                  optionCounts={optionCounts}
                />
                <div ref={setContentRef} className={sheetStyles.listScroll} data-sheet-content="">
                  <RestaurantList
                    restaurants={listRestaurants}
                    userLocation={location}
                    selectedId={selectedRestaurant?._id ?? listFocusId}
                    onSelect={onRestaurantClick}
                    primaryMustEats={primaryMustEats}
                    unlockedIds={unlockedIds}
                    revealedMustEatIds={revealedMustEatIds}
                    onResetFilters={handleResetFilters}
                    onClearSearch={handleClearSearch}
                    searchQuery={search}
                    filtersActive={category !== 'All' || Boolean(bezirk || price) || openOnly}
                    visibleRows={listRows}
                    onNeedMoreRows={showMoreRows}
                  />
                </div>
              </>
            )}
          </aside>

          <MapDataNotice
            error={mapDataError}
            hasData={mapDataHasContent}
            onRetry={onRetryMapData}
          />

          {/* Die Standort-Meldung selbst haengt in der zentralen Info-Karte
              (NotificationToast) — hier steht nur noch der Automat, der sie
              fuettert (siehe oben). */}
        </div>
      </div>
    </main>
  );
}
