'use client';

import { useEffect, useId, useRef } from 'react';
import { HEART_PATH } from '@/app/components/map/icons';
import styles from './HeartDraw.module.css';

/* Ausmalen wie mit dem Stift: hin und her, von oben nach unten, an der
   Herzform abgeschnitten. Die Linien liegen enger als ihre Strichstärke,
   damit am Ende keine Lücke bleibt. */
const SCRIBBLE =
  '1.5 4.5 22.5 3 1.5 7.2 22.5 5.7 1.5 9.9 22.5 8.4 1.5 12.6 22.5 11.1 2 15.3 22 13.8 4 18 20 16.5 7 20.5 17 19.2 10 22.5 14 21.8';

interface HeartDrawProps {
  hearted: boolean;
  /** Zählt die eigenen Tipps. Nur eine Änderung spielt die Zeichnung ab —
   *  beim Laden (auch wenn die Favoriten nachkommen) steht das Herz einfach da. */
  play: number;
  className?: string;
}

/**
 * Das Herz, das sich beim Tippen selbst zeichnet: Ein Stift in der Herz-Farbe
 * fährt die Kontur nach, malt sie aus, dann setzt es kurz auf. Zurücknehmen
 * radiert schneller, als es gezeichnet hat. Ohne Bewegung (reduced motion)
 * wechselt nur der Zustand. Geherzt ist das Herz gefüllt, sonst nur Kontur: Die
 * Fläche sagt es, nicht die Farbe allein.
 */
export default function HeartDraw({ hearted, play, className }: HeartDrawProps) {
  const root = useRef<HTMLSpanElement>(null);
  const lastPlay = useRef(play);
  const clipId = useId();

  useEffect(() => {
    const animate = play !== lastPlay.current;
    lastPlay.current = play;
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let active = true;
    let stop: (() => void) | undefined;
    void import('./drawHeart').then(({ drawHeart }) => {
      if (active && root.current) stop = drawHeart(root.current, hearted);
    }).catch(() => { /* The filled state remains visible if the animation cannot load. */ });
    return () => {
      active = false;
      stop?.();
    };
  }, [hearted, play]);

  return (
    <span ref={root} data-hearted={hearted ? '' : undefined} className={className ? `${styles.heart} ${className}` : styles.heart}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.svg}>
        <defs>
          <clipPath id={clipId}>
            <path d={HEART_PATH} />
          </clipPath>
        </defs>
        <path d={HEART_PATH} className={styles.fill} data-fill />
        <g clipPath={`url(#${clipId})`}>
          <polyline points={SCRIBBLE} className={styles.scribble} data-scribble />
        </g>
        <path d={HEART_PATH} className={styles.line} />
        <path d={HEART_PATH} className={styles.pen} data-pen />
      </svg>
    </span>
  );
}
