'use client';
import { useRef, useState, useMemo, useCallback, useEffect, useLayoutEffect } from 'react';
import type { MapRef, ViewStateChangeEvent } from 'react-map-gl/maplibre';
import type { MapRestaurant, MapMustEat, MapCategory } from '@/lib/types';
import {
  useUserLocation,
  useMapFilters,
  useMapSheet,
  useMapDeepLinks,
  useMapFilterUrl,
  buildPeekMustEatMap,
} from '@/lib/map';
import { useTranslation } from '@/lib/i18n';
import { useMapLocationFollow } from '@/lib/map/useMapLocationFollow';
import { useMapListAnchor, useMapListReturn } from '@/lib/map/useMapListReturn';
import { useMapAccount } from '@/lib/map/useMapAccount';
import MapSectionBody from './map/MapSectionBody';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';
import { prefetchRestaurantDetail } from '@/lib/map/useRestaurantDetail';
import { dropLowered, mapStripLine } from '@/lib/map/sheetSlide';
import { trackEvent } from '@/lib/analytics';
import { pollUntilMapReady } from '@/lib/map/pollUntilMapReady';
import { basemapTileTemplate, preloadSpotTiles } from '@/lib/map/tilePreload';
import { berlinNow } from '@/lib/map/openingHours';
import {
  phoneListMidVisiblePx,
  type DetailOrigin,
} from '@/lib/map/phoneSheetSnaps';
import { flyToSpots } from '@/lib/map/cameraFit';
import {
  isRowReturnFlight,
  listFollowsMove,
  ROW_RETURN_FLIGHT,
  sameCenter,
  type ListCenter,
} from '@/lib/map/listCenter';
import { isPhoneViewport, isSheetViewport } from '@/lib/map/viewport';
import { useMapCamera } from '@/lib/map/useMapCamera';
import { useMapStarterPrompt } from '@/lib/map/useMapStarterPrompt';
import { useDetailSelection, type DetailOpeners } from '@/lib/map/useDetailSelection';

/* How long the search query has to hold still before the camera follows it.
   Long enough that typing "kreuzberg" flies once rather than once per letter,
   short enough that the move still reads as the answer to what was typed.
   Was 450 ms; taken down to 300 on 22.08.2026 because the wait read as lag. */
const SEARCH_REFIT_DELAY_MS = 300;

interface Props {
  isActive?: boolean;
  initialMapData?: InitialMapData;
  /** When the server rendered the page (epoch ms). The list puts what is open
   *  at that moment first, on the server and in the browser alike, so the
   *  rows do not reshuffle on hydration (openFirst). */
  renderedAt?: number;
  initialRestaurantSlug?: string | null;
}

export default function MapSection({
  isActive = false,
  initialMapData,
  renderedAt,
  initialRestaurantSlug = null,
}: Props) {
  const orderedAt = useMemo(
    () => (renderedAt === undefined ? undefined : berlinNow(new Date(renderedAt))),
    [renderedAt]
  );
  const mapRef = useRef<MapRef>(null);
  const mapTrackedRef = useRef(false);
  const { t } = useTranslation();

  const {
    uid, guest, cardViewerKey, restaurants, mustEats, categories,
    revealedMustEatIds, unlockedIds, favoriteIds, toggleFavorite, userTier, reveal,
    loading: mapDataLoading, error: mapDataError, refetch: refetchMapData,
  } = useMapAccount(initialMapData);
  const initialRestaurant = useMemo(() => {
    if (!initialRestaurantSlug || !initialMapData) return null;
    return (
      initialMapData.restaurants.find((restaurant) => restaurant.slug === initialRestaurantSlug) ??
      null
    );
  }, [initialMapData, initialRestaurantSlug]);
  const geolocation = useUserLocation();
  const { location, loading: locating, error: locationError } = geolocation;

  useEffect(() => {
    if (!isActive || mapTrackedRef.current) return;
    mapTrackedRef.current = true;
    trackEvent('map_opened', { tier: userTier });
  }, [isActive, userTier]);

  // Swipe the open detail down past peek → close it (back to the list). The
  // close logic lives in the handlers below, so route the sheet's dismiss
  // through a ref we keep pointed at the right handler (restaurant vs must-eat).
  const dismissDetailRef = useRef<() => void>(() => {});
  const dismissDetail = useCallback(() => {
    dismissDetailRef.current();
  }, []);

  const {
    handleRef,
    contentRef,
    setContentRef,
    setHeaderRef,
    snap,
    setSnap,
    dragging,
    reapplySnap,
    sheetView,
    setSheetView,
    sheetElRef,
    setSheetRef,
  } = useMapSheet(dismissDetail, initialRestaurant ? 'detail' : 'list');

  // Read by the popstate listener, which is subscribed once per activation and
  // must not close over a stale sheetView.
  const sheetViewRef = useRef(sheetView);
  sheetViewRef.current = sheetView;

  const scrollListToAnchor = useMapListAnchor(sheetElRef);

  /* Die Sheet aus dem Weg räumen — das, was ein Tipp auf die Karte tut.
     Für die Detailansicht heißt das „auf peek einklappen" (Name plus die drei
     runden Icons bleiben stehen, die Auswahl auch), für die Telefon-Liste der
     Rücksprung auf ihre Ruhelage. Steht hier, weil es zwei Aufrufer hat:
     handleMapClick weiter unten und die Marker-Sperre in
     handleRestaurantClick / handleMustEatClick. */
  const collapseSheetToPeek = useCallback(() => {
    if (isPhoneViewport() && sheetView === 'list') {
      scrollListToAnchor('peek');
      return;
    }
    /* The phone restaurant detail is window-scrolled like the list, its map
       stop is scroll 0 (phoneSheetSnaps.ts), and the snap below moves nothing
       there (useBottomSheet leaves in-flow phone sheets alone). A tap on the
       map above a pushed-up detail used to change the state and leave the
       page where it was (user, 28.09.2026). */
    if (isPhoneViewport() && sheetElRef.current?.dataset.detailKind === 'restaurant') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (snap !== 'peek') {
      setSnap('peek');
      reapplySnap('peek');
    }
  }, [sheetView, snap, setSnap, reapplySnap, scrollListToAnchor, sheetElRef]);

  /* Der erste Tipp auf die Karte räumt nur weg (User, 04.09.2026).
     Steht eine Detailansicht offen und liegt sie noch über der Karte, dann
     wählt ein Tipp auf die Karte KEINEN Spot aus — egal, ob er zufällig einen
     Pin trifft. Er klappt nur ein. Erst der zweite Tipp wählt wieder.

     Der Grund: bei offener Sheet gibt es auf der Karte keinen Vorhang. Die
     Fläche, auf die man zum Wegtippen zielt, IST die Karte, und dort stehen
     rund 400 Pins — ein Wegtipp traf regelmäßig einen davon und öffnete einen
     fremden Spot.

     Zwei Grenzen, damit die Sperre nicht mehr frisst als sie soll: nur auf
     Mobil (auf dem Desktop liegt die Sheet neben der Karte, nicht darüber und
     verdeckt nichts), und nur solange die Sheet NICHT schon auf peek steht —
     ist sie bereits eingeklappt, liegt nichts mehr im Weg und ein Pin-Tipp
     meint wieder den Pin. Listenzeilen sind nie betroffen, die kommen mit
     origin === 'list'. */
  const mapTapOnlyDismisses = useCallback(
    (origin: DetailOrigin) =>
      origin === 'map' && sheetView === 'detail' && snap !== 'peek' && isSheetViewport(),
    [sheetView, snap]
  );

  /* Where the map is looking, once the user has moved it — the list sorts by
     distance to this point from then on (lib/map/listCenter.ts). Null until
     the first drag, pinch or marker tap, so the first paint keeps the curated
     order. `listFollowsMapRef` is the "from then on": it never goes back. */
  const [listCenter, setListCenter] = useState<ListCenter | null>(null);
  const listFollowsMapRef = useRef(false);

  const {
    category,
    setCategory,
    search,
    setSearch,
    suggest,
    bezirk,
    setBezirk,
    price,
    setPrice,
    openOnly,
    setOpenOnly,
    bezirkNames,
    priceBucketIds,
    optionCounts,
    displayedRestaurants,
    listRestaurants,
  } = useMapFilters({ restaurants, mustEats, location, listCenter, orderedAt });

  const [searchOpen, setSearchOpen] = useState(false);
  /* MapSection's open handlers, for the back/forward gestures that reopen a
     detail — assigned below, once the handlers exist. */
  const detailOpenersRef = useRef<DetailOpeners>({ restaurant: () => {}, mustEat: () => {} });
  const {
    selectedRestaurant,
    setSelectedRestaurant,
    selectedMustEat,
    setSelectedMustEat,
    mustEatPagerAdjacent,
    mustEatPagerPosition,
    mustEatCollection,
    detailEntryPushedRef,
    detailClosedBySearchRef,
    listAnchorPendingRef,
  } = useDetailSelection({
    isActive,
    initialRestaurant,
    sheetView,
    restaurants,
    mustEats,
    unlockedIds,
    scrollListToAnchor,
    dismissDetailRef,
    openRef: detailOpenersRef,
  });
  useMapStarterPrompt({
    active: isActive,
    guest,
    spotId: selectedRestaurant?._id ?? selectedMustEat?.restaurant._id ?? null,
    detailOpen: sheetView === 'detail',
  });

  // Desktop-only: lets the user collapse the side panel off to the right so
  // the map fills the viewport (Google-Maps-style toggle).
  const [desktopPanelHidden, setDesktopPanelHiddenState] = useState(false);
  /* The same, for the camera: the map runs under the panel, and a flight
     started in the handler that unfolds it must already leave the panel's
     strip out — before React has rendered the change. */
  const desktopPanelHiddenRef = useRef(false);
  const setDesktopPanelHidden = useCallback((hidden: boolean) => {
    desktopPanelHiddenRef.current = hidden;
    setDesktopPanelHiddenState(hidden);
  }, []);
  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const restorePanelBelowDesktop = (event: MediaQueryListEvent) => {
      if (!event.matches) setDesktopPanelHidden(false);
    };
    desktopQuery.addEventListener('change', restorePanelBelowDesktop);
    return () => desktopQuery.removeEventListener('change', restorePanelBelowDesktop);
  }, [setDesktopPanelHidden]);

  // Snap the sheet when entering detail view (or switching selections).
  const snapRef = useRef(snap);
  snapRef.current = snap;
  /* Snap explicitly requested by an open-detail handler (pin-tap → 'peek',
     list/search/deep-link → 'full'). Consumed once by the layout effect
     below; null for selection changes that arrive WITHOUT a handler call
     (prev/next paging), which keep the current position. */
  const pendingDetailSnapRef = useRef<'full' | 'peek' | null>(null);
  /* Phones: where the list's top edge stood on screen when a restaurant was
     opened from it. The detail opens with its own top edge there — the sheet
     keeps the height the user had pulled it to instead of dropping back to
     its resting stop (user, 23.09.2026). Consumed once by the effect below. */
  const detailOpenTopRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const root = document.documentElement;
    /* Only changed values invalidate styles during viewport/scroll events. */
    const written = new Map<string, string>();
    let canvasWidth: number | null = null;
    const write = (prop: string, value: string) => {
      if (written.get(prop) === value) return;
      written.set(prop, value);
      root.style.setProperty(prop, value);
    };

    const apply = () => {
      if (!isPhoneViewport()) {
        canvasWidth = null;
        written.clear();
        root.style.removeProperty('--map-canvas-height');
        root.style.removeProperty('--map-runtime-bar-overhang');
        root.style.removeProperty('--map-visual-offset-top');
        return;
      }

      /* Keep the camera's geometry stable through height-only browser chrome
         changes. A width change (rotation or window resize) measures it anew.
         The touch screen bounds cover the area exposed when bars retract,
         even in browsers that report a changing large viewport. */
      const touchViewport = window.matchMedia('(pointer: coarse)').matches;
      if (!touchViewport) {
        canvasWidth = null;
        written.delete('--map-canvas-height');
        root.style.removeProperty('--map-canvas-height');
      } else if (canvasWidth !== window.innerWidth) {
        const probe = document.createElement('div');
        probe.style.cssText = 'position:fixed;width:0;height:100lvh;visibility:hidden;pointer-events:none;';
        document.body.appendChild(probe);
        const portrait = window.matchMedia('(orientation: portrait)').matches;
        const screenHeight = (portrait ? Math.max : Math.min)(window.screen.width, window.screen.height);
        const height = Math.max(probe.offsetHeight, window.innerHeight, screenHeight);
        probe.remove();
        write('--map-canvas-height', `${height}px`);
        canvasWidth = window.innerWidth;
      }

      const visualViewport = window.visualViewport;
      const visualHeight = visualViewport?.height ?? window.innerHeight;
      const layoutHeight = Math.max(
        window.innerHeight,
        document.documentElement.clientHeight,
        visualHeight
      );
      const visualOffsetTop = visualViewport?.offsetTop ?? 0;
      const toolbarHeight = Math.max(0, layoutHeight - visualHeight - visualOffsetTop);

      write('--map-runtime-bar-overhang', `${Math.round(Math.max(96, toolbarHeight + 96))}px`);

      /* How far the visual viewport has slid down inside the layout viewport.
         Non-zero only while the iOS keyboard is up: the layout viewport keeps
         its full height, Safari scrolls the visual one to keep the caret clear,
         and anything `position: fixed` — which anchors to the LAYOUT viewport —
         rides up out of sight with it. Measured on an iPhone 16e simulator,
         iOS 26.3: tapping the magnifier put offsetTop at 96 while the toolbar's
         own `top: 14px` left its client rect at -82, i.e. fully above the
         visible area. The phone controls add this back onto their `top`
         (MapControls.module.css). Kept off `transform`, which those three need
         for their retreat animation.

         Only while a text field has focus, i.e. while there IS a keyboard.
         Safari slides the visual viewport for other reasons too: the burger
         drawer pins the page (body position: fixed), Safari unfolds its bars,
         and the offset it reported pushed burger and search down while the
         map stayed put (user, 23.09.2026). */
      const active = document.activeElement;
      /* Only fields that bring up the keyboard — not a focused checkbox. */
      const typing =
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLInputElement &&
          ['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(active.type)) ||
        (active instanceof HTMLElement && active.isContentEditable);
      write(
        '--map-visual-offset-top',
        `${typing ? Math.round(Math.max(0, visualOffsetTop)) : 0}px`
      );
    };

    apply();
    window.addEventListener('resize', apply, { passive: true });
    window.addEventListener('scroll', apply, { passive: true });
    window.visualViewport?.addEventListener('resize', apply, { passive: true });
    window.visualViewport?.addEventListener('scroll', apply, { passive: true });
    /* The keyboard comes and goes with the focus. */
    document.addEventListener('focusin', apply);
    document.addEventListener('focusout', apply);

    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('scroll', apply);
      window.visualViewport?.removeEventListener('resize', apply);
      window.visualViewport?.removeEventListener('scroll', apply);
      document.removeEventListener('focusin', apply);
      document.removeEventListener('focusout', apply);
      root.style.removeProperty('--map-canvas-height');
      root.style.removeProperty('--map-runtime-bar-overhang');
      root.style.removeProperty('--map-visual-offset-top');
    };
  }, [isActive]);

  useLayoutEffect(() => {
    if (sheetView !== 'detail') return;
    if (!isSheetViewport()) return;
    if (isPhoneViewport()) {
      /* In-flow detail takeover: ein frisch GEÖFFNETES Detail startet oben im
         fensterscrollenden Dokument. Snap state is meaningless here — the hook
         is inert (SheetConfig.inflow).

         Ein Blätterschritt (prev/next, geklickt oder gewischt) tut das
         ausdrücklich nicht: er kommt ohne Snap-Wunsch an, und ein Sprung auf 0
         parkt den Leser wieder auf der Karte über dem Sheet — nach jedem
         Nachbarn müsste er sich erst wieder herunterscrollen. Das Fenster
         bleibt deshalb stehen, wie es die Tablet-Fassung darunter seit jeher
         hält. */
      const opened = pendingDetailSnapRef.current !== null;
      pendingDetailSnapRef.current = null;
      const keepTop = detailOpenTopRef.current;
      detailOpenTopRef.current = null;
      if (!opened) return;
      /* A spot opened while the sheet was pulled down to its lowest stop
         (another pin tapped from a detail): its photo, name and district
         belong on screen, not 24px of it. The jump below cannot do that
         alone — at scroll 0 already, it fires no scroll. */
      dropLowered();
      /* A restaurant opened from the list starts at the list's height; its
         top edge can not sit lower than at scroll 0, its resting stop. The
         must-eat takeover has no map behind it and always starts at 0. The
         phone fly below measures the sheet after this jump. */
      const sheet = selectedMustEat?._id ? null : sheetElRef.current;
      if (keepTop == null || !sheet) {
        /* Instant: html scrolls smooth, and a spot picked in the search
           from deep inside another detail closes the search in the same
           render — its keyboard hold (MapSectionBody) reads scrollY right
           after this and put the old depth back while the smooth scroll had
           barely started. The new spot opened in the middle of its text
           (user, 29.09.2026). */
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }
      const restTop = sheet.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, Math.round(restTop - keepTop)), behavior: 'instant' });
      return;
    }
    const requested = pendingDetailSnapRef.current;
    pendingDetailSnapRef.current = null;
    /* No explicit request = pager-driven selection swap → keep the user's
       position: stay at the middle stage when paging from there, stay at
       full when paging from full. ('mid' can only be a transient leftover
       from the list view — normalize it to full like before.) */
    const target = requested ?? (snapRef.current === 'peek' ? 'peek' : 'full');
    setSnap(target);
    reapplySnap(target);
  }, [sheetView, selectedRestaurant?._id, selectedMustEat?._id, setSnap, reapplySnap, sheetElRef]);

  const panelHiddenBeforeDetailRef = useRef(false);
  const { focusId: listFocusId, remember: rememberListReturn, returnToRow, getOrigin: getDetailOrigin } = useMapListReturn({
    sheetView,
    initialDetail: Boolean(initialRestaurant),
    sheetElRef,
    contentRef,
    filterKey: JSON.stringify([category, bezirk, price, openOnly, search]),
    listCenter,
    history: { detailEntryPushedRef, detailClosedBySearchRef, listAnchorPendingRef },
    scrollToAnchor: scrollListToAnchor,
  });

  const restaurantMustEats = useMemo(() => {
    if (!selectedRestaurant) return [];
    return mustEats.filter((m) => m.restaurant._id === selectedRestaurant._id);
  }, [mustEats, selectedRestaurant]);

  const primaryMustEats = useMemo(
    () => buildPeekMustEatMap(mustEats, unlockedIds),
    [mustEats, unlockedIds]
  );

  /* ---------- Handlers ---------- */
  const {
    flyToSpot,
    getFlyPadding,
    getFlyPaddingRef,
    initialCamera,
    detailFlyPadding,
    pinTapFlyPadding,
    phoneDetailFlyPadding,
    rememberCamera,
    handBackCamera,
  } = useMapCamera({
    isActive,
    mapRef,
    snap,
    sheetView,
    sheetElRef,
    desktopPanelHiddenRef,
    selectedRestaurant,
    initialRestaurantId: initialRestaurant?._id,
  });

  const { locate: handleLocateMe, userInteractedRef, stopFollowing } = useMapLocationFollow({
    isActive,
    detailId: selectedRestaurant?._id ?? selectedMustEat?._id ?? null,
    geolocation,
    mapRef,
    camera: { flyToSpot, getFlyPadding, getFlyPaddingRef },
  });

  /* A detail opening over the list: note where it came from, so closing it
     can hand back exactly that — the list at the tapped row (its scroll
     offset, and where on screen the row sat), or the map with the camera the
     marker tap interrupted, and the desktop panel folded as it was. Read
     before the view switches and the list's content element unmounts. Phones
     scroll the window (in-flow list), tablets and desktop the panel's port.
     `rowId` is the row the detail belongs to; null when there is none to come
     back to (a marker tap). */
  const rememberListOrigin = useCallback(
    (origin: DetailOrigin, rowId: string | null) => {
      panelHiddenBeforeDetailRef.current = desktopPanelHidden;
      rememberCamera(origin === 'map');
      rememberListReturn(origin, rowId);
    },
    [desktopPanelHidden, rememberCamera, rememberListReturn]
  );

  const handleRestaurantClick = useCallback(
    (r: MapRestaurant, origin: DetailOrigin = 'list') => {
      if (mapTapOnlyDismisses(origin)) {
        collapseSheetToPeek();
        return false;
      }
      userInteractedRef.current = true;
      /* A marker tap is the user pointing at the map: from here on the list
         follows it, and the camera's return flight on close is the move that
         first sorts it around the spot (see handleMapMoveEnd). */
      if (origin === 'map') listFollowsMapRef.current = true;
      if (sheetView === 'list') {
        rememberListOrigin(origin, origin === 'list' ? r._id : null);
        /* Deep in the list its top edge is far above the screen; the sticky
           bar then stands at the strip line, and so shall the detail's. */
        const sheet = sheetElRef.current;
        detailOpenTopRef.current =
          sheet && isPhoneViewport()
            ? Math.max(mapStripLine(), sheet.getBoundingClientRect().top)
            : null;
      }
      setDesktopPanelHidden(false);
      trackEvent('restaurant_opened', {
        restaurant_id: r._id,
        restaurant_slug: r.slug,
        origin,
      });
      // Kick off the detail-field fetch now so it's usually cached by the time
      // the sheet finishes opening (the map payload no longer carries them).
      // Locked spots need it too since 2026-08-23: their sheet opens with the
      // spot's own shortDescription above the offer.
      prefetchRestaurantDetail(r.slug);
      const isMobile = isSheetViewport();
      const isPhone = isPhoneViewport();
      // Selecting a search result implicitly accepts it — clear the query so
      // when the user later goes back to "alle Must Eats" or the list, they
      // see the full data set, not the still-filtered subset.
      setSearch('');
      setSearchOpen(false);
      setSelectedRestaurant(r);
      setSelectedMustEat(null);
      /* Apply the detail's padding before the detail renders, so MapLibre
         never eases from the list padding into it. */
      if (isPhone) mapRef.current?.jumpTo({ padding: phoneDetailFlyPadding() });
      // Both mobile sheet AND desktop sidebar render the detail inline now —
      // desktop no longer uses a centered floating modal that hid the marker.
      setSheetView('detail');
      // List/search/deep-link → open fully (the user clicked to read content).
      // Pin-tap on the map → open at the middle stage (the photo) so the
      // map context stays visible; pull up for the full detail.
      const openAtPeek = isMobile && origin === 'map';
      const target = openAtPeek ? 'peek' : 'full';
      pendingDetailSnapRef.current = target;
      setSnap(target);
      /* Phones fly in the layout effect above, after the canvas has its real
         compact height. Larger viewports do not resize the map on open. */
      if (!isPhone) {
        flyToSpot(r, {
          duration: 500,
          padding: openAtPeek
            ? pinTapFlyPadding()
            : getFlyPadding(isMobile ? 'full' : undefined),
        });
      }
      return true;
    },
    [mapTapOnlyDismisses, userInteractedRef, sheetView, setDesktopPanelHidden, setSearch, setSelectedRestaurant, setSelectedMustEat, phoneDetailFlyPadding, setSheetView, setSnap, collapseSheetToPeek, rememberListOrigin, sheetElRef, flyToSpot, pinTapFlyPadding, getFlyPadding]
  );

  /* In welche Richtung zuletzt geblättert wurde — dorthin lädt der Effekt
     unter den Pager-Handlern die nächste Kachel vor. */
  const pageDirRef = useRef<'prev' | 'next'>('next');

  const handlePageMustEat = useCallback(
    (dir: 'prev' | 'next') => {
      const target = dir === 'prev' ? mustEatPagerAdjacent.prev : mustEatPagerAdjacent.next;
      if (!target) return;
      pageDirRef.current = dir;
      userInteractedRef.current = true;
      trackEvent('must_eat_opened', {
        must_eat_id: target._id,
        restaurant_id: target.restaurant._id,
        origin: 'pager',
        direction: dir,
        unlocked: unlockedIds.has(target._id),
      });
      setSelectedMustEat(target);
      flyToSpot(target.restaurant, { duration: 400, padding: detailFlyPadding() });
      const sc = document.querySelector('[data-detail-scroll]');
      if (sc) (sc as HTMLElement).scrollTop = 0;
    },
    [mustEatPagerAdjacent.prev, mustEatPagerAdjacent.next, userInteractedRef, unlockedIds, setSelectedMustEat, flyToSpot, detailFlyPadding]
  );

  /* Solange ein Must-Eat-Detail offen ist, liegt die Kachel des nächsten
     Spots in Blätterrichtung schon im Cache, wenn die Kamera dort ankommt
     (lib/map/tilePreload.ts). Erst wenn die Karte ruht: sonst stünde das
     Vorladen in der Leitung neben den Kacheln, auf die gerade jemand wartet.
     Gepollt wird, weil die Karte beim Öffnen per Link noch nicht steht. */
  useEffect(() => {
    const ahead = <T,>(adj: { prev: T | null; next: T | null }) =>
      pageDirRef.current === 'prev' ? adj.prev : adj.next;
    const spot = selectedMustEat ? (ahead(mustEatPagerAdjacent)?.restaurant ?? null) : null;
    if (!spot) return;
    let unwatch = () => {};
    const cancelPoll = pollUntilMapReady({
      mapRef,
      onReady: (ref) => {
        const map = ref.getMap();
        const run = () => preloadSpotTiles(basemapTileTemplate(map), spot);
        if (map.loaded() && !map.isMoving()) return run();
        map.once('idle', run);
        unwatch = () => map.off('idle', run);
      },
    });
    return () => {
      cancelPoll();
      unwatch();
    };
  }, [selectedMustEat, mustEatPagerAdjacent]);

  const handleMustEatClick = useCallback(
    (m: MapMustEat) => {
      userInteractedRef.current = true;
      setDesktopPanelHidden(false);
      trackEvent('must_eat_opened', {
        must_eat_id: m._id,
        restaurant_id: m.restaurant._id,
        origin: selectedRestaurant ? 'restaurant_detail' : 'map',
        unlocked: unlockedIds.has(m._id),
      });
      const isMobile = isSheetViewport();
      /* A must-eat opens from a list row's peek — closing it lands on the
         row of the restaurant the dish belongs to. */
      if (sheetView === 'list') rememberListOrigin('list', m.restaurant._id);
      // Selecting a search result accepts it — clear the query so the list
      // shows the full result set again when the user returns to it.
      setSearch('');
      setSearchOpen(false);
      // Coming from a restaurant detail (mobile sheet OR desktop panel), the
      // must-eat detail takes its place; otherwise it opens over the list.
      // Either way: open it and fly to the must-eat.
      if (selectedRestaurant) setSelectedRestaurant(null);
      setSelectedMustEat(m);
      setSheetView('detail');
      // Must-Eat-Detail Mobile = viewport-füllend → immer full snap.
      pendingDetailSnapRef.current = 'full';
      if (isMobile) setSnap('full');
      flyToSpot(m.restaurant, { duration: 500, padding: detailFlyPadding() });
    },
    [userInteractedRef, setDesktopPanelHidden, selectedRestaurant, unlockedIds, sheetView, rememberListOrigin, setSearch, setSelectedRestaurant, setSelectedMustEat, setSheetView, setSnap, flyToSpot, detailFlyPadding]
  );

  const handleRestaurantClose = useCallback(() => {
    const r = selectedRestaurant;
    setSelectedRestaurant(null);
    /* Where the list should come back to: the row of the spot being closed —
       when it was opened FROM a row. A marker tap hands the map back instead,
       and a focus row there only made the list render every row down to the
       spot (88 of 88 for a Kreuzberg pin) without ever scrolling to it. */
    returnToRow(r?._id ?? null);
    setSheetView('list');
    if (getDetailOrigin() === 'map') {
      /* Opened from a marker: hand the MAP back, as it was. The list drops to
         its resting peek (tablet snap; phones scroll to the map stop in the
         layout effect above), a desktop panel that was folded away folds
         away again, and the camera flies back to where the tap interrupted
         it. Without the saved camera (map not ready at the tap) the spot
         itself is the next best centre. */
      const isPhone = isPhoneViewport();
      const nextSnap: typeof snap = isPhone ? 'mid' : 'peek';
      if (nextSnap !== snap) setSnap(nextSnap);
      if (!isPhone) reapplySnap(nextSnap);
      setDesktopPanelHidden(panelHiddenBeforeDetailRef.current);
      handBackCamera(r, nextSnap, isPhone);
      return;
    }
    // If the user pushed the detail down to peek before tapping X, snap the
    // list back to 'mid' so the result set is actually readable. 'full' and
    // 'mid' are preserved as deliberate user positions. PHONES: the snap
    // state is meaningless in the window-scrolled list — reset it to 'mid'
    // so a stale 'full' from the detail can't leave the full-snap UI state active
    // (it slides the burger/search off and pins the status toast to the
    // viewport bottom over the rows).
    const nextSnap: typeof snap = isPhoneViewport() ? 'mid' : snap === 'peek' ? 'mid' : snap;
    if (nextSnap !== snap) setSnap(nextSnap);
    if (r) {
      flyToSpot(r, {
        duration: 350,
        padding: getFlyPadding(nextSnap),
        eventData: ROW_RETURN_FLIGHT,
      });
    }
  }, [selectedRestaurant, setSelectedRestaurant, returnToRow, setSheetView, getDetailOrigin, snap, setSnap, reapplySnap, setDesktopPanelHidden, handBackCamera, flyToSpot, getFlyPadding]);

  const handleViewRestaurantFromMustEat = useCallback(() => {
    if (!selectedMustEat) return;
    const restaurant = restaurants.find((r) => r._id === selectedMustEat.restaurant._id);
    if (!restaurant) return;
    setSelectedMustEat(null);
    handleRestaurantClick(restaurant);
  }, [selectedMustEat, setSelectedMustEat, restaurants, handleRestaurantClick]);

  const handleMustEatClose = useCallback(() => {
    const m = selectedMustEat;
    setSelectedMustEat(null);
    // If we were stacked on a restaurant detail, fall back to it instead of the list.
    if (selectedRestaurant) {
      flyToSpot(selectedRestaurant, { duration: 400, padding: getFlyPadding() });
      return;
    }
    // Closing a must-eat detail (reached from a restaurant detail or deep
    // link) puts the user back on the restaurants list — at the row of the
    // restaurant the dish belongs to, which is the only spot on screen the
    // must-eat was ever about. Unless the chain began at a marker: then the
    // map comes back and no row is the target (see handleRestaurantClose).
    returnToRow(m?.restaurant._id ?? null);
    setSheetView('list');
    // Same nudge as handleRestaurantClose: peek → mid so the list is usable;
    // phones always reset (stale 'full' would keep the full-snap UI state active).
    const nextSnap: typeof snap = isPhoneViewport() ? 'mid' : snap === 'peek' ? 'mid' : snap;
    if (nextSnap !== snap) setSnap(nextSnap);
    if (m) {
      flyToSpot(m.restaurant, {
        duration: 350,
        padding: getFlyPadding(nextSnap),
        // Back at a row, the list keeps its order; a marker chain hands the map back.
        eventData: getDetailOrigin() === 'map' ? undefined : ROW_RETURN_FLIGHT,
      });
    }
  }, [selectedMustEat, setSelectedMustEat, selectedRestaurant, returnToRow, setSheetView, snap, setSnap, flyToSpot, getFlyPadding, getDetailOrigin]);

  // Point the sheet's swipe-down-dismiss at the right close handler for
  // whichever detail is open (must-eat stacked on a restaurant, or plain).
  useEffect(() => {
    dismissDetailRef.current = () => {
      if (selectedMustEat) handleMustEatClose();
      else handleRestaurantClose();
    };
  }, [selectedMustEat, handleMustEatClose, handleRestaurantClose]);

  detailOpenersRef.current = {
    restaurant: (r) => handleRestaurantClick(r),
    mustEat: handleMustEatClick,
  };

  /* The camera came to rest. Decide whether the list re-anchors to where the
     map now looks — a user gesture always does, a flight only once the list
     follows and only while the list is what the sheet shows. The same centre
     twice is not a change: MapLibre reports the last frame of a flight with
     float noise, and every new centre costs a list render. */
  const handleMapMoveEnd = useCallback((e: ViewStateChangeEvent) => {
    const userGesture = e.originalEvent != null;
    if (userGesture) {
      userInteractedRef.current = true;
      stopFollowing();
    }
    const follows = listFollowsMove({
      userGesture,
      following: listFollowsMapRef.current,
      detailOpen: sheetViewRef.current === 'detail',
      rowReturn: isRowReturnFlight(e),
    });
    if (!follows) return;
    listFollowsMapRef.current = true;
    const next = { lat: e.viewState.latitude, lng: e.viewState.longitude };
    setListCenter((prev) => (sameCenter(prev, next) ? prev : next));
  }, [stopFollowing, userInteractedRef]);

  const handleMapClick = useCallback(() => {
    const isMobile = isSheetViewport();
    if (!isMobile) return;
    /* Tap on the map = collapse whatever sheet is currently open to peek so
       the map gets the focus. For a detail view, peek shows name + 3 round
       icons; for the list, peek shows the count + filter strip. The detail
       selection itself is preserved — the user can drag the sheet back up
       to keep reading without re-opening anything. */
    collapseSheetToPeek();
  }, [collapseSheetToPeek]);

  /* Opening search moves NOTHING. It used to surface the list — an instant
     ~204px window scroll on phones, a peek→mid snap on tablets — on the
     reasoning that typing into a hidden result list is worse than a jump.
     Removed 2026-07-29 on the user's call: with the search field no longer
     leaving the viewport (see --map-visual-offset-top), the jump stopped being
     masked by the bigger bug and just reads as the page lurching under your
     thumb. Per-keystroke scrolling had already been removed earlier and must
     stay gone.

     The desktop panel is the one thing still revealed: it IS the result list
     there, so searching with it collapsed would filter into something the user
     cannot see at all. That is not the list moving. */
  const revealPanelForSearch = useCallback(() => {
    if (sheetView !== 'list') return;
    setDesktopPanelHidden(false);
  }, [sheetView, setDesktopPanelHidden]);

  const handleSearchChange = useCallback(
    (v: string) => {
      setSearch(v);
      /* Suchen heißt "zeig mir Treffer". Stand eine Detailansicht offen, blieb
         sie stehen und die gefilterte Liste lag unsichtbar darunter: wer im
         Restaurant-Detail auf Suchen tippte und "Pizza" eingab, sah weiter
         dasselbe Restaurant. Das Suchfeld sitzt im Kopf der Sheet und ist auch
         im Detail bedienbar — also muss die Eingabe die Sheet zurückholen.
         Leeren lässt die Ansicht in Ruhe: das ist Aufräumen, keine Suche. */
      if (!v.trim() || sheetView === 'list') return;
      detailClosedBySearchRef.current = true;
      setSelectedMustEat(null);
      setSelectedRestaurant(null);
      setSheetView('list');
      setDesktopPanelHidden(false);
      // Wie beim Schließen des Details: eine heruntergezogene Sheet zurück auf
      // 'mid', sonst liegt das Ergebnis unter der Kante.
      const nextSnap: typeof snap = isPhoneViewport() ? 'mid' : snap === 'peek' ? 'mid' : snap;
      if (nextSnap !== snap) setSnap(nextSnap);
    },
    [
      setDesktopPanelHidden,
      setSearch,
      sheetView,
      setSheetView,
      snap,
      setSnap,
      detailClosedBySearchRef,
      setSelectedMustEat,
      setSelectedRestaurant,
    ]
  );

  const handleSearchOpen = useCallback(() => {
    setSearchOpen(true);
    revealPanelForSearch();
  }, [revealPanelForSearch]);

  /* Bezirk is the one chip with extra work on top of setting state: it lifts a
     collapsed list so the results are actually in view.

     It used to fly the camera here as well — onto the district's centroid at
     zoom 13, from an index of averaged coordinates kept for that one purpose.
     That flight never finished. Setting the state re-runs the filter-refit
     effect below one commit later, and its `fitBounds` cancels whatever is in
     the air; the centroid index has been dead weight ever since. One camera
     owner is enough, and fitting the actual matches beats an average of them. */
  /* A picked filter shows its result set: the list comes up to 'mid' if it is
     resting lower than that. Until 03.09.2026 only the Bezirk chip did this —
     after "Pizza" the map flew to the matches while the list stayed peeking at
     the bottom with one cropped row, and nothing said there were 33 of them.
     A list already higher than 'mid' stays where the user put it. */
  const revealListForFilter = useCallback(() => {
    if (sheetView !== 'list') return;
    if (isPhoneViewport()) {
      const el = sheetElRef.current;
      if (
        el &&
        window.innerHeight - el.getBoundingClientRect().top < phoneListMidVisiblePx(window.innerHeight)
      ) {
        scrollListToAnchor('mid');
      }
      return;
    }
    if (snapRef.current === 'peek') setSnap('mid');
  }, [sheetView, setSnap, sheetElRef, scrollListToAnchor]);

  const handleBezirkChange = useCallback(
    (name: string | null) => {
      userInteractedRef.current = true;
      setBezirk(name);
      revealListForFilter();
    },
    [userInteractedRef, setBezirk, revealListForFilter]
  );
  const handleCategoryChange = useCallback(
    (c: MapCategory) => {
      userInteractedRef.current = true;
      setCategory(c);
      /* 'All' is a reset, not a result set worth surfacing. */
      if (c !== 'All') revealListForFilter();
    },
    [userInteractedRef, setCategory, revealListForFilter]
  );
  const handlePriceChange = useCallback(
    (id: string | null) => {
      userInteractedRef.current = true;
      setPrice(id);
      if (id !== null) revealListForFilter();
    },
    [userInteractedRef, setPrice, revealListForFilter]
  );
  const handleOpenOnlyChange = useCallback(
    (v: boolean) => {
      userInteractedRef.current = true;
      setOpenOnly(v);
      if (v) revealListForFilter();
    },
    [userInteractedRef, setOpenOnly, revealListForFilter]
  );

  const handleUnlock = useCallback(async () => {
    if (!selectedMustEat) return false;
    const full = await reveal(selectedMustEat._id);
    if (!full) return false;
    setSelectedMustEat(full);
    return true;
  }, [selectedMustEat, setSelectedMustEat, reveal]);

  /* Move the camera onto a match set. Shared by the structured-filter refit
     and the search refit below. */
  const fitCameraToSpots = useCallback(
    (list: MapRestaurant[]) => {
      const map = mapRef.current;
      if (!map) return;
      /* Closing a phone detail expands the CSS container from the compact peek
         back to 100dvh. Resize synchronously before applying list padding;
         MapLibre's ResizeObserver otherwise updates one tick later and briefly
         tries to fit the large list bounds into the old 170–215px transform. */
      map.resize();
      // Filter chips can be used while the list covers the map or the picker
      // is restoring document scroll. Fit the result set for the stable phone
      // middle stop, not those transient/fully covered DOM coordinates.
      const padding = getFlyPaddingRef.current(isPhoneViewport() ? 'mid' : undefined);
      flyToSpots(map, list, padding, { duration: 500 });
    },
    [getFlyPaddingRef]
  );

  /* Refit the map whenever a structured filter narrows or widens the visible
     set. Without this the user picks "Pizza" → 3 spots in the list but the
     map stays parked on Mitte and they have to manually zoom out to find the
     other two. Search is handled by its own debounced effect below — refitting
     on every keystroke feels jittery. Skip during a detail view so the
     selected pin's centering isn't overridden.

     Free set first: that is what the list renders for a chip filter. But when
     it is EMPTY the locked matches are the only thing drawn, and framing
     nothing would leave the camera on the previous district while the sheet
     says "Keine Spots" — so fall back to them. This is also what makes
     handleBezirkChange safe to strip: a district with no free spots still
     flies somewhere, and it now flies to its actual (locked) spots rather than
     to an averaged centroid. */
  const displayedRestaurantsRef = useRef(displayedRestaurants);
  displayedRestaurantsRef.current = displayedRestaurants;

  /* Asked once by MapCanvas before its first frame: frame the spots on the
     canvas as laid out. mapRef is empty then, so measure the layer the
     canvas fills. */
  const getInitialCamera = useCallback(() => {
    const layer = document.querySelector<HTMLElement>('[data-live-map-layer]');
    if (!layer) return null;
    return initialCamera(displayedRestaurantsRef.current, {
      width: layer.clientWidth,
      height: layer.clientHeight,
    });
  }, [initialCamera]);
  /* The filter set the camera was last fitted to. The effect also re-runs when
     a detail opens or closes (it has to, to skip the open one), and until
     03.09.2026 every CLOSE counted as a filter change: the whole catalogue was
     framed again, Brandenburg-wide, over whatever the close handler had just
     flown to. Only a filter that differs from the last fitted one refits —
     on the change itself, or on close if it changed while a detail was open. */
  const filterKey = `${category}|${bezirk ?? ''}|${price ?? ''}|${openOnly}`;
  const lastFittedFilterKeyRef = useRef(filterKey);
  useEffect(() => {
    if (selectedRestaurant || selectedMustEat) return;
    if (filterKey === lastFittedFilterKeyRef.current) return;
    lastFittedFilterKeyRef.current = filterKey;
    fitCameraToSpots(displayedRestaurantsRef.current);
  }, [filterKey, selectedRestaurant, selectedMustEat, fitCameraToSpots]);

  /* Search refit — ohne ihn stand die Karte still, während die Liste schon die
     Treffer zeigte. Einen DOM-Knoten bekommen nur Pins nahe der aktuellen
     Kamera; wer aus einer Mitte-Ansicht einen Spot in Spandau suchte, sah eine
     leere Karte zu einer gefüllten Liste — der Treffer existierte und war
     unsichtbar.

     Dropping the query refits too, immediately: the camera is parked on
     whatever the search flew to, so without this the map keeps showing one
     corner of the city while the list is back to every spot. Same target the
     structured filters use — die Treffer unter den übrigen Filtern, ohne
     weitere Filter also ganz Berlin.

     Debounced on the way in, not on the way out: typing is a stream of
     intermediate states (the jitter the structured-filter effect avoids by
     excluding search), clearing is one deliberate act and waiting on it just
     reads as lag.

     `hadSearchQueryRef` is what keeps the clear branch from firing on mount,
     where the query is empty because nothing was ever typed. */
  const hadSearchQueryRef = useRef(false);
  useEffect(() => {
    const query = search.trim();
    const hadQuery = hadSearchQueryRef.current;
    hadSearchQueryRef.current = Boolean(query);
    if (selectedRestaurant || selectedMustEat) return;
    if (!query) {
      if (hadQuery) fitCameraToSpots(displayedRestaurantsRef.current);
      return;
    }
    const timer = window.setTimeout(() => {
      fitCameraToSpots(displayedRestaurantsRef.current);
    }, SEARCH_REFIT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [search, selectedRestaurant, selectedMustEat, fitCameraToSpots]);

  /* Scroll keeper — TABLET only (768–1023.98px). There the map page is a
     fixed-height in-flow box (100lvh + 80px apron) whose drag-sheet captures
     every gesture, so the window's ~bar-height scroll range must stay pinned
     at 0 or the toolbar clips. PHONES are the opposite: the list is a
     window-scrolled in-flow document (rows frost through iOS Safari's bottom
     URL bar) — the window MUST scroll freely there; just reset once on entry
     so the map doesn't open half-scrolled from a previous visit. */
  useEffect(() => {
    if (!isActive) return;
    if (!isSheetViewport()) return;
    if (isPhoneViewport()) {
      window.scrollTo(0, 0);
      return;
    }
    const onScroll = () => {
      if (!isSheetViewport() || isPhoneViewport()) return;
      if (window.scrollY !== 0) window.scrollTo({ top: 0, behavior: 'instant' });
    };
    onScroll(); // entering the map with a leftover scroll position
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isActive]);

  // Deep-links: ?r=<slug> opens a restaurant detail; ?bezirk=<slug> also moves
  // the camera onto that district. Both poll mapRef so the camera moves don't
  // no-op before the canvas finishes mounting. The filters themselves belong
  // to useMapFilterUrl below.
  useMapDeepLinks({
    mapRef,
    restaurants,
    mustEats,
    isActive,
    userInteractedRef,
    onRestaurantSlugMatch: handleRestaurantClick,
    onMustEatIdMatch: handleMustEatClick,
    onRestaurantCameraReady: (target) => {
      if (selectedRestaurant?._id !== target._id || sheetView !== 'detail') return;
      flyToSpot(target, { duration: 500, padding: detailFlyPadding() });
    },
    onMustEatCameraReady: (target) => {
      if (selectedMustEat?._id !== target._id || sheetView !== 'detail') return;
      flyToSpot(target.restaurant, { duration: 500, padding: detailFlyPadding() });
    },
    initialRestaurant,
    fitCameraToSpots,
  });

  // The five filters live in the query string, both directions — so a filtered
  // map is shareable, survives a reload, and the back gesture undoes it.
  useMapFilterUrl({
    isActive,
    restaurants,
    category,
    bezirk,
    price,
    search,
    openOnly,
    setCategory,
    setBezirk,
    setPrice,
    setSearch,
    setOpenOnly,
    sheetView,
    setSnap,
  });

  /* ---------- Render ---------- */
  return (
    <MapSectionBody
      isActive={isActive}
      mapRef={mapRef}
      handleRef={handleRef}
      setHeaderRef={setHeaderRef}
      setContentRef={setContentRef}
      setSheetRef={setSheetRef}
      sheetView={sheetView}
      snap={snap}
      dragging={dragging}
      displayedRestaurants={displayedRestaurants}
      getInitialCamera={getInitialCamera}
      listRestaurants={listRestaurants}
      restaurantMustEats={restaurantMustEats}
      selectedRestaurant={selectedRestaurant}
      listFocusId={listFocusId}
      detailOrigin={sheetView === 'detail' ? getDetailOrigin() : 'list'}
      selectedMustEat={selectedMustEat ? mustEats.find(card => card._id === selectedMustEat._id) ?? null : null}
      primaryMustEats={primaryMustEats}
      unlockedIds={unlockedIds}
      revealedMustEatIds={revealedMustEatIds}
      favoriteIds={favoriteIds}
      location={location}
      locationError={locationError}
      uid={uid}
      cardViewerKey={cardViewerKey}
      userTier={userTier}
      mapDataLoading={mapDataLoading}
      mapDataError={mapDataError}
      mapDataHasContent={restaurants.length > 0 || mustEats.length > 0}
      categories={categories}
      category={category}
      setCategory={handleCategoryChange}
      search={search}
      bezirk={bezirk}
      bezirkNames={bezirkNames}
      price={price}
      setPrice={handlePriceChange}
      priceBucketIds={priceBucketIds}
      optionCounts={optionCounts}
      openOnly={openOnly}
      setOpenOnly={handleOpenOnlyChange}
      searchOpen={searchOpen}
      setSearchOpen={setSearchOpen}
      onSearchOpen={handleSearchOpen}
      onMapClick={handleMapClick}
      onMapMoveEnd={handleMapMoveEnd}
      onRestaurantClick={handleRestaurantClick}
      onMustEatClick={handleMustEatClick}
      onLocateMe={handleLocateMe}
      locateLoading={locating}
      onRestaurantClose={handleRestaurantClose}
      onMustEatClose={handleMustEatClose}
      mustEatPagerPrev={mustEatPagerAdjacent.prev}
      mustEatPagerNext={mustEatPagerAdjacent.next}
      mustEatPagerPosition={mustEatPagerPosition}
      mustEatCollection={mustEatCollection}
      onPageMustEat={handlePageMustEat}
      onViewRestaurantFromMustEat={handleViewRestaurantFromMustEat}
      onUnlock={handleUnlock}
      onSearchChange={handleSearchChange}
      suggestSpots={suggest}
      onBezirkChange={handleBezirkChange}
      onToggleFavorite={() => {
        if (selectedRestaurant) toggleFavorite(selectedRestaurant);
      }}
      desktopPanelHidden={desktopPanelHidden}
      onToggleDesktopPanel={() => setDesktopPanelHidden(!desktopPanelHiddenRef.current)}
      onRetryMapData={refetchMapData}
      myLocationAriaLabel={t('map.myLocationAriaLabel') ?? 'My location'}
      restaurantsListAriaLabel={t('map.restaurantsListAriaLabel') ?? 'Restaurants nearby'}
    />
  );
}
