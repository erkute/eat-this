'use client';
import { memo, useCallback } from 'react';
import { Marker, type MarkerInstance } from 'react-map-gl/maplibre';
import styles from './MapMarkers.module.css';

interface ClusterMarkerProps {
  lat: number;
  lng: number;
  /** How many free spots this pin stands for — always at least 2. */
  count: number;
  /** True when any member has a Must Eat, so the card badge survives clustering. */
  hasMustEat: boolean;
  label: string;
  onClick: () => void;
  /** Same first-load drop-in contract as RestaurantMarker. */
  enterDelayMs?: number | null;
}

/**
 * Several free spots that would otherwise overlap, drawn as one tag carrying
 * the count. It is the brand pin rather than a neutral circle on purpose: at
 * the default camera most of what is tappable on the map is a cluster, and a
 * generic bubble would read as map furniture instead of as spots.
 *
 * Tapping eases to the zoom at which the group breaks apart — it never opens a
 * sheet, because "which of these five" has no answer.
 */
function ClusterMarker({
  lat,
  lng,
  count,
  hasMustEat,
  label,
  onClick,
  enterDelayMs = null,
}: ClusterMarkerProps) {
  const className = [
    styles.pinCluster,
    // Reused from the single pin so the Must Eat badge stays one rule.
    hasMustEat && styles.pinLogoHasMust,
    enterDelayMs !== null && styles.pinLogoEnter,
  ]
    .filter(Boolean)
    .join(' ');

  // Same wrapper de-duplication as RestaurantMarker: MapLibre stamps its own
  // role="button" + aria-label on the wrapper after mount, which would
  // announce every cluster as two nested buttons.
  const setMarkerRef = useCallback((marker: MarkerInstance | null) => {
    const el = marker?.getElement();
    if (!el) return;
    el.setAttribute('role', 'presentation');
    el.removeAttribute('aria-label');
  }, []);

  return (
    <Marker
      ref={setMarkerRef}
      longitude={lng}
      latitude={lat}
      anchor="bottom"
      className={`${styles.markerRoot} ${styles.markerRootFree}`}
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick();
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        data-cluster={count}
        className={className}
        style={
          enterDelayMs !== null
            ? ({ '--pin-enter-delay': `${enterDelayMs}ms` } as React.CSSProperties)
            : undefined
        }
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          onClick();
        }}
      >
        <span className={styles.pinClusterShape} aria-hidden="true" />
        <span className={styles.pinClusterCount} aria-hidden="true">
          {count}
        </span>
      </div>
    </Marker>
  );
}

export default memo(ClusterMarker);
