'use client';
import { memo } from 'react';
import MarkerButton from './MarkerButton';
import styles from './MapMarkers.module.css';

interface ClusterMarkerProps {
  lat: number;
  lng: number;
  /** How many spots this pin stands for — always at least 2. */
  count: number;
  /** Any member carries a Must Eat, so the card badge survives grouping. */
  hasMustEat: boolean;
  isDimmed: boolean;
  label: string;
  onClick: () => void;
}

/**
 * Several spots that would pile onto each other on a zoomed-out map, drawn as
 * the SAME brand pin as a single spot with their count on top — the pin is the
 * thing people like about the map, so grouping must not turn it into a
 * neutral bubble (user, 22.09.2026). See lib/map/clusterMarkers.ts for when
 * grouping happens at all.
 *
 * Tapping zooms in until the group breaks into pins — it never opens a sheet,
 * because "which of these twelve" has no answer.
 */
function ClusterMarker({
  lat,
  lng,
  count,
  hasMustEat,
  isDimmed,
  label,
  onClick,
}: ClusterMarkerProps) {
  return (
    <MarkerButton
      lat={lat}
      lng={lng}
      anchor="bottom"
      rootClassName={`${styles.markerRoot} ${styles.markerRootFree}`}
      className={[
        styles.pinLogo,
        hasMustEat && styles.pinLogoHasMust,
        isDimmed && styles.pinLogoDim,
      ]
        .filter(Boolean)
        .join(' ')}
      label={label}
      onActivate={onClick}
    >
      <span className={styles.pinLogoShape} aria-hidden="true">
        <img
          src="/pics/eat-this-square-sm.webp"
          alt=""
          width={128}
          height={136}
          draggable={false}
        />
      </span>
      <span className={styles.pinCount} aria-hidden="true">
        {count}
      </span>
    </MarkerButton>
  );
}

export default memo(ClusterMarker);
