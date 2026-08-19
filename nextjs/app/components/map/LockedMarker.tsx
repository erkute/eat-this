'use client';
import { memo } from 'react';
import type { MapRestaurant } from '@/lib/types';
import MarkerButton from './MarkerButton';
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
 * Tapping opens the sheet like any other spot; a group of dots zooms in
 * instead.
 */
function LockedMarker({ restaurant, isSelected = false, onClick, label }: LockedMarkerProps) {
  return (
    <MarkerButton
      lat={restaurant.lat}
      lng={restaurant.lng}
      anchor="center"
      rootClassName={
        isSelected ? `${styles.markerRoot} ${styles.markerRootActive}` : styles.markerRoot
      }
      className={isSelected ? `${styles.pinLocked} ${styles.pinLockedActive}` : styles.pinLocked}
      label={label}
      onActivate={() => onClick(restaurant)}
    >
      <span className={styles.pinLockedDot} aria-hidden="true" />
    </MarkerButton>
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
