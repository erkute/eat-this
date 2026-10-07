'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { AttributionControl, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapRestaurant } from '@/lib/types';
import RestaurantMarker from './RestaurantMarker';
import TransitLayer from './TransitLayer';
import styles from '../HubMapPreview.module.css';
import HomeMapLoading from '../HomeMapLoading';
import { spreadPreviewPins } from '@/lib/home/mapPreview';

interface Props {
  spots: MapRestaurant[];
  selectedId: string | null;
  onSelect: (spot: MapRestaurant) => void;
  loadingLabel: string;
  unavailableLabel: string;
}
const FIT_OPTIONS = { padding: { top: 64, bottom: 24, left: 36, right: 44 }, maxZoom: 13.5, duration: 0 };
const spotBounds = (spots: MapRestaurant[]): [number, number, number, number] => [
  Math.min(...spots.map((spot) => spot.lng)), Math.min(...spots.map((spot) => spot.lat)),
  Math.max(...spots.map((spot) => spot.lng)), Math.max(...spots.map((spot) => spot.lat)),
];

export default function HomeMapCanvas({ spots, selectedId, onSelect, loadingLabel, unavailableLabel }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [visibleSpots, setVisibleSpots] = useState<MapRestaurant[]>([]);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const bounds = useMemo(() => spotBounds(spots), [spots]);

  // Keep every pin reachable on desktop and phone. Category changes reframe
  // immediately; no automatic camera flights or recurring decorative motion.
  const fit = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    let best = { bounds, spots, count: -1 };
    const minimum = Math.max(4, spots.findIndex((spot) => spot._id === selectedRef.current) + 1);
    // A distant, lower-ranked recommendation can compress all of the best
    // spots into one pin. Compare tighter editorial selections without moving
    // the camera; keep the widest framing when both show the same pin count.
    for (let count = spots.length; count >= Math.min(minimum, spots.length); count--) {
      const candidates = spots.slice(0, count);
      const candidateBounds = spotBounds(candidates);
      const camera = map.cameraForBounds(candidateBounds, FIT_OPTIONS);
      if (!camera) continue;
      const scale = 2 ** ((camera.zoom ?? map.getZoom()) - map.getZoom());
      const pins = spreadPreviewPins(candidates, (spot) => {
        const point = map.project([spot.lng, spot.lat]);
        return { x: point.x * scale, y: point.y * scale };
      }, selectedRef.current);
      if (pins.length > best.count) best = { bounds: candidateBounds, spots: candidates, count: pins.length };
    }
    map.fitBounds(best.bounds, FIT_OPTIONS);
    setVisibleSpots(spreadPreviewPins(best.spots, (spot) => map.project([spot.lng, spot.lat]), selectedRef.current));
  }, [bounds, spots]);
  const loaded = useCallback(() => {
    const map = mapRef.current?.getMap();
    const attribution = map?.getContainer().querySelector<HTMLDetailsElement>('.maplibregl-ctrl-attrib');
    // MapLibre opens compact credits on creation. Collapse before revealing
    // the control, then leave subsequent toggles entirely to the visitor.
    if (attribution) {
      attribution.open = false;
      attribution.classList.remove('maplibregl-compact-show');
      attribution.dataset.initialized = '';
    }
    // This overview cannot zoom. Show the basemap's real district labels at
    // its wider framing, where the full Map normally hides them until zoom 12.
    if (map?.getLayer('place_suburbs')) {
      map.setLayerZoomRange('place_suburbs', 10, 16);
      map.setLayoutProperty('place_suburbs', 'text-size', 11);
      map.setLayoutProperty('place_suburbs', 'text-transform', 'uppercase');
      map.setPaintProperty('place_suburbs', 'text-color', '#b6b4b4');
    }
    setReady(true);
    setFailed(false);
  }, []);
  useEffect(() => {
    if (!ready) return;
    fit();
    const container = mapRef.current?.getContainer();
    if (!container) return;
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [ready, fit]);

  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => setFailed(true), 12000);
    return () => window.clearTimeout(timer);
  }, [ready]);

  return (
    <>
      {!ready && (failed
        ? <p className={styles.mapStatus} role="status">{unavailableLabel}</p>
        : <HomeMapLoading label={loadingLabel} />)}
      <Map
        ref={mapRef}
        initialViewState={{ bounds, fitBoundsOptions: FIT_OPTIONS }}
        mapStyle="/basemap/style.json"
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        interactive={false}
        onLoad={loaded}
        onError={() => { if (!ready) setFailed(true); }}
      >
        <AttributionControl position="bottom-left" compact />
        <TransitLayer />
        {ready && visibleSpots.map((spot) => (
          <RestaurantMarker
            key={spot._id}
            restaurant={spot}
            isSelected={spot._id === selectedId}
            onClick={onSelect}
          />
        ))}
      </Map>
    </>
  );
}
