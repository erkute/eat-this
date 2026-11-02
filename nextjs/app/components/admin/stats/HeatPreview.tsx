import { useCallback, useEffect, useRef, useState } from 'react';
import { INSIGHT_GRID } from '@/lib/analytics/engagement';
import { percent } from './format';
import styles from '../StatsDashboard.module.css';
interface Section {
  key: string;
  label: string;
  selector: string;
}
interface Props {
  path: string;
  title: string;
  width: number;
  sections: readonly Section[];
  heat: Record<string, Record<string, number> | undefined>;
  views: number;
  reached?: { section: string; count: number }[];
  depth?: { at: number; count: number }[];
}
const EMPTY_REACHED: { section: string; count: number }[] = [];
const EMPTY_DEPTH: { at: number; count: number }[] = [];
const OVERLAY = 'data-stats-heat-overlay';
const HEIGHT = 820;
const preventNavigation = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
};
/** Dieselbe Vorschau für Startseite, Magazin und ausgewählte Artikel. Kartenkameras werden nicht überlagert. */
export default function HeatPreview({
  path,
  title,
  width,
  sections,
  heat,
  views,
  reached = EMPTY_REACHED,
  depth = EMPTY_DEPTH,
}: Props) {
  const stage = useRef<HTMLDivElement>(null),
    frame = useRef<HTMLIFrameElement>(null);
  const unlock = useRef<(() => void) | undefined>(undefined);
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const fit = () => setScale(Math.min(1, node.clientWidth / width));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, [width]);
  const paint = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc || doc.location.pathname !== new URL(path, location.href).pathname) return false;
    const boxes = sections.flatMap((section) => {
      const box = doc.querySelector<HTMLElement>(section.selector);
      if (
        !box ||
        !box.getClientRects().length ||
        !Object.keys(box).some((key) => key.startsWith('__reactFiber'))
      )
        return [];
      return [{ section, box }];
    });
    if (!boxes.length) return false;
    doc.querySelectorAll(`[${OVERLAY}]`).forEach((node) => node.remove());
    const max = Math.max(1, ...Object.values(heat).flatMap((cells) => Object.values(cells ?? {})));
    for (const { section, box } of boxes) {
      if (doc.defaultView?.getComputedStyle(box).position === 'static')
        box.style.position = 'relative';
      const layer = doc.createElement('div');
      layer.setAttribute(OVERLAY, '');
      layer.setAttribute('aria-hidden', 'true');
      Object.assign(layer.style, {
        position: 'absolute',
        inset: '0',
        pointerEvents: 'none',
        zIndex: '2147483000',
      });
      const cells = heat[section.key];
      if (cells && Object.keys(cells).length) {
        const canvas = doc.createElement('canvas');
        canvas.width = Math.min(1024, Math.round(box.clientWidth));
        canvas.height = Math.min(4096, Math.round(box.clientHeight));
        Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block' });
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const cw = canvas.width / INSIGHT_GRID,
            ch = canvas.height / INSIGHT_GRID;
          for (const [cell, count] of Object.entries(cells)) {
            const [x, y] = cell.split('_').map(Number);
            if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
            const cx = (x + 0.5) * cw,
              cy = (y + 0.5) * ch;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(1, Math.max(20, ch) / Math.max(20, cw));
            const radius = Math.max(24, cw);
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
            gradient.addColorStop(0, `rgba(16,70,210,${0.25 + (0.5 * count) / max})`);
            gradient.addColorStop(1, 'rgba(16,70,210,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
            ctx.restore();
          }
        }
        layer.appendChild(canvas);
      }
      const lines = section.key === 'content' ? [...depth] : [];
      const reach = reached.find((row) => row.section === section.key);
      if (reach) lines.push({ at: 0, count: reach.count });
      if (views > 0)
        for (const lineData of lines.filter((line) => line.count <= views)) {
          const line = doc.createElement('div');
          Object.assign(line.style, {
            position: 'absolute',
            top: `${lineData.at}%`,
            left: '0',
            right: '0',
            borderTop: '2px dashed #1f4fb8',
          });
          const label = doc.createElement('span');
          label.className = 'et-label';
          label.textContent = `${percent(lineData.count / views, 0)} · ${lineData.at ? `${lineData.at} % Scrolltiefe` : section.label}`;
          Object.assign(label.style, { position: 'absolute', top: '5px', left: '8px' });
          line.appendChild(label);
          layer.appendChild(line);
        }
      box.appendChild(layer);
    }
    return true;
  }, [path, sections, heat, views, reached, depth]);
  const onLoad = useCallback(() => {
    unlock.current?.();
    const doc = frame.current?.contentDocument;
    if (doc) {
      const prevent = (event: Event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      doc.addEventListener('click', prevent, true);
      doc.addEventListener('submit', prevent, true);
      doc.addEventListener('keydown', preventNavigation, true);
      unlock.current = () => {
        doc.removeEventListener('click', prevent, true);
        doc.removeEventListener('submit', prevent, true);
        doc.removeEventListener('keydown', preventNavigation, true);
      };
    }
    setReady(paint());
  }, [paint]);
  useEffect(() => () => unlock.current?.(), []);
  useEffect(() => {
    setReady(false);
    setFailed(false);
    let attempts = 0;
    let signature = '';
    const check = () => {
      attempts += 1;
      if (attempts >= 20) setFailed(true);
      const doc = frame.current?.contentDocument;
      if (!doc) return;
      if (doc.location.pathname !== new URL(path, location.href).pathname) {
        doc.querySelectorAll(`[${OVERLAY}]`).forEach((node) => node.remove());
        setReady(false);
        setFailed(true);
        return;
      }
      const next = sections
        .map((section) => {
          const rect = doc.querySelector(section.selector)?.getBoundingClientRect();
          return rect ? `${rect.width}x${rect.height}` : '-';
        })
        .join(',');
      const missing = doc.querySelectorAll(`[${OVERLAY}]`).length === 0;
      if (next !== signature || missing) {
        signature = next;
        if (paint()) {
          setReady(true);
          setFailed(false);
        }
      }
    };
    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [path, width, paint, sections]);
  return (
    <div
      ref={stage}
      className={styles.heatStage}
      style={{ height: HEIGHT * scale, maxWidth: width }}
    >
      <iframe
        ref={frame}
        src={path}
        title={title}
        className={styles.heatFrame}
        style={{ width, height: HEIGHT, transform: `scale(${scale})` }}
        onLoad={onLoad}
      />
      {!ready && (
        <p className={styles.heatLoading}>
          {failed
            ? 'Für diese Seite konnte keine passende Vorschau geladen werden.'
            : 'Seitenvorschau wird geladen …'}
        </p>
      )}
    </div>
  );
}
