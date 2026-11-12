'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import type MapCanvasLayer from './MapCanvasLayer';
import styles from './MapLayout.module.css';

type Canvas = typeof MapCanvasLayer;

/** The map is browser-only. Keep its existing placeholder until the module
 * is ready rather than suspending an already hydrated results panel while
 * the large MapLibre dependency downloads. */
export default function LazyMapCanvasLayer(props: ComponentProps<Canvas>) {
  const [canvas, setCanvas] = useState<{ Component: Canvas } | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    void import('./MapCanvasLayer').then(
      (module) => { if (active) setCanvas({ Component: module.default }); },
      (reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason : new Error(String(reason)));
      }
    );
    return () => { active = false; };
  }, []);

  if (error) throw error;
  if (!canvas) return <div className={styles.mapLoading} aria-hidden="true" />;
  return <canvas.Component {...props} />;
}
