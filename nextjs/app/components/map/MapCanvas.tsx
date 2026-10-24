'use client';
import { forwardRef, useEffect, useState, useSyncExternalStore } from 'react';
import Map, {
  AttributionControl,
  type MapRef,
  type ViewStateChangeEvent,
} from 'react-map-gl/maplibre';
import { currentTheme, subscribeTheme } from '@/lib/theme';
import { BERLIN_VIEW } from '@/lib/map/defaultView';
import type { InitialCamera } from '@/lib/map/useMapCamera';

/* Both generated palettes share sources and layer IDs. MapLibre diffs the
   style in place, preserving camera, markers and transit overlays. */
const serverTheme = () => 'light' as const;

interface MapCanvasProps {
  /** Asked once, on mount: the camera that frames the spots on this canvas.
   *  `null` keeps the Berlin fallback. */
  getInitialCamera?: () => InitialCamera | null;
  onMapClick?: () => void;
  /* Fires once the basemap has actually painted. MapLibre's `load` is defined
     as "all necessary resources downloaded and the first visually complete
     rendering has occurred", which is exactly the moment the markers may show
     without floating on white. `error` counts too: if the style or the tiles
     never arrive, the caller still has to reveal them rather than sit on an
     empty map. */
  onFirstPaint?: () => void;
  /* The camera came to rest. `originalEvent` is set for a user gesture and
     undefined for a flight — the list uses that to decide whether to follow. */
  onMoveEnd?: (e: ViewStateChangeEvent) => void;
  children?: React.ReactNode;
}

const MapCanvas = forwardRef<MapRef, MapCanvasProps>(
  ({ getInitialCamera, onMapClick, onFirstPaint, onMoveEnd, children }, ref) => {
    const theme = useSyncExternalStore(subscribeTheme, currentTheme, serverTheme);
    /* Before the first frame, so the map opens on the spots instead of
       flying there from somewhere else. The canvas container already has its
       size — MapCanvasLayer mounts into the laid-out map wrap. */
    const [initialViewState] = useState(() => ({
      ...BERLIN_VIEW,
      ...getInitialCamera?.(),
    }));
    // Keep automatic MapLibre updates collapsed for the whole mount, not just
    // the first three seconds. The user can still open the sources explicitly.
    useEffect(() => {
      let observer: MutationObserver | null = null;
      let detachClick: (() => void) | undefined;
      const collapseEl = (el: HTMLDetailsElement) => {
        el.open = false;
        el.classList.remove('maplibregl-compact-show');
      };
      const findAndAttach = () => {
        const el = document.querySelector(
          'details.maplibregl-ctrl-attrib.maplibregl-compact'
        ) as HTMLDetailsElement | null;
        if (!el) return false;
        collapseEl(el);
        let openedByUser = false;
        const onClick = (event: MouseEvent) => {
          if (!(event.target instanceof Element) || !event.target.closest('summary')) return;
          // Capture the intent before MapLibre mutates the details element:
          // browsers may deliver mutations between individual click listeners.
          openedByUser = !el.classList.contains('maplibregl-compact-show');
        };
        el.addEventListener('click', onClick, true);
        detachClick = () => el.removeEventListener('click', onClick, true);
        observer = new MutationObserver(() => {
          if (!el.classList.contains('maplibregl-compact-show')) openedByUser = false;
          if (!openedByUser && (el.open || el.classList.contains('maplibregl-compact-show'))) collapseEl(el);
        });
        observer.observe(el, { attributes: true, attributeFilter: ['open', 'class'] });
        return true;
      };
      let tries = 0;
      const id = window.setInterval(() => {
        tries += 1;
        if (findAndAttach() || tries > 30) window.clearInterval(id);
      }, 50);
      return () => {
        window.clearInterval(id);
        observer?.disconnect();
        detachClick?.();
      };
    }, []);

    return (
      <Map
        ref={ref}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={theme === 'dark' ? '/basemap/style-dark.json' : '/basemap/style.json'}
        attributionControl={false}
        onClick={() => onMapClick?.()}
        onMoveEnd={onMoveEnd}
        onLoad={() => onFirstPaint?.()}
        onError={() => onFirstPaint?.()}
        /* Zooming fast in and out left patches of the map black (user,
           23.09.2026). By default MapLibre drops every tile request still in
           flight when a zoom starts, so on a quick pinch the tiles never
           arrived; let them finish. And it keeps only about five zoom levels
           of the viewport's tiles — on a phone ~30 tiles, gone after one
           quick zoom out and back. Eight levels (~48 tiles) keeps them, at a
           memory cost a phone can carry; the tiles themselves sit in the
           HTTP cache for good (OpenFreeMap sends a ten-year max-age). */
        cancelPendingTileRequestsWhileZooming={false}
        maxTileCacheZoomLevels={8}
      >
        <AttributionControl position="bottom-left" compact />
        {children}
      </Map>
    );
  }
);

MapCanvas.displayName = 'MapCanvas';
export default MapCanvas;
