'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { MapRef, ViewStateChangeEvent } from 'react-map-gl/maplibre';
import type { MapRestaurant } from '@/lib/types';
import type { UserLocation } from '@/lib/map';
import MapCanvas from './MapCanvas';
import RestaurantMarker from './RestaurantMarker';
import LockedMarker from './LockedMarker';
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

/* The entire react-map-gl / maplibre-gl surface — the canvas plus every
   marker — lives behind this single component so it can be code-split into
   one lazy chunk (see the `next/dynamic` boundary in MapSectionBody). The
   ~800 KB maplibre-gl bundle + its CSS then load only after /map mounts on
   the client, instead of blocking hydration of the SSR'd list/sheet. */
interface MapCanvasLayerProps {
  mapRef: RefObject<MapRef | null>;
  onMapClick: () => void;
  onMoveEnd: (e: ViewStateChangeEvent) => void;
  displayedRestaurants: MapRestaurant[];
  /** Paywalled spots matching the active filter — drawn as muted dots. */
  displayedLockedRestaurants: MapRestaurant[];
  selectedRestaurant: MapRestaurant | null;
  /** True when the open sheet belongs to a paywalled spot. */
  selectedIsLocked: boolean;
  onRestaurantClick: (r: MapRestaurant) => void;
  onLockedClick: (r: MapRestaurant) => void;
  /** Accessible name for a group of free pins, e.g. "5 Spots …". */
  /** Accessible name for a group of locked dots. */
  /** Der Spot, um den es gerade geht — offene Detailansicht oder offenes
   *  Must Eat. Ist er gesetzt, treten alle anderen Pins zurück, damit auf der
   *  Karte sichtbar bleibt, welcher gemeint ist. `null` heißt: keine
   *  Detailansicht offen, alle Pins stehen gleich. */
  focusedRestaurantId: string | null;
  location: UserLocation | null;
}

export default function MapCanvasLayer({
  mapRef,
  onMapClick,
  onMoveEnd,
  displayedRestaurants,
  displayedLockedRestaurants,
  selectedRestaurant,
  selectedIsLocked,
  onRestaurantClick,
  onLockedClick,
  focusedRestaurantId,
  location,
}: MapCanvasLayerProps) {
  /* `painted` gates the markers, `entering` only decides whether they arrive
     with motion — they are separate because the fallback path should still
     reveal the pins even when the basemap never reported in. */
  const [painted, setPainted] = useState(false);
  const [entering, setEntering] = useState(false);
  const paintedRef = useRef(false);

  const reveal = useCallback(() => {
    if (paintedRef.current) return;
    paintedRef.current = true;
    setPainted(true);
    setEntering(true);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(reveal, FIRST_PAINT_FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, [reveal]);

  useEffect(() => {
    if (!entering) return;
    const id = window.setTimeout(() => setEntering(false), ENTER_WINDOW_MS);
    return () => window.clearTimeout(id);
  }, [entering]);

  const selectedId = selectedRestaurant?._id ?? null;

  /* Steht eine Detailansicht offen, tritt alles zurück, was nicht der Spot
     darin ist. Der Zweck ist nicht Dekoration: sobald 400 gleich helle Pins
     im Bild stehen, ist der eine, um den es geht, nicht mehr zu finden — und
     genau das braucht man, um auf der Karte herumzuschauen, wo er liegt.
     Sichtbar bleiben sie trotzdem, und anklickbar auch; sie sind nur leiser.

     Die Ausnahme zur Opacity-Regel aus CLAUDE.md gilt hier: verboten sind
     Opacity-Fades als Ein- und Ausblend-BEWEGUNG. Das hier ist ein Zustand
     wie ein Hover-State — die Pins verschwinden nicht, sie treten zurück. */
  const isDimmed = useCallback(
    (r: MapRestaurant) => focusedRestaurantId !== null && r._id !== focusedRestaurantId,
    [focusedRestaurantId]
  );

  /* Culling window, refreshed when the camera settles. `null` until the map
     reports in — everything renders then, which is also the fallback if the
     listener never attaches. Kept as plain numbers rather than a LngLatBounds
     so the memos below can compare it by value. */
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const read = () => {
      const b = map.getBounds();
      const padX = (b.getEast() - b.getWest()) * VIEWPORT_MARGIN;
      const padY = (b.getNorth() - b.getSouth()) * VIEWPORT_MARGIN;
      setBounds([
        b.getWest() - padX,
        b.getSouth() - padY,
        b.getEast() + padX,
        b.getNorth() + padY,
      ]);
    };
    read();
    /* `moveend`, not `move`: recomputing per frame of a drag would cost more
       than the markers it saves. */
    map.on('moveend', read);
    return () => {
      map.off('moveend', read);
    };
  }, [mapRef, painted]);

  /* Every spot is its own marker — no grouping — but only the ones near the
     viewport get a DOM node. Production carried 169 markers at the default
     camera before ungrouping; without this the same camera would mount 340.
     The open spot is filtered out here and re-added below, so it always paints
     last and over whatever sits beneath it. */
  const inView = useCallback(
    (r: MapRestaurant) =>
      !bounds ||
      (r.lng >= bounds[0] && r.lng <= bounds[2] && r.lat >= bounds[1] && r.lat <= bounds[3]),
    [bounds]
  );

  const freePins = useMemo(
    () =>
      displayedRestaurants.filter(
        (r) => r._id !== (selectedIsLocked ? null : selectedId) && inView(r)
      ),
    [displayedRestaurants, selectedId, selectedIsLocked, inView]
  );

  const lockedPins = useMemo(
    () =>
      displayedLockedRestaurants.filter(
        (r) => r._id !== (selectedIsLocked ? selectedId : null) && inView(r)
      ),
    [displayedLockedRestaurants, selectedId, selectedIsLocked, inView]
  );

  return (
    <MapCanvas
      ref={mapRef}
      onMapClick={onMapClick}
      onMoveEnd={onMoveEnd}
      onFirstPaint={reveal}
    >
      {/* Die U- und S-Bahnhöfe. Immer an, nicht erst bei offener
          Detailansicht: sie sind auch beim Stöbern die Antwort auf „wo ist
          das?", und ein Netz, das erst beim Auswählen erscheint, müsste bei
          jedem Auswählen neu gelesen werden. */}
      <TransitLayer />
      {/* Locked dots first, so the free pins that follow paint on top and win
          the tap wherever the two overlap. DOM order alone does not hold that
          up, though — a marker appends itself to the canvas container when it
          MOUNTS, so a dot re-created by a zoom crossing lands after pins that
          were already there. .markerRootFree is what actually guarantees the
          band; this order is the first-paint case of the same rule. */}
      {painted &&
        lockedPins.map((restaurant) => (
          <LockedMarker
            key={restaurant._id}
            restaurant={restaurant}
            isDimmed={isDimmed(restaurant)}
            onClick={onLockedClick}
          />
        ))}
      {painted && selectedRestaurant && selectedIsLocked && (
        <LockedMarker
          key={selectedRestaurant._id}
          restaurant={selectedRestaurant}
          isSelected
          onClick={onLockedClick}
        />
      )}
      {painted &&
        freePins.map((restaurant, i) => (
          <RestaurantMarker
            key={restaurant._id}
            restaurant={restaurant}
            isSelected={false}
            isDimmed={isDimmed(restaurant)}
            onClick={onRestaurantClick}
            enterDelayMs={entering ? Math.min(i, ENTER_STAGGER_CAP) * ENTER_STAGGER_MS : null}
          />
        ))}
      {/* The open spot, always its own pin and always last so it paints over
          the group it came out of. It also covers the deep-link case, where
          the selection can sit outside the visible set entirely (an old share
          link) — without it the camera would visibly centre on nothing. */}
      {painted && selectedRestaurant && !selectedIsLocked && (
        <RestaurantMarker
          key={selectedRestaurant._id}
          restaurant={selectedRestaurant}
          isSelected
          onClick={onRestaurantClick}
          enterDelayMs={entering ? 0 : null}
        />
      )}
      {location && <UserLocationMarker location={location} />}
    </MapCanvas>
  );
}
