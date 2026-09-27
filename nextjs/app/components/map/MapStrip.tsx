'use client';

import { useEffect, type RefObject } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import { mirrorMapStrip } from '@/lib/map/mapStripMirror';
import { SHEET_COLLAPSE_EVENT } from '@/lib/map/sheetSlide';
import styles from './MapStrip.module.css';

/**
 * The phone map strip: a copy of the map's top slice, fixed above the list,
 * so the rows run under map all the way up (lib/map/mapStripMirror explains
 * why a copy and not the map itself). Always there, never switched — over
 * the map it is the map. A tap on it once the bar is stuck takes you to the
 * map, like a tap on the grabber.
 *
 * Rendered after the map wrapper, so the cloned pins never come first in a
 * query for the real ones.
 */
export default function MapStrip() {
  return (
    <div
      className={styles.strip}
      data-map-strip=""
      aria-hidden="true"
      onClick={() => window.dispatchEvent(new Event(SHEET_COLLAPSE_EVENT))}
    >
      <canvas className={styles.canvas} />
      <div className={styles.pins} data-map-strip-pins="" inert />
    </div>
  );
}

/** Copy the map into the strip, frame by frame, once the map has painted. */
export function useMapStripMirror(mapRef: RefObject<MapRef | null>, painted: boolean): void {
  useEffect(() => {
    const map = mapRef.current?.getMap();
    const host = document.querySelector<HTMLElement>('[data-map-strip]');
    if (!map || !host) return;
    return mirrorMapStrip(map, host);
  }, [mapRef, painted]);
}
