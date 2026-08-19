'use client';
import { memo } from 'react';
import MarkerButton from './MarkerButton';
import styles from './MapMarkers.module.css';

interface LockedClusterMarkerProps {
  lat: number;
  lng: number;
  /** How many paywalled spots this dot stands for — always at least 2. */
  count: number;
  label: string;
  onClick: () => void;
}

/** Diameter of a cluster dot. A single locked spot is 11px (the CSS default);
 *  a group grows towards 22px so the eye reads density without the dot ever
 *  competing with the yellow pins for attention. */
function dotSize(count: number): number {
  return Math.min(11 + (count - 1) * 1.6, 22);
}

/**
 * Several paywalled spots collapsed into one dot.
 *
 * No number on it: at 22px a two-digit label is unreadable, and the dots are
 * deliberately the quiet layer — size already says "more is in here". The
 * count goes to the accessible name instead.
 *
 * Tapping zooms in rather than opening a sheet. A single dot still opens its
 * spot (that is PR #353); a group has no single spot to open.
 */
function LockedClusterMarker({ lat, lng, count, label, onClick }: LockedClusterMarkerProps) {
  return (
    <MarkerButton
      lat={lat}
      lng={lng}
      anchor="center"
      rootClassName={styles.markerRoot}
      className={styles.pinLocked}
      label={label}
      onActivate={onClick}
      clusterCount={count}
    >
      <span
        className={styles.pinLockedDot}
        aria-hidden="true"
        style={{ '--locked-dot-size': `${dotSize(count)}px` } as React.CSSProperties}
      />
    </MarkerButton>
  );
}

export default memo(LockedClusterMarker);
