'use client';
import { memo, useCallback } from 'react';
import { Marker, type MarkerInstance } from 'react-map-gl/maplibre';
import type { MapRestaurant } from '@/lib/types';
import styles from './MapMarkers.module.css';

interface LockedMarkerProps {
  restaurant: MapRestaurant;
  /** The open sheet belongs to this dot — grow it so the tap is visible. */
  isSelected?: boolean;
  onClick: (restaurant: MapRestaurant) => void;
  label: string;
}

/**
 * A paywalled spot, drawn as a small muted dot rather than a pin.
 *
 * Measured at the default camera on a 375px viewport: 15 free spots are in
 * view and 194 locked ones fall in the same box. As 44px pins that is a closed
 * carpet — the free spots would disappear into it, which is the opposite of
 * the point. At ~11px they read as density ("this much is still in there")
 * while the yellow pins stay the only thing that looks tappable-to-a-spot.
 *
 * Tapping one goes to the pack flow, not to a detail sheet: there is nothing
 * to show yet, and the dot's whole job is to say what is behind the paywall.
 */
function LockedMarker({ restaurant, isSelected = false, onClick, label }: LockedMarkerProps) {
  // Same wrapper de-duplication as RestaurantMarker: MapLibre stamps its own
  // role="button" + aria-label on the wrapper after mount, which would
  // announce every dot as two nested buttons.
  const setMarkerRef = useCallback((marker: MarkerInstance | null) => {
    const el = marker?.getElement();
    if (!el) return;
    el.setAttribute('role', 'presentation');
    el.removeAttribute('aria-label');
  }, []);

  return (
    <Marker
      ref={setMarkerRef}
      longitude={restaurant.lng}
      latitude={restaurant.lat}
      anchor="center"
      className={isSelected ? `${styles.markerRoot} ${styles.markerRootActive}` : styles.markerRoot}
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick(restaurant);
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        className={isSelected ? `${styles.pinLocked} ${styles.pinLockedActive}` : styles.pinLocked}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          onClick(restaurant);
        }}
      >
        <span className={styles.pinLockedDot} aria-hidden="true" />
      </div>
    </Marker>
  );
}

export default memo(
  LockedMarker,
  (prev, next) =>
    prev.restaurant._id === next.restaurant._id &&
    prev.isSelected === next.isSelected &&
    prev.restaurant.lat === next.restaurant.lat &&
    prev.restaurant.lng === next.restaurant.lng &&
    prev.onClick === next.onClick &&
    prev.label === next.label
);
