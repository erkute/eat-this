'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Gate a transient status message on TWO thresholds so it can never flicker.
 *
 * `active` bound straight to a request's loading flag makes the message mount
 * and unmount for as long as the request runs — and a cached GPS fix resolves
 * in tens of ms, i.e. within a handful of frames. Long enough to see a flash,
 * far too short to read (measured: 25 ms / 5 frames on the locate button).
 *
 * - `delayMs`: don't show at all unless the wait outlives it. A fast response
 *   therefore renders nothing, rather than a blink.
 * - `minVisibleMs`: once shown, keep it up at least this long, so a response
 *   arriving just past the delay can't yank it away again.
 */
export function useDeferredStatus(active: boolean, delayMs: number, minVisibleMs: number): boolean {
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef(0);

  useEffect(() => {
    if (active) {
      // Already up: the min-visible hold is moot, keep it until active clears.
      if (visible) return;
      const timer = setTimeout(() => {
        shownAtRef.current = Date.now();
        setVisible(true);
      }, delayMs);
      return () => clearTimeout(timer);
    }
    if (!visible) return;
    const remaining = shownAtRef.current + minVisibleMs - Date.now();
    if (remaining <= 0) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(false), remaining);
    return () => clearTimeout(timer);
  }, [active, visible, delayMs, minVisibleMs]);

  return visible;
}
