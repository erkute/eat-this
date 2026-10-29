'use client';

import { useEffect, useRef } from 'react';
import { IDLE_LIFT, idlePose, renderPack, type PackPose, type PackRenderer } from '@/lib/home/renderPack';
import styles from './StarterPackSignup.module.css';

const PACK_SRC = '/pics/home/starter-pack-front.webp?v=20261028';
/** The back of the pack, stored mirrored with the front's silhouette, so the
 *  renderer reads it with the front's uv (lib/home/renderPack.ts). */
const BACK_SRC = '/pics/home/starter-pack-back.webp?v=20261028';
const SPIN_MS = 1400;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Das Starter Pack als 3D-Folienbeutel (lib/home/renderPack.ts). Es schwebt
 * und dreht sich langsam hin und her; mit Maus kippt es zum Zeiger, ein Tipp
 * dreht es einmal um sich selbst. Gezeichnet wird nur, solange die Tafel im
 * Bild ist. Bis WebGL steht — und ohne WebGL oder mit reduzierter Bewegung
 * (dann steht es still, leicht gedreht) — liegt das flache Bild da; es gibt
 * auch die Grösse vor, an der sich das 3D-Pack ausrichtet.
 */
export default function StarterPack3D({ fit = false }: { fit?: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shadowRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const rig = rigRef.current;
    const canvas = canvasRef.current;
    // Keep the flat artwork when viewport observation is unavailable.
    if (!stage || !rig || !canvas || !('IntersectionObserver' in window)) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let renderer: PackRenderer | null = null;
    let frame = 0;
    let visible = false;
    let cancelled = false;
    let spinFrom = -Infinity;
    const tilt = { x: 0, y: 0 };
    const aim = { x: 0, y: 0 };
    const started = performance.now();

    const pose = (now: number): PackPose => {
      if (reduced) return { rotateX: 0.06, rotateY: -0.22, rotateZ: 0, lift: 0 };
      const idle = idlePose((now - started) / 1000);
      // Follow the pointer softly, never snap.
      tilt.x += (aim.x - tilt.x) * 0.08;
      tilt.y += (aim.y - tilt.y) * 0.08;
      const spin = Math.min(1, Math.max(0, (now - spinFrom) / SPIN_MS));
      return {
        ...idle,
        rotateY: idle.rotateY + tilt.x + (spin < 1 ? easeInOut(spin) * Math.PI * 2 : 0),
        rotateX: idle.rotateX + tilt.y,
      };
    };
    const shadow = shadowRef.current;
    const paint = (now: number) => {
      const current = pose(now);
      renderer?.draw(current);
      // Schwebehöhe 0 (tief) bis 1 (hoch) für den Schatten.
      shadow?.style.setProperty('--lift', String((current.lift / IDLE_LIFT + 1) / 2));
    };
    const draw = (now: number) => {
      if (!renderer) return;
      paint(now);
      frame = visible && !reduced ? requestAnimationFrame(draw) : 0;
    };
    const resume = () => {
      if (!frame && renderer && visible) frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      if (!renderer) return;
      const box = stage.getBoundingClientRect();
      // The small onboarding pack needs supersampling even on 1x previews;
      // its fine type otherwise aliases as the foil rotates. Home keeps its
      // existing rendering budget, while fitted previews use 2–3x pixels.
      const ratio = fit
        ? Math.min(3, Math.max(2, window.devicePixelRatio || 1))
        : Math.min(window.devicePixelRatio || 1, 2);
      // `box` misst sichtbare Pixel, `offsetWidth` CSS-Pixel. Unter dem Zoom
      // der Startseite (ab 1600px, HubSection.module.css) weichen sie ab —
      // das Pack muss im selben Maß wie die Leinwand gezeichnet werden.
      const zoom = stage.offsetWidth ? box.width / stage.offsetWidth : 1;
      renderer.resize(box.width * ratio, box.height * ratio, rig.offsetWidth * zoom * ratio);
      if (!frame) paint(performance.now());
    };

    let io: IntersectionObserver | null = null;
    let ro: ResizeObserver | null = null;
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const box = stage.getBoundingClientRect();
      aim.x = ((event.clientX - box.left) / box.width - 0.5) * 0.7;
      aim.y = ((event.clientY - box.top) / box.height - 0.5) * 0.45;
    };
    const onPointerLeave = () => {
      aim.x = 0;
      aim.y = 0;
    };
    const onClick = () => {
      if (reduced || performance.now() - spinFrom < SPIN_MS) return;
      spinFrom = performance.now();
      resume();
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      frame = 0;
      renderer = null;
      stage.removeAttribute('data-gl');
    };

    // The home signup sits several screens below the hero. Prepare the pack
    // shortly before it enters view, instead of downloading both sides and
    // compiling a second WebGL renderer during the entrance.
    const prepare = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      prepare.disconnect();
      void Promise.all([loadImage(PACK_SRC), loadImage(BACK_SRC)])
        .then(([art, back]) => {
          if (cancelled) return;
          renderer = renderPack(canvas, art, back);
          if (!renderer) return;
          resize();
          stage.setAttribute('data-gl', '');
          io = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) resume();
          });
          io.observe(stage);
          ro = new ResizeObserver(resize);
          ro.observe(stage);
          stage.addEventListener('pointermove', onPointerMove);
          stage.addEventListener('pointerleave', onPointerLeave);
          stage.addEventListener('click', onClick);
          canvas.addEventListener('webglcontextlost', onContextLost);
        })
        .catch(() => {});
    }, { rootMargin: '600px' });
    prepare.observe(stage);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      prepare.disconnect();
      io?.disconnect();
      ro?.disconnect();
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerleave', onPointerLeave);
      stage.removeEventListener('click', onClick);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      renderer?.dispose();
      renderer = null;
    };
  }, [fit]);

  return (
    <div ref={stageRef} className={fit ? `${styles.art} ${styles.fitted}` : styles.art} aria-hidden="true">
      <span ref={shadowRef} className={styles.shadow} />
      <div ref={rigRef} className={styles.packRig}>
        {/* The flat picture until WebGL is up. */}
        <div className={styles.packFlat}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.packFront} src={PACK_SRC} alt="" width={945} height={1491} loading="lazy" decoding="async" />
        </div>
      </div>
      <canvas ref={canvasRef} className={styles.gl} />
    </div>
  );
}
