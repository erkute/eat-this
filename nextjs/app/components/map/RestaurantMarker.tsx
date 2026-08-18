'use client';
import { memo, useCallback } from 'react';
import { Marker, type MarkerInstance } from 'react-map-gl/maplibre';
import type { MapRestaurant } from '@/lib/types';
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
  const className = [
    styles.pinLogo,
    isSelected && styles.pinLogoActive,
    restaurant.mustEatCount > 0 && styles.pinLogoHasMust,
    enterDelayMs !== null && styles.pinLogoEnter,
  ]
    .filter(Boolean)
    .join(' ');

  /* MapLibre stamps role="button" + aria-label="Map marker" on its own wrapper
     unless they are already there (Marker.addTo), and it does that after React
     has mounted our inner button — so every pin announced as two nested
     buttons, the outer one namelessly generic. The inner div carries the real
     name, focus ring and Enter/Space handling, so demote the wrapper to
     presentation and let the one meaningful control through. */
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
      anchor="bottom"
      className={styles.markerRoot}
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick(restaurant);
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={restaurant.name}
        className={className}
        style={
          enterDelayMs !== null
            ? ({
                position: 'relative',
                '--pin-enter-delay': `${enterDelayMs}ms`,
              } as React.CSSProperties)
            : { position: 'relative' }
        }
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          onClick(restaurant);
        }}
      >
        <span className={styles.pinLogoShape} aria-hidden="true">
          <img src="/pics/eat-this-square.webp?v=5" alt="" draggable={false} />
        </span>
      </div>
    </Marker>
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
