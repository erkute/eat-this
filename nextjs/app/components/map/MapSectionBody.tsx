'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import type { CSSProperties, Ref, RefObject } from 'react';
import type { MapRef, ViewStateChangeEvent } from 'react-map-gl/maplibre';
import type { MapRestaurant, MapMustEat, MapCategory } from '@/lib/types';
import type { ClaimOutcome } from '@/lib/map/claimSignupSpot';
import { resolveLockedOffer } from '@/lib/map/lockedOffer';
import type { CategoryDef } from '@/lib/categories';
import type { SheetView, SheetSnap, UserLocation, UserTier, MapOptionCounts } from '@/lib/map';
import type { DetailOrigin } from '@/lib/map/phoneSheetSnaps';
import type { UserLocationError } from '@/lib/map/useUserLocation';
import {
  getLocatingCopy,
  getLocationNoticeCopy,
  getLocationStatus,
  LOCATING_MIN_VISIBLE_MS,
  LOCATING_SHOW_DELAY_MS,
  LOCATION_ERROR_VISIBLE_MS,
  type LocationStatus,
} from '@/lib/map/locationStatus';
import { useLocationInvite } from '@/lib/map/useLocationInvite';
import { useDeferredStatus } from '@/lib/map/useDeferredStatus';
import { safeAreaInsetTop } from '@/lib/map/safeArea';
import { openBurgerDrawer } from '../burgerDrawerState';
import { trackEvent, trackEventOnce } from '@/lib/analytics';

import dynamic from 'next/dynamic';
import RestaurantList from './RestaurantList';
import { INITIAL_LIST_ROWS, LIST_ROWS_PER_BATCH } from '@/lib/map/listWindow';
import MapSheetDetail from './MapSheetDetail';
import LockedDetail from './LockedDetail';
import MapListHeader from './MapListHeader';
import MapIntro from './MapIntro';
import { SearchGlassIcon } from './icons';
import MapSeoFooter from './MapSeoFooter';
import MapDataNotice from './MapDataNotice';
import SignInReward from './SignInReward';
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
  /** What the list renders: every match in one order, paywalled spots among
   *  them. The two sets above stay apart only for the map, which still draws
   *  a locked spot as a muted dot. */
  listRestaurants: MapRestaurant[];
  /** Unfiltered catalog size for the locked sheet's all-Berlin offer. */
  /** Every paywalled id, so the sheet knows which detail to render. */
  lockedIdSet: Set<string>;
  /** Slug of the spot a returning magic link is still claiming — see
   *  useSignupSpotClaim. Keeps its sheet on the sign-up branch until the spot
   *  actually opens. */
  claimingSlug: string | null;
  /** Wie der Claim ausging — entscheidet, was die Einblendung am Ende sagt. */
  claimOutcome: ClaimOutcome | null;
  /** Startet den Claim für einen Spot — der gemeinsame Weg für Google und
   *  Mail, siehe useSignupSpotClaim.startClaim. */
  onClaimSpot: (slug: string) => void;
  /** Sichtbare Spots der letzten ANONYMEN Payload — die Vorher-Basis des
   *  Belohnungs-Screens. Null, solange nie eine anonyme Sicht geladen war. */
  anonSpotCount: number | null;
  /** Für WEN die Kartendaten in der Hand geholt wurden — nicht dasselbe wie
   *  `uid`, siehe resolveLockedOffer. */
  mapUid: string | null;
  /** Unfiltered number of spots this viewer can open — what the sign-in banner
   *  counts, so the filter the reader happens to have on does not change the
   *  number it reports. */
  openSpotCount: number;
  /** Slug whose sheet should unroll rather than cut in — a sign-up just opened
   *  it while the reader was looking at it. */
  justUnlockedSlug: string | null;
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
  search: string;
  onSearchChange: (v: string) => void;
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
  mustEatPagerPosition?: { index: number; count: number };
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
  /** Visible on the locate control until a position is shared — see
   *  `.fab[data-invite]`. Doubles as its accessible name there. */
  locateInviteLabel: string;
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
    listFocusId,
    detailOrigin,
    snap,
    dragging,
    displayedRestaurants,
    displayedLockedRestaurants,
    listRestaurants,
    lockedIdSet,
    claimingSlug,
    claimOutcome,
    onClaimSpot,
    anonSpotCount,
    mapUid,
    openSpotCount,
    justUnlockedSlug,
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
    locateInviteLabel,
    restaurantsListAriaLabel,
  } = props;

  /* Every input that reorders or re-scopes the list, in one string. The map
     toggle forgets its remembered scroll position whenever this changes. */
  const listFilterKey = `${category}|${bezirk ?? ''}|${price ?? ''}|${openOnly}|${search.trim()}`;

  /* Wie viele Listenzeilen gerendert werden. Der Stand liegt hier und nicht in
     RestaurantList, weil ein Sprung ins Detail die Liste aushängt: der
     View-Toggle stellt beim Zurück die alte Scroll-Position wieder her, und
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
  const handleLockedClick = useCallback(
    (r: MapRestaurant) => {
      trackEvent('locked_spot_opened', { restaurant_id: r._id, restaurant_slug: r.slug });
      onRestaurantClick(r, 'map');
    },
    [onRestaurantClick]
  );
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

  /* The locate FAB is a bare icon on a halo — nothing on screen says the map
     could centre on you, so nobody presses it. It introduces itself instead.
     The hook owns WHEN, because the two cases differ: an unanswered permission
     gets a standing invitation, a granted one a short greeting that ends when
     the position lands (useLocationInvite). Note it is NOT gated on `location`
     here any more — that would collapse the greeting the instant the fix
     arrives, which for a cached fix is a frame or two. */
  const locateLabel = useLocationInvite(location !== null);
  /* Im Detail bleibt der Knopf das nackte Icon: die Plakette war für die Karte
     ohne Standortfreigabe gedacht, im 50dvh-Streifen über dem Detail nimmt sie
     ein Drittel der Kartenbreite (User, 03.09.2026). */
  const showLocateInvite =
    locateLabel !== null && isActive && !locationError && !locateLoading && sheetView !== 'detail';
  /* Only an unanswered permission is a funnel step. A greeting is shown to
     someone who has nothing left to decide, so counting it would pad the
     denominator with returning visitors. */
  const isRealInvite = showLocateInvite && locateLabel === 'invite';
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
  /* One control, one path into geolocation — the label only changes what it
     says, never what it does. */
  const handleLocateMe = useCallback(() => {
    if (isRealInvite) trackEvent('map_location_invite_accepted');
    onLocateMe();
  }, [isRealInvite, onLocateMe]);
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
  const noticeCopy =
    showLocationStatus && !mapDataLoading && !mapDataError
      ? getLocationNoticeCopy(locale, locatingVisible ? null : locationError, locatingVisible)
      : null;
  /* Ueber die einzelnen Zeilen statt ueber das Objekt: das entsteht bei jedem
     Rendern neu und wuerde die Meldung sonst dauernd neu aufziehen. */
  const noticeEyebrow = noticeCopy?.eyebrow ?? null;
  const noticeTitle = noticeCopy?.title ?? null;
  const noticeDetail = noticeCopy?.detail ?? null;
  const noticeIsError = locationStatus.isError;
  const noticeCanRetry = locationStatus.canRetry;
  useEffect(() => {
    if (!noticeTitle || !noticeEyebrow) return;
    /* Der Rueckgabewert raeumt genau diese Meldung ab und laesst eine
       inzwischen nachgerueckte stehen. */
    return window.showNotice?.({
      tone: noticeIsError ? 'warning' : 'info',
      icon: 'pin',
      eyebrow: noticeEyebrow,
      title: noticeTitle,
      detail: noticeDetail ?? undefined,
      action: noticeCanRetry
        ? { label: locale === 'en' ? 'Retry' : 'Nochmal', onClick: handleLocationRetry }
        : undefined,
      /* Nur die Fehler bekommen einen Wegklick-Knopf. Das Suchen raeumt sich
         selbst ab, sobald der Standort da ist. */
      onDismiss: noticeIsError ? handleDismissLocationStatus : undefined,
      duration: 0,
      /* Scrim nur, wo eine Antwort faellig ist: die Fehler tragen Knoepfe und
         warten. Das Suchen geht von allein — die Karte laeuft unter ihm
         weiter, und iOS 26 faerbt seine Leisten nach dem Scrim (globals.css,
         .notification-layer). */
      layer: noticeIsError,
    });
  }, [
    noticeEyebrow,
    noticeTitle,
    noticeDetail,
    noticeIsError,
    noticeCanRetry,
    locale,
    handleLocationRetry,
    handleDismissLocationStatus,
  ]);

  /* In-flow phone sheet: the sticky header rests below the iOS status-bar/
     notch zone (top: env(safe-area-inset-top), see MapFilters.module.css).
     That zone deliberately stays uncapped so Safari can sample the scrolling
     rows behind its translucent status bar. Stuck is still detected via a
     0-height sentinel to move the floating map controls out of the way.

     Runs in BOTH views. It used to be list-only, so search and burger left the
     screen at a different scroll position in the detail than in the list. */
  /* Der Standort-Knopf reitet auf der Oberkante der Liste — er wandert mit,
     wenn sie hochkommt, statt sich darunter zu verstecken (das tat er, solange
     er im isolierten Kartenfenster hing) oder auf ihr zu liegen.

     Gerechnet wird hier, nicht in CSS: auf Telefonen liegt die Liste im Fluss,
     ihre Oberkante hängt an der Scrollposition, und davon weiß ein Stylesheet
     nichts. Nach oben gedeckelt, damit er nicht in Lupe und Burger läuft.
     Dass er nicht KLEBT, macht der Nachlauf in der CSS-Transition: der Wert
     springt pro Frame, der Knopf zieht weich hinterher. */
  const [locateBottom, setLocateBottom] = useState<number | null>(null);
  const [locateGone, setLocateGone] = useState(false);
  useEffect(() => {
    if (!window.matchMedia('(max-width: 1023.98px)').matches) {
      setLocateBottom(null);
      setLocateGone(false);
      return;
    }
    let frame = 0;
    let lastTop: number | null = null;
    let settle = 0;
    /* Wie weit die Listenkante zwischen zwei Frames wandern darf, bevor der
       Knopf aufgibt. Das Scrollen läuft auf dem Compositor, seine Position
       kommt aus JS auf dem Hauptthread — bei einem schnellen Wisch ist sie
       Frames zu spät, und die Liste überholt ihn. Dagegen hilft kein größerer
       Abstand: ein Fling schiebt pro Frame dreistellige Pixelwerte. Also
       weicht er ab hier zur Seite (dieselbe Geste wie am Burger) und kommt
       zurück, sobald der Wisch steht. 10px/Frame ≈ 600px/s — deutlich über
       allem, was ein bewusster Wisch erreicht. */
    const MAX_STEP_PX = 10;
    const measure = () => {
      frame = 0;
      const sheet = document.querySelector<HTMLElement>('[data-map-sheet]');
      const fab = document.querySelector<HTMLElement>('[data-locate-fab]');
      if (!sheet || !fab) return;
      const sheetTop = sheet.getBoundingClientRect().top;
      const step = lastTop === null ? 0 : Math.abs(sheetTop - lastTop);
      lastTop = sheetTop;
      const wanted = Math.max(0, window.innerHeight - sheetTop + 14);
      /* Die Fahrt wird nicht gedeckelt — der Knopf verschwindet, kurz bevor er
         den Burger erreicht, statt darunter zu parken. Die Linie liest sich
         aus dem Burger selbst, damit sie nicht wegdriftet, wenn der umzieht. */
      const burger = document.querySelector<HTMLElement>('[data-map-burger]');
      const vanishTop = (burger ? burger.getBoundingClientRect().bottom : 58) + 14;
      setLocateBottom(Math.round(wanted));
      setLocateGone(
        window.innerHeight - wanted - fab.offsetHeight < vanishTop || step > MAX_STEP_PX
      );
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
      /* Nach dem letzten Scroll-Ereignis einmal ohne Schrittweite nachrechnen:
         steht der Wisch, gehört der Knopf zurück an die Kante. */
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        lastTop = null;
        measure();
      }, 140);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [sheetView, snap]);

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
          data-header-stuck={headerStuck ? 'true' : undefined}
          /* Die aufgeklappte Suchleiste liegt in derselben Zeile wie der
             Titel. Statt sie zu kürzen, bis sie irgendwo gerade so vorbeikommt,
             tritt der Titel zur Seite — siehe MapIntro.module.css. */
          data-search-open={searchOpen || search ? '' : undefined}
          data-locate-gone={locateGone ? 'true' : undefined}
          style={
            locateBottom == null
              ? undefined
              : ({ '--locate-bottom': `${locateBottom}px` } as CSSProperties)
          }
        >
          <div className={styles.mapWrap} data-map-canvas="">
            {/* Die H1 der Seite schwebt über der Karte, in derselben Sprache
                wie Suche und Burger daneben: Ink-Type mit weißem Halo, keine
                Fläche. Sie stand bis zum 01.09.2026 im Listen-Panel und war
                dort auf dem Desktop dauerhaft sichtbar, ohne je wegzuscrollen
                (User). Hier kostet sie der Liste keinen Pixel. */}
            <MapIntro locale={locale} />
            <div className={styles.liveMapLayer} data-live-map-layer="">
              <MapCanvasLayer
                mapRef={mapRef}
                onMapClick={onMapClick}
                onMoveEnd={onMapMoveEnd}
                displayedRestaurants={displayedRestaurants}
                displayedLockedRestaurants={displayedLockedRestaurants}
                selectedRestaurant={selectedRestaurant}
                selectedIsLocked={!!selectedRestaurant && lockedIdSet.has(selectedRestaurant._id)}
                onRestaurantClick={handleMapRestaurantClick}
                onLockedClick={handleLockedClick}
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
                <SearchGlassIcon className={controlStyles.mapSearchIcon} />
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
                  {/* Zwei Striche, ungleich lang und je eigen gekippt — dieselbe
                      Handschrift wie die Lupe links daneben und die drei
                      Burger-Balken (19/22/15px). Als exaktes, symmetrisches
                      Kreuz war es das einzige konstruierte Zeichen in der
                      Reihe. */}
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M6.6 6.2c3.6 3.9 7.4 7.6 11.2 11.4" strokeWidth="2.6" />
                    <path d="M17.4 6.8c-3.3 3.4-6.8 6.8-10.3 10.1" strokeWidth="2.1" />
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
                <SearchGlassIcon className={controlStyles.mapSearchIcon} />
              </button>
            )}

            {/* Desktop floating modals removed — both mobile and desktop now
                render the detail in the side panel / bottom sheet so the
                selected marker stays visible on the map. */}
          </div>

          {/* Der Standort-Knopf steht bewusst AUSSERHALB von `.mapWrap`.
              Der Wrapper trägt `isolation: isolate` (damit der Standort-Marker
              mit z-index 1000 im Kartenfenster bleibt) — darin kann kein
              z-index nach draußen wirken, und die Liste (z-index 4) legte sich
              über den Knopf, sobald sie auch nur ein Stück hochkam. Als
              Geschwister der Liste gewinnt seine 6 gegen ihre 4. */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locateLoading}
            /* In the invite state the accessible name IS the visible label —
               anything else leaves a screen reader hearing one control and
               everyone else reading another. */
            aria-label={showLocateInvite ? locateInviteLabel : myLocationAriaLabel}
            className={controlStyles.fab}
            data-locate-fab=""
            data-invite={showLocateInvite ? '' : undefined}
          >
            <svg
              className={`${controlStyles.fabIcon}${showLocateInvite ? ` ${controlStyles.fabIconOnPlate}` : ''}`}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {/* Dasselbe Handwerk wie bei Lupe und Burger: geschlossener Ring,
                  dicker Punkt, vier kurze Striche mit runden Enden — und wie
                  dort von Hand geführt statt konstruiert (siehe die Lupe oben).
                  Der Ring läuft am Schluss über seinen Anfang, der Punkt ist
                  keine exakte Scheibe, und die vier Striche sind
                  unterschiedlich lang: ein perfektes Fadenkreuz stand als
                  einziges technisches Zeichen zwischen lauter gezeichneten. */}
              <path
                d="M7.1 15.4C5.4 13.1 5.8 9.6 8.2 7.8c2.4-1.8 6-1.4 7.7.9 1.7 2.3 1.2 5.8-1.3 7.4-2.1 1.4-5.1 1-6.9-.7"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
              />
              <path
                d="M10.9 10.9c1.2-.9 3-.2 3.1 1.2.1 1.4-1.4 2.3-2.6 1.7-1.1-.6-1.4-2.2-.5-2.9Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M12.2 2.4 12 5M11.7 19.2l.2 2.3M2.5 11.6l2.7.3M19 12.3l2.4-.3"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
              />
            </svg>
            {/* Always mounted so the label can collapse back out on the way
                down, not just unfold on the way in. */}
            <span className={controlStyles.fabLabel} aria-hidden="true">
              <span>{locateInviteLabel}</span>
            </span>
          </button>

          <button
            type="button"
            className={controlStyles.mapBurger}
            data-map-burger=""
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
                onPagePrev={() => onPageMustEat('prev')}
                onPageNext={() => onPageMustEat('next')}
              />
            ) : sheetView === 'detail' &&
              selectedRestaurant &&
              lockedIdSet.has(selectedRestaurant._id) ? (
              <LockedDetail
                restaurant={selectedRestaurant}
                offer={resolveLockedOffer({
                  uid,
                  mapUid,
                  claimingSlug,
                  slug: selectedRestaurant.slug,
                })}
                onClaimSpot={() => onClaimSpot(selectedRestaurant.slug)}
                contentRef={setContentRef}
                onClose={onRestaurantClose}
                prevRestaurant={pagerPrev}
                nextRestaurant={pagerNext}
                onPagePrev={() => onPageRestaurant('prev')}
                onPageNext={() => onPageRestaurant('next')}
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
                justUnlocked={justUnlockedSlug === selectedRestaurant.slug}
                mustEats={restaurantMustEats}
                revealedMustEatIds={revealedMustEatIds}
                onClose={onRestaurantClose}
                closeTarget={detailOrigin}
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
                  priceBucketIds={priceBucketIds}
                  price={price}
                  onPrice={setPrice}
                  optionCounts={optionCounts}
                  searchActive={Boolean(search.trim())}
                />
                <div ref={setContentRef} className={sheetStyles.listScroll}>
                  <RestaurantList
                    restaurants={listRestaurants}
                    userLocation={location}
                    selectedId={selectedRestaurant?._id ?? listFocusId}
                    onSelect={onRestaurantClick}
                    primaryMustEats={primaryMustEats}
                    unlockedIds={unlockedIds}
                    revealedMustEatIds={revealedMustEatIds}
                    onResetFilters={handleResetFilters}
                    lockedIds={lockedIdSet}
                    visibleRows={listRows}
                    onNeedMoreRows={showMoreRows}
                  />
                  <MapSeoFooter locale={locale} />
                </div>
              </>
            )}
          </aside>

          {/* Phone list only. Mounted unconditionally so the list position it
              remembers survives a trip into a detail and back — see the
              component. */}
          <MapViewToggle sheetView={sheetView} filterKey={listFilterKey} />

          {/* Sagt beim Rücksprung aus der Mail, was gerade passiert — und was
              es wert war. Mitte statt Kante, siehe die Komponente. */}
          <SignInReward
            working={claimingSlug !== null}
            outcome={claimOutcome}
            openSpotCount={openSpotCount}
            baselineCount={anonSpotCount}
          />

          <MapDataNotice
            loading={mapDataLoading}
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
