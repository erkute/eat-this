'use client';
import { memo } from 'react';
import type { MapRestaurant } from '@/lib/types';
import MarkerButton from './MarkerButton';
import styles from './MapMarkers.module.css';

interface RestaurantMarkerProps {
  restaurant: MapRestaurant;
  isSelected: boolean;
  onClick: (restaurant: MapRestaurant) => void;
  /** Milliseconds to hold this pin back during the first-load drop-in, or
   *  `null` outside that window — a pin that mounts later (filter change)
   *  must appear without motion. */
  enterDelayMs?: number | null;
}

function RestaurantMarker({
  restaurant,
  isSelected,
  onClick,
  enterDelayMs = null,
}: RestaurantMarkerProps) {
  return (
    <MarkerButton
      lat={restaurant.lat}
      lng={restaurant.lng}
      anchor="bottom"
      rootClassName={[
        styles.markerRoot,
        styles.markerRootFree,
        isSelected && styles.markerRootActive,
      ]
        .filter(Boolean)
        .join(' ')}
      className={[
        styles.pinLogo,
        isSelected && styles.pinLogoActive,
        restaurant.mustEatCount > 0 && styles.pinLogoHasMust,
        enterDelayMs !== null && styles.pinLogoEnter,
      ]
        .filter(Boolean)
        .join(' ')}
      label={restaurant.name}
      onActivate={() => onClick(restaurant)}
      style={
        enterDelayMs !== null
          ? ({ '--pin-enter-delay': `${enterDelayMs}ms` } as React.CSSProperties)
          : undefined
      }
    >
      <span className={styles.pinLogoShape} aria-hidden="true">
        <img src="/pics/eat-this-square.webp?v=5" alt="" draggable={false} />
      </span>
    </MarkerButton>
  );
}

// Custom comparator: panning the map should not re-render markers whose
// underlying restaurant + selected-state are unchanged. onClick is a stable
// callback in the parent (useCallback) — included anyway for safety.
export default memo(
  RestaurantMarker,
  (prev, next) =>
    prev.restaurant._id === next.restaurant._id &&
    prev.restaurant.mustEatCount === next.restaurant.mustEatCount &&
    prev.restaurant.lat === next.restaurant.lat &&
    prev.restaurant.lng === next.restaurant.lng &&
    prev.isSelected === next.isSelected &&
    prev.onClick === next.onClick &&
    prev.enterDelayMs === next.enterDelayMs
);
