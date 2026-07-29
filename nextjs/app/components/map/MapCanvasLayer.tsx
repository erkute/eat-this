'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type { MapRestaurant } from '@/lib/types';
import type { UserLocation } from '@/lib/map';

import MapCanvas from './MapCanvas';
import RestaurantMarker from './RestaurantMarker';
import UserLocationMarker from './UserLocationMarker';

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

/* The entire react-map-gl / maplibre-gl surface — the canvas plus every
   marker — lives behind this single component so it can be code-split into
   one lazy chunk (see the `next/dynamic` boundary in MapSectionBody). The
   ~800 KB maplibre-gl bundle + its CSS then load only after /map mounts on
   the client, instead of blocking hydration of the SSR'd list/sheet. */
interface MapCanvasLayerProps {
  mapRef: RefObject<MapRef | null>;
  onMapClick: () => void;
  displayedRestaurants: MapRestaurant[];
  selectedRestaurant: MapRestaurant | null;
  onRestaurantClick: (r: MapRestaurant) => void;
  location: UserLocation | null;
}

export default function MapCanvasLayer({
  mapRef,
  onMapClick,
  displayedRestaurants,
  selectedRestaurant,
  onRestaurantClick,
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

  return (
    <MapCanvas ref={mapRef} onMapClick={onMapClick} onFirstPaint={reveal}>
      {painted &&
        displayedRestaurants.map((r, i) => (
          <RestaurantMarker
            key={r._id}
            restaurant={r}
            isSelected={selectedRestaurant?._id === r._id}
            onClick={onRestaurantClick}
            enterDelayMs={entering ? Math.min(i, ENTER_STAGGER_CAP) * ENTER_STAGGER_MS : null}
          />
        ))}
      {/* Deep-Link/Locked-Selektion: der selektierte Spot kann außerhalb
          des sichtbaren Sets liegen (alter Share-Link, locked Preview).
          Immer einen Pin geben — sonst zentriert die Kamera sichtbar
          auf nichts. */}
      {painted &&
        selectedRestaurant &&
        !displayedRestaurants.some((r) => r._id === selectedRestaurant._id) && (
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
