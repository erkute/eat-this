'use client';

import { useEffect, useRef } from 'react';
import SiteImage from './SiteImage';
import { renderRemy } from '@/lib/home/renderRemy';
import styles from './HeroCurtain.module.css';

export default function HeroCurtain() {
  const scene = useRef<HTMLDivElement>(null);
  const figure = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const root = scene.current;
    const drawing = figure.current;
    const surface = canvas.current;
    const image = drawing?.querySelector('img');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    if (!root || !drawing || !surface || !image || reduced.matches) return;
    let frame = 0;
    let cancelled = false;
    let renderer: ReturnType<typeof renderRemy> = null;
    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      renderer?.dispose();
      renderer = null;
      drawing.removeAttribute('data-animated');
    };
    const finish = () => {
      if (!document.documentElement.hasAttribute('data-hero-intro')) stop();
    };
    const observer = new MutationObserver(finish);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-hero-intro'] });
    const start = async () => {
      try { await image.decode(); } catch { return; }
      if (cancelled || !document.documentElement.hasAttribute('data-hero-intro')) return;
      const rect = drawing.getBoundingClientRect();
      const resolution = Math.min(devicePixelRatio, 2);
      surface.width = Math.ceil(rect.width * 1345 / 1145 * resolution);
      surface.height = Math.ceil(rect.height * 1474 / 1374 * resolution);
      renderer = renderRemy(surface, image);
      if (!renderer) return;
      const animation = root.getAnimations()[0];
      const draw = () => {
        if (cancelled || !renderer) return;
        // Read the reveal's clock: pausing or slowing the reveal also pauses
        // or slows the body. No separate loop can drift out of sync.
        const time = Number(animation?.currentTime ?? 0) / 1000;
        renderer.draw(time);
        drawing.setAttribute('data-animated', '');
        frame = requestAnimationFrame(draw);
      };
      draw();
    };
    const motionChange = () => {
      if (reduced.matches) {
        document.documentElement.removeAttribute('data-hero-intro');
        stop();
      }
    };
    const contextLost = (event: Event) => { event.preventDefault(); stop(); };
    surface.addEventListener('webglcontextlost', contextLost);
    reduced.addEventListener('change', motionChange);
    void start();
    return () => {
      stop(); observer.disconnect();
      reduced.removeEventListener('change', motionChange);
      surface.removeEventListener('webglcontextlost', contextLost);
    };
  }, []);

  return (
    <div ref={scene} className={styles.scene} data-hero-curtain="" aria-hidden="true">
      {/* Remys Boden auf Desktop — am Telefon ist es Safaris Leistenband. */}
      <div className={styles.floor} />
      <div className={styles.travel}>
        <div className={styles.curtain} />
        <div className={styles.runner}>
          <div ref={figure} className={styles.figure}>
            <SiteImage src="/pics/home/remy-push-relaxed.webp" alt="" width={1145} height={1374}
              priority unoptimized className={styles.original} />
            <canvas ref={canvas} className={styles.mesh} />
          </div>
        </div>
      </div>
    </div>
  );
}
