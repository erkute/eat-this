'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import type { PaddingOptions } from 'maplibre-gl';
import type { MapRef } from 'react-map-gl/maplibre';
import type { MapRestaurant } from '@/lib/types';
import type { SheetSnap } from './useBottomSheet';
import { readSafeAreaBottom, type SheetView } from './useMapSheet';
import { estimateDetailMidVisiblePx } from './detailSnap';
import { pollUntilMapReady } from './pollUntilMapReady';
import { DETAIL_PEEK_DVH, LIST_REST_VISIBLE_DVH } from './phoneSheetSnaps';
import { safeAreaInsetTop } from './safeArea';
import { isPhoneViewport, isSheetViewport, isTabletViewport } from './viewport';

/* A pin is a 47x47 card anchored bottom-centre on its coordinate, so it spans
   ~24px either side of the anchor and ~47px above it (MapMarkers.module.css).
   Camera padding is expressed against the ANCHOR, so it has to carry the pin's
   own extent plus whatever chrome sits there:
   - sides: 24px of pin + 10px of air.
   - top:   47px of pin + the 14px-inset, 44px-tall search/burger row + 10px,
            with env(safe-area-inset-top) added by the caller. */
const PIN_SAFE_SIDE = 34;
const PIN_SAFE_TOP = 115;
/* The pin card's height above its anchor (MapMarkers.module.css). */
const PIN_HEIGHT_PX = 47;

type LngLat = { lng: number; lat: number };
type Camera = { center: LngLat; zoom: number; padding?: PaddingOptions };
type FlyOptions = { duration: number; padding?: PaddingOptions; zoom?: number };

interface Options {
  isActive: boolean;
  mapRef: RefObject<MapRef | null>;
  snap: SheetSnap;
  sheetView: SheetView;
  sheetElRef: RefObject<HTMLElement | null>;
  selectedRestaurant: MapRestaurant | null;
  /** The ?r= spot the server already rendered open, if any. */
  initialRestaurantId: string | undefined;
}

/**
 * The map camera around an open detail: how much of the canvas the sheet or
 * panel covers (fly padding), flying to a spot, and the camera a marker tap
 * interrupted — remembered on open, handed back on close.
 *
 * Its effects follow the open detail. They are layout effects with an order
 * that matters: MapSection calls this hook right after its list-return and
 * detail-snap layout effects, because the phone flight measures the sheet
 * AFTER the detail-snap effect has moved the window (pollUntilMapReady calls
 * back synchronously once the map is there).
 */
export function useMapCamera({
  isActive,
  mapRef,
  snap,
  sheetView,
  sheetElRef,
  selectedRestaurant,
  initialRestaurantId: initialCameraRestaurantId,
}: Options) {
  const selectedRestaurantId = selectedRestaurant?._id;
  const selectedRestaurantLng = selectedRestaurant?.lng;
  const selectedRestaurantLat = selectedRestaurant?.lat;

  /* iOS safe-area inset, read once — feeds the pin-tap flyTo padding estimate. */
  const safeAreaBottomRef = useRef<number | null>(null);
  if (safeAreaBottomRef.current === null) {
    safeAreaBottomRef.current = typeof document !== 'undefined' ? readSafeAreaBottom() : 0;
  }

  /* One flight onto one point — every open, page, close and locate lands here. */
  const flyToSpot = useCallback(
    (spot: LngLat, { duration, padding, zoom = 15 }: FlyOptions) => {
      mapRef.current?.flyTo({ center: [spot.lng, spot.lat], zoom, duration, padding });
    },
    [mapRef]
  );

  /* Camera padding for the in-flow phone detail: the visible map is only the
     part of the detail's map strip the sheet leaves uncovered, so the target
     must center vertically inside THAT. Shared by getFlyPadding (pager/late
     flyTos, sheetView already 'detail') and the open-click handlers (whose
     closures still see sheetView 'list').

     Measured from the sheet's real top edge, not assumed at its resting
     stop: paging to the next spot keeps the scroll position, and with the
     sheet pushed halfway up the spot was centred in the whole strip — under
     the sheet (user, 23.09.2026). */
  const phoneDetailFlyPadding = useCallback(() => {
    /* Mirrors --detail-map-peek in MapLayout.module.css. */
    const peek = (DETAIL_PEEK_DVH / 100) * window.innerHeight;
    const canvasH = mapRef.current?.getContainer().clientHeight || peek;
    const sheetTop = document
      .querySelector<HTMLElement>('[data-map-sheet]')
      ?.getBoundingClientRect().top;
    /* How much map is on screen above the sheet. */
    const visible = Math.min(canvasH, sheetTop != null && sheetTop > 0 ? sheetTop : peek);
    /* Where the pin's anchor (its bottom tip) should land: at 60% of the
       visible map, which centres the pin body above it — but never so high
       that the pin, drawn upwards from its anchor, runs off the top. */
    const anchor = Math.min(visible, Math.max(0.6 * visible, PIN_HEIGHT_PX + 8));
    /* The padded area's centre is the anchor: bottom cuts away what the
       sheet covers, top balances it. */
    return {
      top: Math.max(0, Math.round(2 * anchor - visible)),
      bottom: Math.max(0, Math.round(canvasH - visible)),
      left: 20,
      right: 20,
    };
  }, [mapRef]);

  /* Camera a marker-opened detail hands back on close — consumed by the
     effect below once the phone canvas is back to full height. */
  const pendingCameraRestoreRef = useRef<Camera | null>(null);
  useLayoutEffect(() => {
    if (!isActive || sheetView !== 'list') return;
    const camera = pendingCameraRestoreRef.current;
    if (!camera) return;
    pendingCameraRestoreRef.current = null;
    return pollUntilMapReady({
      mapRef,
      onReady: (map) => {
        /* Measure the restored 100dvh canvas first, or the flight is planned
           against the detail strip's transform. */
        map.resize();
        flyToSpot(camera.center, {
          zoom: camera.zoom,
          padding: camera.padding ?? getFlyPaddingRef.current('peek'),
          duration: 350,
        });
      },
    });
  }, [isActive, sheetView, mapRef, flyToSpot]);

  useLayoutEffect(() => {
    if (!isActive || sheetView !== 'detail' || !selectedRestaurantId) return;
    if (selectedRestaurantLng == null || selectedRestaurantLat == null) return;
    if (!isPhoneViewport()) return;

    /* React has now committed the compact detail height. Force MapLibre to
       measure that real canvas before flying; otherwise it keeps the former
       100dvh transform and places the selected pin far below the visible
       peek. Polling also covers a fast tap before the lazy map has mounted. */
    return pollUntilMapReady({
      mapRef,
      onReady: (map) => {
        map.resize();
        flyToSpot(
          { lng: selectedRestaurantLng, lat: selectedRestaurantLat },
          { duration: 400, padding: phoneDetailFlyPadding() }
        );
      },
    });
  }, [
    isActive,
    sheetView,
    selectedRestaurantId,
    selectedRestaurantLng,
    selectedRestaurantLat,
    phoneDetailFlyPadding,
    mapRef,
    flyToSpot,
  ]);

  // We derive the mobile bottom from the snap STATE rather than the DOM
  // CSS variable so flyTo always uses the up-to-date target — reading from
  // the DOM races the sheet's transform/animation tick.
  const getFlyPadding = useCallback(
    (targetSnap?: 'peek' | 'mid' | 'full', visiblePxOverride?: number) => {
      if (typeof window === 'undefined') return { top: 60, bottom: 60, left: 40, right: 40 };
      const isMobile = isSheetViewport();
      if (!isMobile) {
        // Desktop: the map canvas IS the left grid cell — the side panel is
        // outside the canvas. Reserve room at top (toolbar + burger stacked
        // beneath it) and bottom (zoom controls + FAB); horizontal stays
        // symmetric so the marker lands at the column's geometric center.
        return {
          top: PIN_SAFE_TOP,
          bottom: 100,
          left: PIN_SAFE_SIDE,
          right: PIN_SAFE_SIDE,
        };
      }
      // When the caller specifies a target snap, use known pixel heights for
      // that snap (or an explicit visible-height override — the detail middle
      // stage is content-sized, not a fixed constant). Otherwise read the
      // *actual* current sheet height from the CSS var the bottom-sheet hook
      // sets — the only source of truth that handles drag in-progress AND the
      // content-fit detail snap.
      /* In-flow phone list: 'peek' rests at the three-stage sheet's first stop,
         where the list only peeks in at the bottom (LIST_REST_VISIBLE_DVH, see
         phoneSheetSnaps.ts) — not the drag-sheet's 28px pip strip. */
      const phoneListPeek = Math.round(window.innerHeight * (LIST_REST_VISIBLE_DVH / 100));
      const phoneInflowList = isPhoneViewport() && sheetView === 'list';
      /* In-flow phone DETAIL: the only visible map is the top peek strip
         (--detail-map-peek = 50dvh) — center the spot inside that strip,
         not in the drag-sheet-era "upper 42%" band. Applies to pager swaps
         and any flyTo while the detail is open; the open-click itself uses
         phoneDetailFlyPadding() because sheetView is still 'list' in its
         closure at that moment. */
      if (isPhoneViewport() && sheetView === 'detail') {
        return phoneDetailFlyPadding();
      }
      let visible: number;
      if (visiblePxOverride != null) {
        visible = visiblePxOverride;
      } else if (targetSnap) {
        visible =
          targetSnap === 'peek'
            ? phoneInflowList
              ? phoneListPeek
              : 28
            : targetSnap === 'mid'
              ? 440
              : Math.round(window.innerHeight * 0.58);
      } else if (phoneInflowList && sheetElRef.current) {
        // Window-scrolled list: the visible strip is whatever part of the
        // list is on screen — measure it instead of reading the (inert)
        // --sheet-visible-px var.
        visible = Math.max(
          0,
          Math.round(window.innerHeight - sheetElRef.current.getBoundingClientRect().top)
        );
      } else {
        const cssVar = sheetElRef.current?.style.getPropertyValue('--sheet-visible-px');
        const parsed = cssVar ? parseFloat(cssVar) : NaN;
        visible =
          Number.isFinite(parsed) && parsed > 0
            ? parsed
            : snap === 'peek'
              ? 28
              : snap === 'mid'
                ? 440
                : Math.round(window.innerHeight * 0.58);
      }
      // The mobile canvas extends (100lvh − 100dvh) + 80px past the visual
      // viewport (iOS-bar apron, see --map-bar-overhang in MapLayout.module.css).
      // flyTo padding is in CANVAS coordinates, so without this correction the
      // centre lands ~overhang/2 too low on screen. Measure the real container
      // height so lvh/dvh bar states are handled for free.
      const canvasH = mapRef.current?.getContainer().clientHeight ?? window.innerHeight;
      const overhang = Math.max(0, canvasH - window.innerHeight);
      /* MapLibre applies padding to the marker's ANCHOR COORDINATE, but the pin
         is a 47px card drawn bottom-anchored ABOVE that point (see
         MapMarkers.module.css). Padding that only clears the anchor let pins
         hang off the left/right edge and slide under the burger after a filter
         refit, so reserve the pin's own extent on top of the chrome. */
      return {
        top: PIN_SAFE_TOP + safeAreaInsetTop(),
        bottom: Math.round(visible + overhang) + 20,
        left: PIN_SAFE_SIDE,
        right: PIN_SAFE_SIDE,
      };
    },
    [snap, sheetView, sheetElRef, phoneDetailFlyPadding, mapRef]
  );
  const getFlyPaddingRef = useRef(getFlyPadding);
  getFlyPaddingRef.current = getFlyPadding;

  const initialCameraConsumedRef = useRef(false);
  useEffect(() => {
    if (initialCameraConsumedRef.current) return;
    if (!isActive || sheetView !== 'detail' || isPhoneViewport()) return;
    if (!initialCameraRestaurantId || selectedRestaurantId !== initialCameraRestaurantId) return;
    if (selectedRestaurantLng == null || selectedRestaurantLat == null) return;

    /* A server-selected ?r= detail is already open before the client
       deep-link hook runs. Phones are centered by the compact-canvas layout
       effect above; tablets and desktop still need their own bounded wait for
       the lazy MapLibre ref because no click handler ran on this reload. */
    return pollUntilMapReady({
      mapRef,
      onReady: (map) => {
        initialCameraConsumedRef.current = true;
        map.resize();
        flyToSpot(
          { lng: selectedRestaurantLng, lat: selectedRestaurantLat },
          { duration: 400, padding: getFlyPadding(isTabletViewport() ? 'full' : undefined) }
        );
      },
    });
  }, [
    getFlyPadding,
    flyToSpot,
    mapRef,
    initialCameraRestaurantId,
    isActive,
    selectedRestaurantId,
    selectedRestaurantLat,
    selectedRestaurantLng,
    sheetView,
  ]);

  /* The padding an open detail flies with: tablet and phone treat the sheet
     as fully up, the desktop panel sits beside the canvas. */
  const detailFlyPadding = useCallback(
    () => getFlyPadding(isSheetViewport() ? 'full' : undefined),
    [getFlyPadding]
  );

  /* A pin tap opens the detail at its middle stage, whose height depends on
     whether the pager row is there. */
  const pinTapFlyPadding = useCallback(
    (withPager: boolean) =>
      getFlyPadding(
        'peek',
        estimateDetailMidVisiblePx(window.innerWidth, withPager, safeAreaBottomRef.current ?? 0)
      ),
    [getFlyPadding]
  );

  /* The camera a marker tap interrupted, restored when that detail closes. */
  const cameraBeforeDetailRef = useRef<Camera | null>(null);
  /* Padding is part of it: MapLibre's centre is the centre of the padded
     viewport. Anything but a marker tap forgets the camera. */
  const rememberCamera = useCallback(
    (fromMarker: boolean) => {
      const map = fromMarker ? mapRef.current : null;
      cameraBeforeDetailRef.current = map
        ? { center: map.getCenter(), zoom: map.getZoom(), padding: map.getPadding() }
        : null;
    },
    [mapRef]
  );

  /* Closing a marker-opened detail: fly back to where the tap interrupted the
     camera. Without the saved camera (map not ready at the tap) the spot itself
     is the next best centre. */
  const handBackCamera = useCallback(
    (spot: MapRestaurant | null, nextSnap: SheetSnap, isPhone: boolean) => {
      const camera = cameraBeforeDetailRef.current;
      cameraBeforeDetailRef.current = null;
      if (isPhone) {
        /* The phone canvas is still the 50dvh detail strip at this point —
           a flight with the full-height padding on it overshoots to a
           Brandenburg-wide zoom. The layout effect above flies once the
           canvas has its list height back (same choreography as opening). */
        pendingCameraRestoreRef.current = camera ?? (spot ? { center: spot, zoom: 15 } : null);
        return;
      }
      if (!mapRef.current) return;
      if (camera) {
        flyToSpot(camera.center, { zoom: camera.zoom, padding: camera.padding, duration: 350 });
      } else if (spot) {
        flyToSpot(spot, { duration: 350, padding: getFlyPadding(nextSnap) });
      }
    },
    [mapRef, flyToSpot, getFlyPadding]
  );

  return {
    flyToSpot,
    getFlyPadding,
    getFlyPaddingRef,
    detailFlyPadding,
    pinTapFlyPadding,
    phoneDetailFlyPadding,
    rememberCamera,
    handBackCamera,
  };
}
