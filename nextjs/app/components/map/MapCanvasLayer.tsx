'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type { MapRestaurant } from '@/lib/types';
import type { UserLocation } from '@/lib/map';
import {
  CLUSTER_MAX_ZOOM,
  FREE_PIN_CLUSTER_RADIUS_PX,
  LOCKED_DOT_CLUSTER_RADIUS_PX,
  clusterExpansionZoom,
  clusterSpots,
  type MarkerGroup,
} from '@/lib/map/clusterMarkers';

import MapCanvas, { INITIAL_ZOOM_LEVEL } from './MapCanvas';
import RestaurantMarker from './RestaurantMarker';
import ClusterMarker from './ClusterMarker';
import LockedMarker from './LockedMarker';
import LockedClusterMarker from './LockedClusterMarker';
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

/* Camera move when a cluster is tapped. `around` rather than `center`: the
   group stays under the finger, so it never slides behind the bottom sheet and
   this file needs to know nothing about the sheet's geometry. MapLibre skips
   the animation itself when the user asked for reduced motion. */
const CLUSTER_EASE_MS = 380;

/* The entire react-map-gl / maplibre-gl surface — the canvas plus every
   marker — lives behind this single component so it can be code-split into
   one lazy chunk (see the `next/dynamic` boundary in MapSectionBody). The
   ~800 KB maplibre-gl bundle + its CSS then load only after /map mounts on
   the client, instead of blocking hydration of the SSR'd list/sheet. */
interface MapCanvasLayerProps {
  mapRef: RefObject<MapRef | null>;
  onMapClick: () => void;
  displayedRestaurants: MapRestaurant[];
  /** Paywalled spots matching the active filter — drawn as muted dots. */
  displayedLockedRestaurants: MapRestaurant[];
  selectedRestaurant: MapRestaurant | null;
  /** True when the open sheet belongs to a paywalled spot. */
  selectedIsLocked: boolean;
  onRestaurantClick: (r: MapRestaurant) => void;
  onLockedClick: (r: MapRestaurant) => void;
  lockedLabel: string;
  /** Accessible name for a group of free pins, e.g. "5 Spots …". */
  clusterLabel: (count: number) => string;
  /** Accessible name for a group of locked dots. */
  lockedClusterLabel: (count: number) => string;
  location: UserLocation | null;
}

export default function MapCanvasLayer({
  mapRef,
  onMapClick,
  displayedRestaurants,
  displayedLockedRestaurants,
  selectedRestaurant,
  selectedIsLocked,
  onRestaurantClick,
  onLockedClick,
  lockedLabel,
  clusterLabel,
  lockedClusterLabel,
  location,
}: MapCanvasLayerProps) {
  /* `painted` gates the markers, `entering` only decides whether they arrive
     with motion — they are separate because the fallback path should still
     reveal the pins even when the basemap never reported in. */
  const [painted, setPainted] = useState(false);
  const [entering, setEntering] = useState(false);
  const paintedRef = useRef(false);

  /* Integer zoom, the granularity clustering runs at. Because the groups are
     built in world-pixel space they depend on the zoom alone — panning cannot
     change them, so the markers keep their old property of not re-rendering
     while the map is dragged. */
  const [zoomLevel, setZoomLevel] = useState(INITIAL_ZOOM_LEVEL);

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

  /* Past the max zoom the radius is 0, which is how clusterSpots is told to
     hand every spot back on its own. */
  const clustering = zoomLevel < CLUSTER_MAX_ZOOM;
  const selectedId = selectedRestaurant?._id ?? null;

  /* The open spot is always drawn as its own marker, never folded into a
     group — a sheet describing a spot the map cannot show is the same dead end
     the deep-link fallback below was written for. */
  const freeGroups = useMemo(
    () =>
      clusterSpots(
        selectedId && !selectedIsLocked
          ? displayedRestaurants.filter((r) => r._id !== selectedId)
          : displayedRestaurants,
        zoomLevel,
        clustering ? FREE_PIN_CLUSTER_RADIUS_PX : 0
      ),
    [displayedRestaurants, selectedId, selectedIsLocked, zoomLevel, clustering]
  );

  const lockedGroups = useMemo(
    () =>
      clusterSpots(
        selectedId && selectedIsLocked
          ? displayedLockedRestaurants.filter((r) => r._id !== selectedId)
          : displayedLockedRestaurants,
        zoomLevel,
        clustering ? LOCKED_DOT_CLUSTER_RADIUS_PX : 0
      ),
    [displayedLockedRestaurants, selectedId, selectedIsLocked, zoomLevel, clustering]
  );

  const expandCluster = useCallback(
    (group: MarkerGroup<MapRestaurant>, radiusPx: number) => {
      const map = mapRef.current;
      if (!map) return;
      map.easeTo({
        around: [group.lng, group.lat],
        zoom: clusterExpansionZoom(group.members, zoomLevel, radiusPx),
        duration: CLUSTER_EASE_MS,
      });
    },
    [mapRef, zoomLevel]
  );

  return (
    <MapCanvas
      ref={mapRef}
      onMapClick={onMapClick}
      onFirstPaint={reveal}
      onZoomLevelChange={setZoomLevel}
    >
      {/* Locked dots first, so the free pins that follow paint on top and win
          the tap wherever the two overlap. DOM order alone does not hold that
          up, though — a marker appends itself to the canvas container when it
          MOUNTS, so a dot re-created by a zoom crossing lands after pins that
          were already there. .markerRootFree is what actually guarantees the
          band; this order is the first-paint case of the same rule. */}
      {painted &&
        lockedGroups.map((group) =>
          group.members.length === 1 ? (
            <LockedMarker
              key={group.key}
              restaurant={group.members[0]}
              onClick={onLockedClick}
              label={lockedLabel}
            />
          ) : (
            <LockedClusterMarker
              key={group.key}
              lat={group.lat}
              lng={group.lng}
              count={group.members.length}
              label={lockedClusterLabel(group.members.length)}
              onClick={() => expandCluster(group, LOCKED_DOT_CLUSTER_RADIUS_PX)}
            />
          )
        )}
      {painted && selectedRestaurant && selectedIsLocked && (
        <LockedMarker
          key={selectedRestaurant._id}
          restaurant={selectedRestaurant}
          isSelected
          onClick={onLockedClick}
          label={lockedLabel}
        />
      )}
      {painted &&
        freeGroups.map((group, i) => {
          const enterDelayMs = entering
            ? Math.min(i, ENTER_STAGGER_CAP) * ENTER_STAGGER_MS
            : null;
          return group.members.length === 1 ? (
            <RestaurantMarker
              key={group.key}
              restaurant={group.members[0]}
              isSelected={false}
              onClick={onRestaurantClick}
              enterDelayMs={enterDelayMs}
            />
          ) : (
            <ClusterMarker
              key={group.key}
              lat={group.lat}
              lng={group.lng}
              count={group.members.length}
              hasMustEat={group.members.some((r) => r.mustEatCount > 0)}
              label={clusterLabel(group.members.length)}
              onClick={() => expandCluster(group, FREE_PIN_CLUSTER_RADIUS_PX)}
              enterDelayMs={enterDelayMs}
            />
          );
        })}
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
