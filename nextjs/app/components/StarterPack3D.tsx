'use client';

import { useEffect, useRef } from 'react';
import { idlePose, renderPack, type PackPose, type PackRenderer } from '@/lib/home/renderPack';
import styles from './StarterPackSignup.module.css';

const PACK_SRC = '/pics/home/booster-empty.webp';
const FIGURE_SRC = '/pics/home/booster-cafe-layer.webp';
/** Where the figure sits on the foil, as fractions of the pack. */
const FIGURE = { left: 0.194, top: 0.308, width: 0.598, height: 0.66 };
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

/** Pack and figure flattened into the one picture printed on the foil. */
async function packArt(): Promise<HTMLCanvasElement> {
  const [pack, figure] = await Promise.all([loadImage(PACK_SRC), loadImage(FIGURE_SRC)]);
  const canvas = document.createElement('canvas');
  canvas.width = 756;
  canvas.height = 1170;
  const context = canvas.getContext('2d')!;
  context.drawImage(pack, 0, 0, canvas.width, canvas.height);
  context.drawImage(
    figure,
    FIGURE.left * canvas.width,
    FIGURE.top * canvas.height,
    FIGURE.width * canvas.width,
    FIGURE.height * canvas.height
  );
  return canvas;
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
export default function StarterPack3D() {
  const stageRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const rig = rigRef.current;
    const canvas = canvasRef.current;
    if (!stage || !rig || !canvas) return;
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
    const draw = (now: number) => {
      if (!renderer) return;
      renderer.draw(pose(now));
      frame = visible && !reduced ? requestAnimationFrame(draw) : 0;
    };
    const resume = () => {
      if (!frame && renderer && visible) frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      if (!renderer) return;
      const box = stage.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      renderer.resize(box.width * ratio, box.height * ratio, rig.offsetWidth * ratio);
      if (!frame) renderer.draw(pose(performance.now()));
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

    packArt()
      .then((art) => {
        if (cancelled) return;
        renderer = renderPack(canvas, art);
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

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      io?.disconnect();
      ro?.disconnect();
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerleave', onPointerLeave);
      stage.removeEventListener('click', onClick);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      renderer?.dispose();
      renderer = null;
    };
  }, []);

  return (
    <div ref={stageRef} className={styles.art} aria-hidden="true">
      <span className={styles.shadow} />
      <div ref={rigRef} className={styles.packRig}>
        {/* The flat picture until WebGL is up: pack, figure printed on it. */}
        <div className={styles.pack}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.packFront} src={PACK_SRC} alt="" width={1008} height={1560} />
          <div className={styles.character}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FIGURE_SRC} alt="" width={960} height={1600} />
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className={styles.gl} />
    </div>
  );
}
