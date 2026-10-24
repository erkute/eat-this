'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { MapRef, ViewStateChangeEvent } from 'react-map-gl/maplibre';
import type { MapRestaurant } from '@/lib/types';
import type { UserLocation } from '@/lib/map';
import type { InitialCamera } from '@/lib/map/useMapCamera';
import MapCanvas from './MapCanvas';
import RestaurantMarker from './RestaurantMarker';
import UserLocationMarker from './UserLocationMarker';
import TransitLayer from './TransitLayer';

/* The pins are DOM, the basemap is WebGL, and the DOM wins the first frame —
   so on a cold load the yellow markers hung on white until the vector tiles
   arrived, longer still over mobile data. Hold them until MapLibre reports its
   first visually complete rendering, then drop them in.

   Never trust that report to arrive, though: a dead CDN would otherwise leave
   a permanently empty map, which is worse than the thing being fixed. This is
   the ceiling after which the pins show regardless. */
const FIRST_PAINT_FALLBACK_MS = 2500;

/* Entry stagger. Capped so a large unlocked set (premium is ~700 spots) does
   not turn a reveal into a slow cascade — past the cap everything lands
   together. */
const ENTER_STAGGER_MS = 22;
const ENTER_STAGGER_CAP = 14;

/* How long the entering class stays on. Must outlast the animation plus the
   full stagger, and no longer — markers that mount later (a filter change)
   must NOT drop in again, or every chip tap re-animates the whole map. */
const ENTER_WINDOW_MS = 460 + ENTER_STAGGER_MS * ENTER_STAGGER_CAP;

/* Only spots inside the viewport get a DOM marker, grown by this much on each
   side so a pan reveals markers that already exist rather than popping them in.
   0.6 of the viewport in each direction covers a fast flick between `moveend`
   events; the cost of being generous is a few dozen nodes, the cost of being
   tight is visible popping. */
const VIEWPORT_MARGIN = 0.6;

/* Pins wachsen mit dem Zoom und stehen ab Straßenebene fest (Betreiber,
   14.10.2026: weit draußen wirkten sie zu groß, und beim Zoomen änderte sich
   nichts). Über der Stadt überlappen 400 gleich große Pins zu einer Fläche;
   kleiner bleibt jeder einzelne lesbar. Unter PIN_ZOOM_FROM bleibt es bei
   PIN_ZOOM_MIN, ab PIN_ZOOM_TO bei voller Größe — dazwischen linear. Das
   Ergebnis steht als `--map-pin-zoom` am Container und wirkt als CSS-`scale`
   auf .pinLogo (MapMarkers.module.css), nicht über React: ein Render pro
   Zoom-Frame für jeden Marker wäre viel teurer als eine Variable. */
const PIN_ZOOM_FROM = 11;
const PIN_ZOOM_TO = 15;
const PIN_ZOOM_MIN = 0.72;

const pinZoomScale = (zoom: number) => {
  const t = Math.min(Math.max((zoom - PIN_ZOOM_FROM) / (PIN_ZOOM_TO - PIN_ZOOM_FROM), 0), 1);
  return (PIN_ZOOM_MIN + (1 - PIN_ZOOM_MIN) * t).toFixed(2);
};

/* The entire react-map-gl / maplibre-gl surface — the canvas plus every
   marker — lives behind this single component so it can be code-split into
   one lazy chunk (see LazyMapCanvasLayer). The
   ~800 KB maplibre-gl bundle + its CSS then load only after /map mounts on
   the client, instead of blocking hydration of the SSR'd list/sheet. */
interface MapCanvasLayerProps {
  mapRef: RefObject<MapRef | null>;
  getInitialCamera: () => InitialCamera | null;
  onMapClick: () => void;
  onMoveEnd: (e: ViewStateChangeEvent) => void;
  displayedRestaurants: MapRestaurant[];
  selectedRestaurant: MapRestaurant | null;
  onRestaurantClick: (r: MapRestaurant) => void;
  /** Der Spot, um den es gerade geht — offene Detailansicht oder offenes
   *  Must Eat. Sein Pin steht groß und mit Glanz über den anderen, damit auf
   *  der Karte sichtbar bleibt, welcher gemeint ist. `null` heißt: keine
   *  Detailansicht offen, alle Pins stehen gleich. */
  focusedRestaurantId: string | null;
  location: UserLocation | null;
}

export default function MapCanvasLayer({
  mapRef,
  getInitialCamera,
  onMapClick,
  onMoveEnd,
  displayedRestaurants,
  selectedRestaurant,
  onRestaurantClick,
  focusedRestaurantId,
  location,
}: MapCanvasLayerProps) {
  /* `painted` gates the markers, `entering` only decides whether they arrive
     with motion — they are separate because the fallback path should still
     reveal the pins even when the basemap never reported in. */
  const [painted, setPainted] = useState(false);
  const [entering, setEntering] = useState(false);
  const paintedRef = useRef(false);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const readBounds = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const b = map.getBounds();
    const padX = (b.getEast() - b.getWest()) * VIEWPORT_MARGIN;
    const padY = (b.getNorth() - b.getSouth()) * VIEWPORT_MARGIN;
    const next: [number, number, number, number] = [
      b.getWest() - padX,
      b.getSouth() - padY,
      b.getEast() + padX,
      b.getNorth() + padY,
    ];
    setBounds((previous) =>
      previous && next.every((value, index) => value === previous[index]) ? previous : next
    );
  }, [mapRef]);

  const reveal = useCallback(() => {
    if (paintedRef.current) return;
    paintedRef.current = true;
    // Read before revealing: the lazy Map ref does not exist in our mount
    // effect. Revealing first used to mount the entire catalogue, then remove
    // every offscreen marker in a second commit.
    readBounds();
    setPainted(true);
    setEntering(true);
  }, [readBounds]);

  useEffect(() => {
    const id = window.setTimeout(reveal, FIRST_PAINT_FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, [reveal]);

  useEffect(() => {
    if (!entering) return;
    const id = window.setTimeout(() => setEntering(false), ENTER_WINDOW_MS);
    return () => window.clearTimeout(id);
  }, [entering]);

  /* Beim Must-Eat-Detail ist `selectedRestaurant` null, das Gericht gehört
     aber zu einem Spot — der steht dann genauso hervorgehoben. */
  const focusedRestaurant =
    selectedRestaurant ??
    (focusedRestaurantId
      ? displayedRestaurants.find((r) => r._id === focusedRestaurantId) ?? null
      : null);
  const focusedId = focusedRestaurant?._id ?? null;

  /* Refresh the padded window only when the camera settles. The first
     read is batched with reveal, before any markers mount. */
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    readBounds();
    map.on('moveend', readBounds);
    return () => {
      map.off('moveend', readBounds);
    };
  }, [mapRef, painted, readBounds]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const container = map.getContainer();
    let current = '';
    /* Per zoom frame, but only a write when the rounded value moves. */
    const apply = () => {
      const scale = pinZoomScale(map.getZoom());
      if (scale === current) return;
      current = scale;
      container.style.setProperty('--map-pin-zoom', scale);
    };
    apply();
    map.on('zoom', apply);
    return () => {
      map.off('zoom', apply);
    };
  }, [mapRef, painted]);

  /* Every spot is its own marker — no grouping — but only the ones near the
     viewport get a DOM node. Production carried 169 markers at the default
     camera before ungrouping; without this the same camera would mount 340.
     The focused spot is filtered out here and re-added below, so it always
     paints last and over whatever sits beneath it. */
  const inView = useCallback(
    (r: MapRestaurant) =>
      !bounds ||
      (r.lng >= bounds[0] && r.lng <= bounds[2] && r.lat >= bounds[1] && r.lat <= bounds[3]),
    [bounds]
  );

  const pins = useMemo(
    () => displayedRestaurants.filter((r) => r._id !== focusedId && inView(r)),
    [displayedRestaurants, focusedId, inView]
  );

  return (
    <MapCanvas
      ref={mapRef}
      getInitialCamera={getInitialCamera}
      onMapClick={onMapClick}
      onMoveEnd={onMoveEnd}
      onFirstPaint={reveal}
    >
      {/* Die U- und S-Bahnhöfe. Immer an, nicht erst bei offener
          Detailansicht: sie sind auch beim Stöbern die Antwort auf „wo ist
          das?", und ein Netz, das erst beim Auswählen erscheint, müsste bei
          jedem Auswählen neu gelesen werden. */}
      <TransitLayer />
      {painted &&
        pins.map((restaurant, i) => (
          <RestaurantMarker
            key={restaurant._id}
            restaurant={restaurant}
            isSelected={false}
            onClick={onRestaurantClick}
            enterDelayMs={entering ? Math.min(i, ENTER_STAGGER_CAP) * ENTER_STAGGER_MS : null}
          />
        ))}
      {/* The focused spot, always its own pin and always last so it paints
          over its neighbours. It also covers the deep-link case, where the
          selection can sit outside the visible set entirely (an old share
          link) — without it the camera would visibly centre on nothing. */}
      {painted && focusedRestaurant && (
        <RestaurantMarker
          key={focusedRestaurant._id}
          restaurant={focusedRestaurant}
          isSelected
          onClick={onRestaurantClick}
          enterDelayMs={entering ? 0 : null}
        />
      )}
      {location && <UserLocationMarker location={location} />}
    </MapCanvas>
  );
}
