import { pathKey } from './pathKey';

/**
 * Echte Ladezeiten (Core Web Vitals) über den eigenen Zähler.
 *
 * Gespeichert wird kein einzelner Messwert, sondern nur, wie oft ein Wert in
 * eine Stufe fiel: je Tag, Kennzahl, Seitentyp und Gerät ein Zähler je Stufe.
 * Kein Pfad, kein Besucher-Bezug. Aus den Stufen ergeben sich Median und P75,
 * als Stufengrenzen.
 *
 * Gemessen wird nur der erste Aufruf eines Dokuments, wie bei Googles
 * Felddaten (CrUX): LCP gehört zur Seite, die der Browser frisch geladen hat;
 * CLS und INP gelten für das ganze Dokument, auch nach Seitenwechseln in der
 * App. Darum zählt der Seitentyp, auf dem das Dokument geöffnet wurde.
 */

export const VITAL_METRICS = ['LCP', 'INP', 'CLS'] as const;
export type VitalMetric = (typeof VITAL_METRICS)[number];

const VITAL_PAGE_TYPES = [
  'home',
  'spot',
  'article',
  'magazine',
  'map',
  'category',
  'district',
  'other',
] as const;
export type VitalPageType = (typeof VITAL_PAGE_TYPES)[number];

export const VITAL_PAGE_LABELS: Record<VitalPageType, string> = {
  home: 'Startseite',
  spot: 'Spot',
  article: 'Artikel',
  magazine: 'Magazin',
  map: 'Map',
  category: 'Kategorie',
  district: 'Bezirk',
  other: 'Weitere Seiten',
};

type VitalDevice = 'phone' | 'desktop';

interface MetricScale {
  /** Breite einer Stufe in der Einheit des Werts (ms, bei CLS ohne Einheit). */
  step: number;
  /** Letzte Stufe: alles darüber landet hier. Hält die Zahl der Schlüssel fest. */
  cap: number;
  /** Was ein Browser noch plausibel meldet; darüber wird verworfen. */
  max: number;
  /** Googles Grenzen: bis `good` gut, über `poor` schlecht. */
  good: number;
  poor: number;
}

export const VITAL_SCALES: Record<VitalMetric, MetricScale> = {
  LCP: { step: 100, cap: 10_000, max: 120_000, good: 2_500, poor: 4_000 },
  INP: { step: 10, cap: 1_000, max: 60_000, good: 200, poor: 500 },
  CLS: { step: 0.01, cap: 1, max: 10, good: 0.1, poor: 0.25 },
};

/** Stufe als ganze Zahl, als Schlüssel im Tagesdokument (höchstens 101 je Kennzahl). */
export function vitalBucket(metric: VitalMetric, value: number): number {
  const { step, cap } = VITAL_SCALES[metric];
  return Math.min(Math.floor(value / step + 1e-9), Math.round(cap / step));
}

export function vitalPageType(raw: unknown): VitalPageType | null {
  const key = pathKey(raw);
  if (!key) return null;
  const path = key.replace(/^\/en(?=\/|$)/, '') || '/';
  if (path === '/') return 'home';
  if (path === '/map') return 'map';
  if (path === '/news') return 'magazine';
  if (path.startsWith('/restaurant/')) return 'spot';
  if (path.startsWith('/news/')) return 'article';
  if (path.startsWith('/kategorie/')) return 'category';
  if (path.startsWith('/bezirk/')) return 'district';
  return 'other';
}

export interface VitalBeacon {
  metric: VitalMetric;
  page: VitalPageType;
  device: VitalDevice;
  bucket: number;
}

export function parseVital(body: Record<string, unknown>): VitalBeacon | null {
  const metric = body.vital;
  if (!VITAL_METRICS.includes(metric as VitalMetric)) return null;
  const value = body.value;
  const scale = VITAL_SCALES[metric as VitalMetric];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > scale.max)
    return null;
  if (body.device !== 'phone' && body.device !== 'desktop') return null;
  const page = vitalPageType(body.path);
  if (!page) return null;
  return {
    metric: metric as VitalMetric,
    page,
    device: body.device,
    bucket: vitalBucket(metric as VitalMetric, value),
  };
}

/** Tagesdokument in `analytics_vitals/<Tag>`. */
export interface VitalDoc {
  day: string;
  hist?: Partial<
    Record<
      VitalMetric,
      Partial<Record<VitalPageType, Partial<Record<VitalDevice, Record<string, number>>>>>
    >
  >;
}

interface VitalQuantile {
  value: number;
  isLowerBound: boolean;
}

export interface VitalStat {
  count: number;
  median: number | null;
  medianIsLowerBound: boolean;
  p75: number | null;
  p75IsLowerBound: boolean;
}

interface VitalRow {
  page: VitalPageType;
  device: VitalDevice;
  metrics: Record<VitalMetric, VitalStat>;
}

export interface VitalSummary {
  since: string | null;
  rows: VitalRow[];
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

/** Obergrenze der Stufe des Quantils, bei der offenen Stufe ihre Untergrenze. */
function quantile(
  metric: VitalMetric,
  counts: Map<number, number>,
  total: number,
  p: number
): VitalQuantile | null {
  if (!total) return null;
  const { step, cap } = VITAL_SCALES[metric];
  const rank = Math.max(1, Math.ceil(p * total));
  let seen = 0;
  for (const bucket of [...counts.keys()].sort((a, b) => a - b)) {
    seen += counts.get(bucket)!;
    if (seen < rank) continue;
    if (bucket === vitalBucket(metric, cap)) return { value: cap, isLowerBound: true };
    return { value: Math.round((bucket + 1) * step * 100) / 100, isLowerBound: false };
  }
  return null;
}

export function summarizeVitals(docs: VitalDoc[]): VitalSummary {
  const rows: VitalRow[] = [];
  for (const page of VITAL_PAGE_TYPES) {
    for (const device of ['phone', 'desktop'] as const) {
      const metrics = {} as Record<VitalMetric, VitalStat>;
      for (const metric of VITAL_METRICS) {
        const counts = new Map<number, number>();
        for (const doc of docs) {
          for (const [key, value] of Object.entries(doc.hist?.[metric]?.[page]?.[device] ?? {})) {
            const bucket = Number(key);
            if (!Number.isInteger(bucket) || bucket < 0) continue;
            counts.set(bucket, (counts.get(bucket) ?? 0) + num(value));
          }
        }
        const count = [...counts.values()].reduce((sum, n) => sum + n, 0);
        const median = quantile(metric, counts, count, 0.5);
        const p75 = quantile(metric, counts, count, 0.75);
        metrics[metric] = {
          count,
          median: median?.value ?? null,
          medianIsLowerBound: median?.isLowerBound ?? false,
          p75: p75?.value ?? null,
          p75IsLowerBound: p75?.isLowerBound ?? false,
        };
      }
      if (VITAL_METRICS.some((metric) => metrics[metric].count > 0))
        rows.push({ page, device, metrics });
    }
  }
  return {
    since: docs.length ? docs.map((doc) => doc.day).sort()[0] : null,
    rows,
  };
}

export type VitalRating = 'good' | 'mid' | 'poor';

export function vitalRating(metric: VitalMetric, value: number): VitalRating {
  const { good, poor } = VITAL_SCALES[metric];
  return value <= good ? 'good' : value <= poor ? 'mid' : 'poor';
}
