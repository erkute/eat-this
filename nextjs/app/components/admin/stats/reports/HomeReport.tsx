'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { auth } from '@/lib/firebase/config';
import type { StatsSummary } from '@/lib/admin/stats.server';
import {
  HEAT_GRID,
  HOME_SECTIONS,
  type HomeDevice,
  type HomeDeviceStats,
  type HomeSection,
  type HomeStats,
} from '@/lib/analytics/homeHeat';
import { BarRows, Card, Kpi } from '../charts';
import { NUMBER, longDay, percent } from '../format';
import styles from '../../StatsDashboard.module.css';

/**
 * Die Startseite: wie weit Aufrufe scrollen, worauf geklickt wird, und eine
 * Heatmap direkt über der echten Seite.
 *
 * Die Zahlen kommen getrennt vom Rest (`?only=home`), weil nur dieser Reiter
 * sie braucht. Die Vorschau ist die Startseite selbst in einem iframe — gleiche
 * Herkunft, also legt dieser Bericht seine Ebenen direkt in ihre Abschnitte.
 * Dort zählt sie nicht mit (lib/analytics.ts, isOwnOrAutomated).
 */

const DEVICES: { key: HomeDevice; label: string; width: number }[] = [
  { key: 'phone', label: 'Telefon', width: 390 },
  { key: 'desktop', label: 'Desktop', width: 1280 },
];

const LABEL = Object.fromEntries(HOME_SECTIONS.map((s) => [s.key, s.label])) as Record<
  HomeSection,
  string
>;

/** Wie hoch die Vorschau ist, in Seitenpixeln vor dem Skalieren. */
const PREVIEW_HEIGHT = 820;

/** Helligkeit statt Farbton: hellblau (selten) bis tiefblau (oft) — lesbar
 *  ohne Rot-Grün-Unterscheidung. */
const RAMP: [number, [number, number, number]][] = [
  [0, [150, 190, 255]],
  [0.5, [40, 100, 220]],
  [1, [10, 30, 100]],
];

function rampAt(t: number): [number, number, number] {
  for (let i = 1; i < RAMP.length; i++) {
    const [stop, color] = RAMP[i];
    const [prevStop, prev] = RAMP[i - 1];
    if (t <= stop) {
      const f = (t - prevStop) / (stop - prevStop);
      return [0, 1, 2].map((c) => Math.round(prev[c] + (color[c] - prev[c]) * f)) as [
        number,
        number,
        number,
      ];
    }
  }
  return RAMP[RAMP.length - 1][1];
}

export default function HomeReport({ data }: { data: StatsSummary }) {
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<HomeDevice>('phone');
  const { start } = data.range;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!auth.currentUser) return;
      try {
        const token = await auth.currentUser.getIdToken();
        const response = await fetch(
          `/api/admin/stats?only=home&from=${start}&to=${data.range.end}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const { home } = (await response.json()) as { home: HomeStats };
        if (!cancelled) {
          setStats(home);
          setError(null);
        }
      } catch (cause) {
        if (!cancelled)
          setError(`Die Startseiten-Zahlen ließen sich nicht laden: ${(cause as Error).message}`);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [start, data.range.end]);

  if (error)
    return (
      <p className={styles.error} role="alert">
        {error}
      </p>
    );
  if (!stats)
    return (
      <p className={styles.notice} role="status">
        Wird geladen …
      </p>
    );

  const current = stats.devices[device];
  const tools = (
    <div className={styles.seg} role="group" aria-label="Gerät">
      {DEVICES.map((d) => (
        <button
          key={d.key}
          type="button"
          className={d.key === device ? styles.segBtnOn : styles.segBtn}
          aria-pressed={d.key === device}
          onClick={() => setDevice(d.key)}
        >
          {d.label} · {NUMBER.format(stats.devices[d.key].views)}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className={styles.homeToolbar}>
        {tools}
        <p className={styles.homeSince}>
          {stats.since
            ? `Gemessen seit ${longDay(stats.since)}, bis einschließlich heute.`
            : 'Noch keine Messung im Zeitraum — sie läuft ab dem nächsten Rollout.'}
        </p>
      </div>
      <Numbers stats={current} />

      <Card
        title="Wie weit gescrollt wird"
        span={2}
        sub="Anteil der Aufrufe, die den Anfang eines Abschnitts im Bild hatten."
      >
        <BarRows
          rows={current.reached.map((r) => ({
            key: r.section,
            label: LABEL[r.section],
            count: r.count,
            share: current.views > 0 ? percent(r.count / current.views, 0) : '',
          }))}
          empty="Noch nichts gemessen."
          share="Anteil der Aufrufe"
        />
      </Card>

      <Card title="Scrolltiefe" sub="Anteil der Aufrufe, die mindestens so weit kamen.">
        <BarRows
          rows={current.depth
            .filter((d) => d.depth > 0)
            .map((d) => ({
              key: String(d.depth),
              label: `${d.depth} %`,
              count: Math.round(d.share * current.views),
              share: percent(d.share, 0),
            }))}
          empty="Noch nichts gemessen."
          share="Anteil der Aufrufe"
        />
      </Card>

      <Card
        title="Meistgeklickt"
        span={3}
        sub="Links, Knöpfe und Felder je Abschnitt. Ein Pfad ist ein Link auf diese Seite, ein Host ein Link nach außen."
      >
        <BarRows
          rows={current.targets.slice(0, 20).map((t) => ({
            key: `${t.section}|${t.target}`,
            label: (
              <>
                <span className={styles.homeSection}>{LABEL[t.section]}</span> {t.target}
              </>
            ),
            count: t.count,
            share: current.clicks > 0 ? percent(t.count / current.clicks, 0) : '',
          }))}
          empty="Noch keine Klicks."
          share="Anteil an allen Klicks"
        />
      </Card>

      <Card
        title="Heatmap"
        span={3}
        sub="Die Startseite, wie sie jetzt ist. Klicks liegen dort, wo sie im Abschnitt waren; die Linien zeigen, wie viele Aufrufe bis dahin kamen. In der Vorschau lässt sich scrollen."
        tools={
          <span className={styles.heatLegend} aria-hidden="true">
            selten <span className={styles.heatRamp} /> oft
          </span>
        }
      >
        <HeatPreview
          key={device}
          stats={current}
          width={DEVICES.find((d) => d.key === device)!.width}
        />
      </Card>
    </>
  );
}

function Numbers({ stats }: { stats: HomeDeviceStats }) {
  const bottom = stats.reached.at(-1)?.count ?? 0;
  const median = stats.depth.filter((d) => d.share >= 0.5).at(-1)?.depth ?? 0;
  return (
    <div className={styles.kpis}>
      <Kpi label="Gemessene Aufrufe" value={NUMBER.format(stats.views)} />
      <Kpi
        label="Bis zum Footer"
        value={stats.views > 0 ? percent(bottom / stats.views, 0) : '–'}
        hint={`${NUMBER.format(bottom)} Aufrufe`}
      />
      <Kpi
        label="Halbe Aufrufe kommen bis"
        value={stats.views > 0 ? `${median} %` : '–'}
        hint="der Seitenlänge"
      />
      <Kpi
        label="Klicks"
        value={NUMBER.format(stats.clicks)}
        hint={
          stats.views > 0
            ? `${(stats.clicks / stats.views).toFixed(1).replace('.', ',')} je Aufruf`
            : undefined
        }
      />
    </div>
  );
}

/* ── Vorschau ────────────────────────────────────────────────────────── */

const OVERLAY = 'data-heat-overlay';

/** Ob React den Abschnitt schon hydriert hat. Vorher darf nichts hinein —
 *  ein fremdes Kind lässt die Hydrierung scheitern, und React baut den Baum
 *  neu. Gelesen an der Fiber, die React an jeden hydrierten Knoten hängt. */
function hydrated(box: Element): boolean {
  return Object.keys(box).some((key) => key.startsWith('__reactFiber'));
}

/** Legt in jeden Abschnitt der Vorschau eine Ebene mit Heatmap und Reichweite. */
/** Gibt zurück, wie viele Ebenen gelegt wurden. */
function paint(doc: Document, stats: HomeDeviceStats): number {
  doc.querySelectorAll(`[${OVERLAY}]`).forEach((node) => node.remove());
  const max = Math.max(
    1,
    ...Object.values(stats.heat).flatMap((cells) => Object.values(cells ?? {}))
  );
  const reached = new Map(stats.reached.map((r) => [r.section, r.count]));
  let found = 0;

  for (const section of HOME_SECTIONS) {
    const box = doc.querySelector<HTMLElement>(section.selector);
    if (!box || box.getClientRects().length === 0 || !hydrated(box)) continue;
    const { width, height } = box.getBoundingClientRect();
    if (width < 1 || height < 1) continue;
    const view = doc.defaultView;
    if (view && view.getComputedStyle(box).position === 'static') box.style.position = 'relative';

    const layer = doc.createElement('div');
    layer.setAttribute(OVERLAY, '');
    layer.setAttribute('aria-hidden', 'true');
    Object.assign(layer.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '2147483000',
    });

    const cells = stats.heat[section.key];
    if (cells && Object.keys(cells).length > 0) {
      const canvas = doc.createElement('canvas');
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block' });
      drawHeat(canvas, cells, max);
      layer.appendChild(canvas);
    }

    const count = reached.get(section.key);
    if (count !== undefined && stats.views > 0 && section.key !== 'hero') {
      const line = doc.createElement('div');
      Object.assign(line.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        borderTop: '2px dashed #1f4fb8',
      });
      const label = doc.createElement('span');
      label.className = 'et-label';
      label.textContent = `${percent(count / stats.views, 0)} sehen ${section.label}`;
      Object.assign(label.style, { position: 'absolute', top: '6px', left: '8px' });
      line.appendChild(label);
      layer.appendChild(line);
    }

    box.appendChild(layer);
    found += 1;
  }
  return found;
}

function drawHeat(canvas: HTMLCanvasElement, cells: Record<string, number>, max: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const cw = w / HEAT_GRID;
  const ch = h / HEAT_GRID;
  // Ein Fleck je Zelle, so breit wie die Zelle, mindestens fingerbreit.
  const rx = Math.max(22, cw * 0.9);
  const ry = Math.max(22, ch * 0.9);

  for (const [cell, count] of Object.entries(cells)) {
    const [gx, gy] = cell.split('_').map(Number);
    if (!Number.isFinite(gx) || !Number.isFinite(gy)) continue;
    const strength = 0.25 + 0.75 * (count / max);
    ctx.save();
    ctx.translate((gx + 0.5) * cw, (gy + 0.5) * ch);
    ctx.scale(1, ry / rx);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    gradient.addColorStop(0, `rgba(0,0,0,${strength})`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Die Graustufen-Dichte auf die Rampe abbilden.
  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3] / 255;
    if (a === 0) continue;
    const [r, g, b] = rampAt(Math.min(1, a));
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = Math.round(Math.min(0.8, 0.2 + a * 0.7) * 255);
  }
  ctx.putImageData(image, 0, 0);
}

function HeatPreview({ stats, width }: { stats: HomeDeviceStats; width: number }) {
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const fit = () => setScale(Math.min(1, node.clientWidth / width));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, [width]);

  // Die Startseite hydriert und lädt Bilder nach: neu malen, sobald sich die
  // Höhe eines Abschnitts ändert.
  const timer = useRef(0);
  const onLoad = useCallback(() => {
    window.clearInterval(timer.current);
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    let sizes = '';
    let painted = 0;
    const check = () => {
      const next = HOME_SECTIONS.map((s) => {
        const box = doc.querySelector(s.selector);
        const rect = box?.getBoundingClientRect();
        if (!box || !rect || !hydrated(box)) return '-';
        return `${Math.round(rect.width)}x${Math.round(rect.height)}`;
      }).join(',');
      // Auch neu, wenn eine Ebene fehlt: React wirft beim Hydrieren fremde
      // Kinder aus den Abschnitten.
      const missing = doc.querySelectorAll(`[${OVERLAY}]`).length < painted;
      if (next === sizes && !missing) return;
      sizes = next;
      painted = paint(doc, stats);
      if (painted > 1) setReady(true);
    };
    check();
    timer.current = window.setInterval(check, 1000);
  }, [stats]);

  useEffect(() => {
    if (frame.current?.contentDocument?.readyState === 'complete') onLoad();
    return () => window.clearInterval(timer.current);
  }, [onLoad]);

  return (
    <div
      ref={stage}
      className={styles.heatStage}
      style={{ height: PREVIEW_HEIGHT * scale, maxWidth: width }}
    >
      <iframe
        ref={frame}
        src="/"
        title="Startseite mit Heatmap"
        className={styles.heatFrame}
        style={{ width, height: PREVIEW_HEIGHT, transform: `scale(${scale})` }}
        onLoad={onLoad}
      />
      {!ready && <p className={styles.heatLoading}>Startseite wird geladen …</p>}
    </div>
  );
}
