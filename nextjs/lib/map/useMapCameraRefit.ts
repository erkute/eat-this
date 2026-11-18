import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type { MapRestaurant } from '@/lib/types';
import { flyToSpots } from './cameraFit';
import { isPhoneViewport } from './viewport';
import type { useMapCamera } from './useMapCamera';

/* How long the search query has to hold still before the camera follows it.
   Long enough that typing "kreuzberg" flies once rather than once per letter,
   short enough that the move still reads as the answer to what was typed; at
   450 ms the wait reads as lag. */
const SEARCH_REFIT_DELAY_MS = 300;

type Camera = ReturnType<typeof useMapCamera>;

interface Args {
  mapRef: RefObject<MapRef | null>;
  getFlyPaddingRef: Camera['getFlyPaddingRef'];
  initialCamera: Camera['initialCamera'];
  /** The spots the map draws under the current filters. */
  displayedRestaurants: MapRestaurant[];
  /** The structured filters as one string; a change refits the camera. */
  filterKey: string;
  search: string;
  /** A detail is open: its pin keeps the camera, no refit. */
  detailOpen: boolean;
}

/** Moves the camera onto the result set whenever the filters or the search change it. */
export function useMapCameraRefit({
  mapRef,
  getFlyPaddingRef,
  initialCamera,
  displayedRestaurants,
  filterKey,
  search,
  detailOpen,
}: Args) {
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
    [mapRef, getFlyPaddingRef]
  );

  /* Refit the map whenever a structured filter narrows or widens the visible
     set, so a filter never leaves its matches off screen. Search has its own
     debounced effect below; an open detail keeps its pin centred. */
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
     a detail opens or closes (it has to, to skip the open one), but a close is
     not a filter change: refitting there would frame the whole catalogue again
     over whatever the close handler has just flown to. Only a filter that
     differs from the last fitted one refits — on the change itself, or on close
     if it changed while a detail was open. */
  const lastFittedFilterKeyRef = useRef(filterKey);
  useEffect(() => {
    if (detailOpen) return;
    if (filterKey === lastFittedFilterKeyRef.current) return;
    lastFittedFilterKeyRef.current = filterKey;
    fitCameraToSpots(displayedRestaurantsRef.current);
  }, [filterKey, detailOpen, fitCameraToSpots]);

  /* Search refit: pins get a DOM node only near the current camera, so a match
     far from the view would sit invisible next to a filled list.

     Dropping the query refits too, immediately: the camera is parked on
     whatever the search flew to. Same target the structured filters use: the
     matches under the other filters, without filters all of Berlin.

     Debounced on the way in, not on the way out: typing is a stream of
     intermediate states, clearing is one deliberate act.

     `hadSearchQueryRef` keeps the clear branch from firing on mount, where the
     query is empty because nothing was ever typed. */
  const hadSearchQueryRef = useRef(false);
  useEffect(() => {
    const query = search.trim();
    const hadQuery = hadSearchQueryRef.current;
    hadSearchQueryRef.current = Boolean(query);
    if (detailOpen) return;
    if (!query) {
      if (hadQuery) fitCameraToSpots(displayedRestaurantsRef.current);
      return;
    }
    const timer = window.setTimeout(() => {
      fitCameraToSpots(displayedRestaurantsRef.current);
    }, SEARCH_REFIT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [search, detailOpen, fitCameraToSpots]);

  return { fitCameraToSpots, getInitialCamera };
}
