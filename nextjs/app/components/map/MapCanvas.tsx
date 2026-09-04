'use client';
import { forwardRef, useEffect } from 'react';
import Map, {
  AttributionControl,
  type MapRef,
  type ViewStateChangeEvent,
} from 'react-map-gl/maplibre';

/* Der eigene Style: `public/basemap/style.json` wird von `npm run build:basemap`
   aus CARTOs Dark-Matter-Vorlage erzeugt — entblaut (das Straßennetz stand in
   einem Blauviolett, das zu nichts in der Marke gehört) und von cartocdn.com
   gelöst. Kacheln und Schriften kommen von OpenFreeMap, das Sprite aus dem
   eigenen Haus; die Attribution liefert OpenFreeMaps TileJSON.
   Der Grund des Styles ist #0e0e0e — dieselbe Farbe steht als
   `--map-basemap-ground` hinter dem Canvas, damit der Ladezustand nicht
   aufblitzt. Wer den Style tauscht, zieht die Farbe mit. */
const BASEMAP_STYLE = '/basemap/style.json';

const BERLIN = { longitude: 13.405, latitude: 52.52, zoom: 12 };

interface MapCanvasProps {
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
  ({ onMapClick, onFirstPaint, onMoveEnd, children }, ref) => {
    // MapLibre opens the compact attribution by default on mount. Collapse it
    // so only the small ⓘ button stays visible until the user taps it. Then
    // observe attribute changes for ~3 s after we find the element, undoing
    // any maplibre-internal re-open before user interaction.
    useEffect(() => {
      let observer: MutationObserver | null = null;
      let observerStart = 0;
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
        observerStart = Date.now();
        observer = new MutationObserver(() => {
          if (Date.now() - observerStart > 3000) {
            observer?.disconnect();
            return;
          }
          if (el.open) collapseEl(el);
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
      };
    }, []);

    return (
      <Map
        ref={ref}
        initialViewState={BERLIN}
        style={{ width: '100%', height: '100%' }}
        mapStyle={BASEMAP_STYLE}
        attributionControl={false}
        onClick={() => onMapClick?.()}
        onMoveEnd={onMoveEnd}
        onLoad={() => onFirstPaint?.()}
        onError={() => onFirstPaint?.()}
      >
        <AttributionControl position="bottom-left" compact />
        {children}
      </Map>
    );
  }
);

MapCanvas.displayName = 'MapCanvas';
export default MapCanvas;
