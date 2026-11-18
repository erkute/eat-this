'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import type { PaddingOptions } from 'maplibre-gl';
import type { MapRef } from 'react-map-gl/maplibre';
import type { MapRestaurant } from '@/lib/types';
import type { SheetSnap } from './useBottomSheet';
import { readSafeAreaBottom, type SheetView } from './useMapSheet';
import { estimateDetailMidVisiblePx } from './detailSnap';
import { pollUntilMapReady } from './pollUntilMapReady';
import { DETAIL_PEEK_DVH, LIST_REST_VISIBLE_DVH, phoneListMidVisiblePx } from './phoneSheetSnaps';
import { safeAreaInsetTop } from './safeArea';
import { SHEET_SETTLED_EVENT } from './sheetSlide';
import { isPhoneViewport, isSheetViewport, isTabletViewport, isLandscapePanelViewport } from './viewport';
import { SPOT_SET_MAX_ZOOM } from './cameraFit';
import { BERLIN_VIEW, MAP_BEARING, MAP_PITCH } from './defaultView';
import { medianPoint, pitchedCameraForPoints } from './pitchedFit';

export interface InitialCamera {
  longitude: number;
  latitude: number;
  zoom: number;
  padding: PaddingOptions;
}

/* A pin is a 47x47 card anchored bottom-centre, and camera padding applies to
   the anchor: sides carry 24px of pin plus air, the top the pin's height plus
   the search/burger row (the caller adds the safe area). */
const PIN_SAFE_SIDE = 34;
const PIN_SAFE_TOP = 115;
const PIN_HEIGHT_PX = 47;
const landscapePanelPadding = () => ({ top: PIN_HEIGHT_PX, bottom: 0, left: 20, right: 20 });
export const getUserLocationZoom = () => typeof window === 'undefined' || isSheetViewport() ? 16 : 16.5;
const SPOT_ZOOM = 14;
const desktopSpotZoom = () => typeof window === 'undefined' || isSheetViewport()
  ? SPOT_ZOOM
  : window.innerWidth >= 1920 ? 15.5 : 15;
/* The map never opens further out than city level… */
const INITIAL_MIN_ZOOM = BERLIN_VIEW.zoom;
/* …unless the whole catalogue fits within a quarter step of it (wide desktops). */
const INITIAL_FIT_SLACK = 0.25;
const SHEET_IDLE_MS = 150;

/**
 * Is the open spot's pin out of sight (under the sheet or the search row) after
 * the phone detail sheet moved? Only while there is map below that row; with
 * the sheet up at the strip, the camera leaves the map alone while the detail
 * is read.
 */
export function pinNeedsFollow(anchorY: number, sheetTop: number, safeTop: number): boolean {
  const belowControls = PIN_SAFE_TOP + safeTop;
  if (sheetTop - belowControls < PIN_HEIGHT_PX) return false;
  return anchorY > sheetTop - 8 || anchorY < belowControls;
}

type LngLat = { lng: number; lat: number };
type Camera = { center: LngLat; zoom: number; padding?: PaddingOptions };
type FlyOptions = {
  duration: number;
  padding?: PaddingOptions;
  zoom?: number;
  eventData?: object;
};

interface Options {
  isActive: boolean;
  mapRef: RefObject<MapRef | null>;
  snap: SheetSnap;
  sheetView: SheetView;
  sheetElRef: RefObject<HTMLElement | null>;
  desktopPanelHiddenRef: RefObject<boolean>;
  selectedRestaurant: MapRestaurant | null;
  initialRestaurantId: string | undefined;
}

/**
 * The map camera around an open detail: fly padding, flights, and the camera a
 * marker tap interrupted. Its layout effects must run after MapSection's
 * list-return and detail-snap effects, because the phone flight measures the
 * sheet after the window has moved.
 */
export function useMapCamera({
  isActive,
  mapRef,
  snap,
  sheetView,
  sheetElRef,
  desktopPanelHiddenRef,
  selectedRestaurant,
  initialRestaurantId: initialCameraRestaurantId,
}: Options) {
  const selectedRestaurantId = selectedRestaurant?._id;
  const selectedRestaurantLng = selectedRestaurant?.lng;
  const selectedRestaurantLat = selectedRestaurant?.lat;

  const safeAreaBottomRef = useRef<number | null>(null);
  if (safeAreaBottomRef.current === null) {
    safeAreaBottomRef.current = typeof document !== 'undefined' ? readSafeAreaBottom() : 0;
  }

  const flyToSpot = useCallback(
    (spot: LngLat, { duration, padding, zoom = desktopSpotZoom(), eventData }: FlyOptions) => {
      if (isLandscapePanelViewport()) mapRef.current?.resize();
      mapRef.current?.flyTo({ center: [spot.lng, spot.lat], zoom, duration, padding }, eventData);
    },
    [mapRef]
  );

  /* Phone detail padding: centre the target in the part of the map the sheet
     leaves uncovered, measured from the sheet's real top edge (paging keeps the
     scroll position). */
  const phoneDetailFlyPadding = useCallback(() => {
    if (isLandscapePanelViewport()) return landscapePanelPadding();
    const peek = (DETAIL_PEEK_DVH / 100) * window.innerHeight;
    const canvasH = mapRef.current?.getContainer().clientHeight || peek;
    const sheetTop = document
      .querySelector<HTMLElement>('[data-map-sheet]')
      ?.getBoundingClientRect().top;
    const visible = Math.min(canvasH, sheetTop != null && sheetTop > 0 ? sheetTop : peek);
    /* The pin's tip lands at 60 % of the visible map, but never so high that
       the pin, drawn upwards, runs off the top. */
    const anchor = Math.min(visible, Math.max(0.6 * visible, PIN_HEIGHT_PX + 8));
    return {
      top: Math.max(0, Math.round(2 * anchor - visible)),
      bottom: Math.max(0, Math.round(canvasH - visible)),
      left: 20,
      right: 20,
    };
  }, [mapRef]);

  /* Consumed by the effect below once the phone canvas is back to full height. */
  const pendingCameraRestoreRef = useRef<Camera | null>(null);
  useLayoutEffect(() => {
    if (!isActive || sheetView !== 'list') return;
    const camera = pendingCameraRestoreRef.current;
    if (!camera) return;
    pendingCameraRestoreRef.current = null;
    return pollUntilMapReady({
      mapRef,
      onReady: (map) => {
        /* Measure the restored canvas first, or the flight is planned against
           the detail strip's transform. */
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
    if (!isPhoneViewport() && !isLandscapePanelViewport()) return;

    const centerDetail = () => {
      const map = mapRef.current;
      if (!map) return;
      map.resize();
      flyToSpot(
        { lng: selectedRestaurantLng, lat: selectedRestaurantLat },
        { duration: 400, padding: phoneDetailFlyPadding() }
      );
    };
    const cancelReady = pollUntilMapReady({ mapRef, onReady: centerDetail });
    const landscape = window.matchMedia(
      '(orientation: landscape) and (max-height: 500px) and (min-width: 600px) and (max-width: 1023.98px)'
    );
    let frame = 0;
    const onLayoutChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(centerDetail);
    };
    landscape.addEventListener('change', onLayoutChange);
    return () => {
      cancelReady();
      cancelAnimationFrame(frame);
      landscape.removeEventListener('change', onLayoutChange);
    };
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

  /* Once the phone detail sheet comes to rest after moving, bring the pin back
     into the uncovered map, only if it is out of sight and only if the sheet
     moved (a map the user panned stays put). */
  useEffect(() => {
    if (!isActive || sheetView !== 'detail' || !selectedRestaurantId) return;
    if (selectedRestaurantLng == null || selectedRestaurantLat == null) return;
    if (!isPhoneViewport()) return;
    const sheetTop = () =>
      document.querySelector<HTMLElement>('[data-map-sheet]')?.getBoundingClientRect().top ?? null;
    let lastSheetTop = sheetTop();
    let timer: number | undefined;
    const follow = () => {
      const map = mapRef.current;
      const top = sheetTop();
      if (!map || top == null || map.isMoving()) return;
      const moved = lastSheetTop == null || Math.abs(top - lastSheetTop) >= 4;
      lastSheetTop = top;
      if (!moved) return;
      const tip = map.project([selectedRestaurantLng, selectedRestaurantLat]);
      const canvasTop = map.getContainer().getBoundingClientRect().top;
      if (!pinNeedsFollow(tip.y + canvasTop, top, safeAreaInsetTop())) return;
      map.easeTo({
        center: [selectedRestaurantLng, selectedRestaurantLat],
        padding: phoneDetailFlyPadding(),
        duration: 300,
      });
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(follow, SHEET_IDLE_MS);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener(SHEET_SETTLED_EVENT, schedule);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener(SHEET_SETTLED_EVENT, schedule);
    };
  }, [
    isActive,
    sheetView,
    selectedRestaurantId,
    selectedRestaurantLng,
    selectedRestaurantLat,
    phoneDetailFlyPadding,
    mapRef,
  ]);

  // Bottom padding from the snap state, not the CSS variable, which races the
  // sheet's transform.
  const getFlyPadding = useCallback(
    (targetSnap?: 'peek' | 'mid' | 'full', visiblePxOverride?: number, canvasHeightOverride?: number) => {
      if (typeof window === 'undefined') return { top: 60, bottom: 60, left: 40, right: 40 };
      if (isLandscapePanelViewport()) return landscapePanelPadding();
      const isMobile = isSheetViewport();
      if (!isMobile) {
        // Desktop: the canvas runs under the results panel, so the panel's
        // width is right padding while it is out.
        const panel = desktopPanelHiddenRef.current ? 0 : (sheetElRef.current?.offsetWidth ?? 0);
        return {
          top: PIN_SAFE_TOP,
          bottom: 100,
          left: PIN_SAFE_SIDE,
          right: PIN_SAFE_SIDE + panel,
        };
      }
      const phoneListPeek = Math.round(window.innerHeight * (LIST_REST_VISIBLE_DVH / 100));
      const phoneInflowList = isPhoneViewport() && sheetView === 'list';
      /* Phone detail: centre inside the top strip (--detail-map-peek). The open
         handler itself uses phoneDetailFlyPadding(), since its closure still
         sees sheetView 'list'. */
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
              ? phoneInflowList
                ? phoneListMidVisiblePx(window.innerHeight)
                : 440
              : Math.round(window.innerHeight * 0.58);
      } else if (phoneInflowList && sheetElRef.current) {
        // The window-scrolled list: measure what is on screen.
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
      // The phone canvas extends below the visual viewport (iOS bar apron), and
      // padding is in canvas coordinates; measure the real container height.
      const canvasH =
        canvasHeightOverride ?? mapRef.current?.getContainer().clientHeight ?? window.innerHeight;
      const overhang = Math.max(0, canvasH - window.innerHeight);
      /* MapLibre pads the anchor, but the pin is drawn above it; reserve the
         pin's own extent, or pins hang off the edges after a refit. */
      return {
        top: PIN_SAFE_TOP + safeAreaInsetTop(),
        bottom: Math.round(visible + overhang) + 20,
        left: PIN_SAFE_SIDE,
        right: PIN_SAFE_SIDE,
      };
    },
    [snap, sheetView, sheetElRef, desktopPanelHiddenRef, phoneDetailFlyPadding, mapRef]
  );
  const getFlyPaddingRef = useRef(getFlyPadding);
  getFlyPaddingRef.current = getFlyPadding;

  /* The opening camera: every spot, framed for the canvas as laid out right
     now. Asked by MapCanvas before its first frame, so the canvas is measured
     from the map wrap. Never much further out than city level: on a phone the
     whole catalogue melts into one slab. */
  const initialCamera = useCallback(
    (spots: LngLat[], canvas: { width: number; height: number }): InitialCamera | null => {
      if (!spots.length || canvas.width <= 0 || canvas.height <= 0) return null;
      const padding = getFlyPadding(undefined, undefined, canvas.height);
      const fit = pitchedCameraForPoints(spots, {
        ...canvas,
        padding,
        pitch: MAP_PITCH,
        bearing: MAP_BEARING,
        maxZoom: SPOT_SET_MAX_ZOOM,
      });
      /* If not everything fits near the floor zoom, centre the median spot, not
         the box; one outlier would otherwise pull the view. */
      const middle = medianPoint(spots);
      const minZoom = INITIAL_MIN_ZOOM + (canvas.width >= 1920 ? 0.75 : canvas.width >= 1024 ? 0.5 : 0);
      const camera =
        fit && fit.zoom < minZoom - INITIAL_FIT_SLACK && middle
          ? { center: middle, zoom: minZoom }
          : fit;
      if (!camera) return null;
      return {
        longitude: camera.center.lng,
        latitude: camera.center.lat,
        zoom: camera.zoom,
        padding,
      };
    },
    [getFlyPadding]
  );

  const initialCameraConsumedRef = useRef(false);
  useEffect(() => {
    if (initialCameraConsumedRef.current) return;
    if (!isActive || sheetView !== 'detail' || isPhoneViewport()) return;
    if (!initialCameraRestaurantId || selectedRestaurantId !== initialCameraRestaurantId) return;
    if (selectedRestaurantLng == null || selectedRestaurantLat == null) return;

    /* A server-selected ?r= detail is open before the deep-link hook runs.
       Phones are centred by the layout effect above; tablets and desktop wait
       for the lazy MapLibre ref here. */
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

  const detailFlyPadding = useCallback(
    () => getFlyPadding(isSheetViewport() ? 'full' : undefined),
    [getFlyPadding]
  );

  const pinTapFlyPadding = useCallback(
    () =>
      getFlyPadding(
        'peek',
        estimateDetailMidVisiblePx(window.innerWidth, safeAreaBottomRef.current ?? 0)
      ),
    [getFlyPadding]
  );

  const cameraBeforeDetailRef = useRef<Camera | null>(null);
  /* Padding is part of it: MapLibre's centre is the centre of the padded
     viewport. */
  const rememberCamera = useCallback(
    (fromMarker: boolean) => {
      const map = fromMarker ? mapRef.current : null;
      cameraBeforeDetailRef.current = map
        ? { center: map.getCenter(), zoom: map.getZoom(), padding: map.getPadding() }
        : null;
    },
    [mapRef]
  );

  const handBackCamera = useCallback(
    (spot: MapRestaurant | null, nextSnap: SheetSnap, isPhone: boolean) => {
      const camera = cameraBeforeDetailRef.current;
      cameraBeforeDetailRef.current = null;
      if (isPhone) {
        /* The phone canvas is still the detail strip here; full-height padding
           would overshoot. The layout effect above flies once the canvas is
           back. */
        pendingCameraRestoreRef.current = camera ?? (spot ? { center: spot, zoom: desktopSpotZoom() } : null);
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
    initialCamera,
    detailFlyPadding,
    pinTapFlyPadding,
    phoneDetailFlyPadding,
    rememberCamera,
    handBackCamera,
  };
}
