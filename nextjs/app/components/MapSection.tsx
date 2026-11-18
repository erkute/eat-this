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
import { useMapViewportVars } from '@/lib/map/useMapViewportVars';
import { useMapWindowScrollKeeper } from '@/lib/map/useMapWindowScrollKeeper';
import { useDesktopPanelHidden } from '@/lib/map/useDesktopPanelHidden';
import { useMapCameraRefit } from '@/lib/map/useMapCameraRefit';

interface Props {
  isActive?: boolean;
  initialMapData?: InitialMapData;
  /**
   * Server render time (epoch ms): open spots sort first on server and client
   * alike, so rows do not reshuffle on hydration.
   */
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

  // The sheet's swipe-down dismiss goes through a ref pointed at the right
  // close handler (restaurant vs must-eat).
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

  // Read by the popstate listener, which must not close over a stale sheetView.
  const sheetViewRef = useRef(sheetView);
  sheetViewRef.current = sheetView;

  const scrollListToAnchor = useMapListAnchor(sheetElRef);

  /* Die Sheet aus dem Weg räumen, wie es ein Tipp auf die Karte tut: das Detail
     auf peek, die Telefon-Liste auf ihre Ruhelage. */
  const collapseSheetToPeek = useCallback(() => {
    if (isPhoneViewport() && sheetView === 'list') {
      scrollListToAnchor('peek');
      return;
    }
    /* The phone restaurant detail is window-scrolled; its map stop is scroll 0,
       and the snap below does not move in-flow sheets. */
    if (isPhoneViewport() && sheetElRef.current?.dataset.detailKind === 'restaurant') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (snap !== 'peek') {
      setSnap('peek');
      reapplySnap('peek');
    }
  }, [sheetView, snap, setSnap, reapplySnap, scrollListToAnchor, sheetElRef]);

  /* Bei offenem Detail über der Karte räumt der erste Tipp auf die Karte nur
     weg, auch wenn er einen Pin trifft: Es gibt keinen Vorhang, und ein Wegtipp
     träfe sonst regelmäßig einen fremden Pin. Nur auf Mobil und nur, solange
     die Sheet nicht schon auf peek steht. */
  const mapTapOnlyDismisses = useCallback(
    (origin: DetailOrigin) =>
      origin === 'map' && sheetView === 'detail' && snap !== 'peek' && isSheetViewport(),
    [sheetView, snap]
  );

  /* Where the map is looking once the user has moved it; the list sorts by
     distance to it from then on (lib/map/listCenter.ts). Null until the first
     gesture, so the first paint keeps the curated order. */
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

  const { desktopPanelHidden, desktopPanelHiddenRef, setDesktopPanelHidden } =
    useDesktopPanelHidden();

  const snapRef = useRef(snap);
  snapRef.current = snap;
  /* Snap requested by an open handler (pin tap → 'peek', otherwise 'full').
     Null for paging, which keeps the current position. */
  const pendingDetailSnapRef = useRef<'full' | 'peek' | null>(null);
  /* Phones: where the list's top edge stood when a restaurant was opened from
     it; the detail opens at that height instead of dropping to its resting
     stop. */
  const detailOpenTopRef = useRef<number | null>(null);

  useMapViewportVars(isActive);

  useLayoutEffect(() => {
    if (sheetView !== 'detail') return;
    if (!isSheetViewport()) return;
    if (isPhoneViewport()) {
      /* Ein frisch geöffnetes Detail startet oben im Dokument; ein
         Blätterschritt nicht, sonst parkt jeder Nachbar den Leser wieder auf
         der Karte. */
      const opened = pendingDetailSnapRef.current !== null;
      pendingDetailSnapRef.current = null;
      const keepTop = detailOpenTopRef.current;
      detailOpenTopRef.current = null;
      if (!opened) return;
      /* A spot opened from the lowest stop must show its photo, name and
         district, and at scroll 0 the jump below fires no scroll. */
      dropLowered();
      const sheet = selectedMustEat?._id ? null : sheetElRef.current;
      if (keepTop == null || !sheet) {
        /* Instant, not smooth: the search's keyboard hold reads scrollY right
           after this and would put the old depth back mid-scroll. */
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }
      const restTop = sheet.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, Math.round(restTop - keepTop)), behavior: 'instant' });
      return;
    }
    const requested = pendingDetailSnapRef.current;
    pendingDetailSnapRef.current = null;
    /* Paging keeps the user's position ('mid' is a list leftover and becomes
       'full'). */
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

  /* Note where the detail came from (the tapped row, or the map and its camera,
     and the desktop panel state), so closing hands back exactly that. Read
     before the list unmounts. */
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
      /* A marker tap points at the map: from here on the list follows it. */
      if (origin === 'map') listFollowsMapRef.current = true;
      if (sheetView === 'list') {
        rememberListOrigin(origin, origin === 'list' ? r._id : null);
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
      // Fetch the detail fields now, so they are usually cached when the sheet
      // has opened.
      prefetchRestaurantDetail(r.slug);
      const isMobile = isSheetViewport();
      const isPhone = isPhoneViewport();
      // Picking a result accepts it; clear the query so the list shows
      // everything again later.
      setSearch('');
      setSearchOpen(false);
      setSelectedRestaurant(r);
      setSelectedMustEat(null);
      /* Set the detail padding before render so MapLibre never eases into it. */
      if (isPhone) mapRef.current?.jumpTo({ padding: phoneDetailFlyPadding() });
      setSheetView('detail');
      // A pin tap opens at the middle stage so the map stays in view;
      // everything else opens fully.
      const openAtPeek = isMobile && origin === 'map';
      const target = openAtPeek ? 'peek' : 'full';
      pendingDetailSnapRef.current = target;
      setSnap(target);
      /* Phones fly in the layout effect, once the canvas has its compact
         height. */
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

  /* Lädt die Kachel des nächsten Spots in Blätterrichtung vor
     (lib/map/tilePreload.ts), erst wenn die Karte ruht, um laufende Kacheln
     nicht zu bremsen. */
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
      if (sheetView === 'list') rememberListOrigin('list', m.restaurant._id);
      setSearch('');
      setSearchOpen(false);
      if (selectedRestaurant) setSelectedRestaurant(null);
      setSelectedMustEat(m);
      setSheetView('detail');
      pendingDetailSnapRef.current = 'full';
      if (isMobile) setSnap('full');
      flyToSpot(m.restaurant, { duration: 500, padding: detailFlyPadding() });
    },
    [userInteractedRef, setDesktopPanelHidden, selectedRestaurant, unlockedIds, sheetView, rememberListOrigin, setSearch, setSelectedRestaurant, setSelectedMustEat, setSheetView, setSnap, flyToSpot, detailFlyPadding]
  );

  const handleRestaurantClose = useCallback(() => {
    const r = selectedRestaurant;
    setSelectedRestaurant(null);
    /* Back to the row only when the detail was opened from one; a marker tap
       hands the map back instead. */
    returnToRow(r?._id ?? null);
    setSheetView('list');
    if (getDetailOrigin() === 'map') {
      /* Opened from a marker: hand the map back as it was (resting peek, panel
         fold, camera). Without a saved camera the spot is the centre. */
      const isPhone = isPhoneViewport();
      const nextSnap: typeof snap = isPhone ? 'mid' : 'peek';
      if (nextSnap !== snap) setSnap(nextSnap);
      if (!isPhone) reapplySnap(nextSnap);
      setDesktopPanelHidden(panelHiddenBeforeDetailRef.current);
      handBackCamera(r, nextSnap, isPhone);
      return;
    }
    // A detail pushed down to peek returns the list at 'mid' so it is readable.
    // Phones always reset to 'mid': a stale 'full' would keep the full-snap UI
    // state over the window-scrolled list.
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
    if (selectedRestaurant) {
      flyToSpot(selectedRestaurant, { duration: 400, padding: getFlyPadding() });
      return;
    }
    // Back on the list at the row of the dish's restaurant, unless the chain
    // began at a marker.
    returnToRow(m?.restaurant._id ?? null);
    setSheetView('list');
    const nextSnap: typeof snap = isPhoneViewport() ? 'mid' : snap === 'peek' ? 'mid' : snap;
    if (nextSnap !== snap) setSnap(nextSnap);
    if (m) {
      flyToSpot(m.restaurant, {
        duration: 350,
        padding: getFlyPadding(nextSnap),
        eventData: getDetailOrigin() === 'map' ? undefined : ROW_RETURN_FLIGHT,
      });
    }
  }, [selectedMustEat, setSelectedMustEat, selectedRestaurant, returnToRow, setSheetView, snap, setSnap, flyToSpot, getFlyPadding, getDetailOrigin]);

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

  /* Re-anchor the list where the map now looks: always after a user gesture,
     after a flight only once the list follows. MapLibre ends flights with float
     noise, so the same centre twice is not a change. */
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
    collapseSheetToPeek();
  }, [collapseSheetToPeek]);

  /* Opening search moves nothing; a jump reads as the page lurching under the
     thumb. Only the collapsed desktop panel is revealed, since it is the result
     list there. */
  const revealPanelForSearch = useCallback(() => {
    if (sheetView !== 'list') return;
    setDesktopPanelHidden(false);
  }, [sheetView, setDesktopPanelHidden]);

  const handleSearchChange = useCallback(
    (v: string) => {
      setSearch(v);
      /* Tippen im Detail holt die Liste zurück, sonst läge das Ergebnis
         unsichtbar darunter. Leeren lässt die Ansicht in Ruhe. */
      if (!v.trim() || sheetView === 'list') return;
      detailClosedBySearchRef.current = true;
      setSelectedMustEat(null);
      setSelectedRestaurant(null);
      setSheetView('list');
      setDesktopPanelHidden(false);
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

  /* Bezirk does not fly the camera itself: the filter-refit effect fits the
     actual matches one commit later and would cancel any flight in the air. */
  /* A picked filter brings the list up to 'mid', so the result set is in view. */
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

  const { fitCameraToSpots, getInitialCamera } = useMapCameraRefit({
    mapRef,
    getFlyPaddingRef,
    initialCamera,
    displayedRestaurants,
    filterKey: `${category}|${bezirk ?? ''}|${price ?? ''}|${openOnly}`,
    search,
    detailOpen: Boolean(selectedRestaurant || selectedMustEat),
  });

  useMapWindowScrollKeeper(isActive);

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
