'use client';

import { useId, useRef } from 'react';
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { useGSAP } from '@gsap/react';
import { HEART_PATH } from '@/app/components/map/icons';
import styles from './HeartDraw.module.css';

gsap.registerPlugin(useGSAP, DrawSVGPlugin);

/* Ausmalen wie mit dem Stift: hin und her, von oben nach unten, an der
   Herzform abgeschnitten. Die Linien liegen enger als ihre Strichstärke,
   damit am Ende keine Lücke bleibt. */
const SCRIBBLE =
  '1.5 4.5 22.5 3 1.5 7.2 22.5 5.7 1.5 9.9 22.5 8.4 1.5 12.6 22.5 11.1 2 15.3 22 13.8 4 18 20 16.5 7 20.5 17 19.2 10 22.5 14 21.8';

const TRACE_S = 0.32;
const SCRIBBLE_S = 0.3;
const ERASE_S = 0.18;

interface HeartDrawProps {
  hearted: boolean;
  /** Zählt die eigenen Tipps. Nur eine Änderung spielt die Zeichnung ab —
   *  beim Laden (auch wenn die Favoriten nachkommen) steht das Herz einfach da. */
  play: number;
  className?: string;
}

/**
 * Das Herz, das sich beim Tippen selbst zeichnet (Wahl 07.10.2026, Herz-Labor):
 * ein Stift in der Herz-Farbe fährt die Kontur nach, malt sie aus, dann setzt
 * es kurz auf. Zurücknehmen radiert schneller, als es gezeichnet hat. Ohne
 * Bewegung (reduced motion) wechselt nur der Zustand. Geherzt ist das Herz
 * gefüllt, sonst nur Kontur — die Fläche sagt es, nicht die Farbe allein.
 */
export default function HeartDraw({ hearted, play, className }: HeartDrawProps) {
  const root = useRef<HTMLSpanElement>(null);
  const lastPlay = useRef(play);
  const running = useRef<gsap.core.Timeline | null>(null);
  const clipId = useId();

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const pen = q('[data-pen]');
      const scribble = q('[data-scribble]');
      const fill = q('[data-fill]');
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const animate = play !== lastPlay.current && !reduce;
      lastPlay.current = play;
      running.current?.kill();

      if (!animate) {
        gsap.set(root.current, { scale: 1 });
        gsap.set(fill, { visibility: hearted ? 'visible' : 'hidden' });
        gsap.set([pen, scribble], { visibility: hearted ? 'visible' : 'hidden', drawSVG: '100%' });
        return;
      }

      const tl = gsap.timeline();
      if (hearted) {
        tl.set(fill, { visibility: 'hidden' })
          .set([pen, scribble], { visibility: 'visible', drawSVG: '0%' })
          .to(pen, { drawSVG: '100%', duration: TRACE_S, ease: 'power1.inOut' })
          .to(scribble, { drawSVG: '100%', duration: SCRIBBLE_S, ease: 'power1.in' }, '-=0.08')
          .set(fill, { visibility: 'visible' })
          .to(root.current, { scale: 1.12, duration: 0.09, ease: 'power2.out' }, '-=0.04')
          .to(root.current, { scale: 1, duration: 0.24, ease: 'back.out(3)' });
      } else {
        tl.set(fill, { visibility: 'hidden' })
          .to(scribble, { drawSVG: '0% 0%', duration: ERASE_S, ease: 'power2.out' })
          .to(pen, { drawSVG: '100% 100%', duration: ERASE_S, ease: 'power2.out' }, '<')
          .set([pen, scribble], { visibility: 'hidden' });
      }
      running.current = tl;
    },
    { dependencies: [hearted, play], scope: root }
  );

  return (
    <span ref={root} className={className ? `${styles.heart} ${className}` : styles.heart}>
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
