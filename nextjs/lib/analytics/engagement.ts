import { pathKey } from './pathKey';

export const SURFACES = ['article', 'magazine', 'map'] as const;
export type Surface = (typeof SURFACES)[number];
export const SURFACE_LABELS: Record<Surface, string> = {
  article: 'Artikel',
  magazine: 'Magazin',
  map: 'Map',
};
const INSIGHT_SIGNALS = [
  'view',
  'engaged',
  'read30',
  'depth25',
  'depth50',
  'depth75',
  'depth100',
  'onward',
  'outbound',
  'spot',
  'article',
  'search',
  'filter',
] as const;
export type InsightSignal = (typeof INSIGHT_SIGNALS)[number];
export type InsightDevice = 'phone' | 'desktop';
const INSIGHT_SECTIONS = ['header', 'content', 'footer'] as const;
export type InsightSection = (typeof INSIGHT_SECTIONS)[number];
const INSIGHT_TARGETS = [
  'article',
  'spot',
  'map',
  'pack',
  'navigation',
  'external',
  'share',
  'control',
  'other',
] as const;
export const INSIGHT_GRID = 20;
export const INSIGHT_PAGE_BUDGET = 200;
export const INSIGHT_SELECTORS: Record<Surface, string> = {
  article: '[data-page="news-article"].active',
  magazine: '[data-page="news"].active',
  map: '[data-page="map"].active',
};

export function surfaceForPath(raw: unknown): Surface | null {
  const path = pathKey(raw)?.replace(/^\/en(?=\/|$)/, '') || '/';
  if (/^\/news\/[^/]+$/.test(path)) return 'article';
  return path === '/news' ? 'magazine' : path === '/map' ? 'map' : null;
}

export type InsightBeacon = {
  path: string;
  surface: Surface;
  device: InsightDevice;
  signals: InsightSignal[];
  click?: { section: InsightSection; cell: string; target: (typeof INSIGHT_TARGETS)[number] };
};
export function parseInsight(body: Record<string, unknown>): InsightBeacon | null {
  if (body.insight !== 'signals' && body.insight !== 'click') return null;
  const path = pathKey(body.path);
  const surface = surfaceForPath(path);
  if (!path || !surface || (body.device !== 'phone' && body.device !== 'desktop')) return null;
  const signals = Array.isArray(body.signals)
    ? [
        ...new Set(
          body.signals.filter((s): s is InsightSignal =>
            INSIGHT_SIGNALS.includes(s as InsightSignal)
          )
        ),
      ]
    : [];
  const common = { path, surface, device: body.device as InsightDevice, signals };
  if (body.insight === 'signals') return signals.length ? common : null;
  if (surface === 'map' || !INSIGHT_SECTIONS.includes(body.section as InsightSection)) return null;
  const x = body.x,
    y = body.y;
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 ||
    x > 1 ||
    y < 0 ||
    y > 1
  )
    return null;
  const cell = (v: number) => Math.min(INSIGHT_GRID - 1, Math.floor(v * INSIGHT_GRID));
  return {
    ...common,
    click: {
      section: body.section as InsightSection,
      cell: `${cell(x)}_${cell(y)}`,
      target: INSIGHT_TARGETS.includes(body.target as (typeof INSIGHT_TARGETS)[number])
        ? (body.target as (typeof INSIGHT_TARGETS)[number])
        : 'other',
    },
  };
}

type InsightCounts = Record<InsightSignal, number>;
const emptyInsightCounts = (): InsightCounts =>
  Object.fromEntries(INSIGHT_SIGNALS.map((key) => [key, 0])) as InsightCounts;
export type DeviceCounts = Record<InsightDevice, InsightCounts>;
type PartialDeviceCounts = Partial<Record<InsightDevice, Partial<InsightCounts>>>;
export const emptyDeviceCounts = (): DeviceCounts => ({
  phone: emptyInsightCounts(),
  desktop: emptyInsightCounts(),
});
interface InsightPage {
  path: string;
  surface: Surface;
  devices: DeviceCounts;
}
export interface InsightDoc {
  day: string;
  surfaces?: Partial<Record<Surface, PartialDeviceCounts>>;
  pages?: Record<string, { surface: Surface; devices: PartialDeviceCounts }>;
}
export interface InsightSummary {
  since: string | null;
  days: number;
  surfaces: Record<Surface, DeviceCounts>;
  pages: InsightPage[];
}
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
function addCounts(target: DeviceCounts, input: PartialDeviceCounts = {}) {
  for (const device of ['phone', 'desktop'] as const)
    for (const key of INSIGHT_SIGNALS) target[device][key] += num(input[device]?.[key]);
}
export function totalInsights(devices: DeviceCounts): InsightCounts {
  const result = emptyInsightCounts();
  for (const key of INSIGHT_SIGNALS) result[key] = devices.phone[key] + devices.desktop[key];
  return result;
}
export function summarizeInsights(docs: InsightDoc[]): InsightSummary {
  const surfaces = Object.fromEntries(SURFACES.map((key) => [key, emptyDeviceCounts()])) as Record<
    Surface,
    DeviceCounts
  >;
  const pages = new Map<string, InsightPage>();
  for (const doc of docs) {
    for (const surface of SURFACES) addCounts(surfaces[surface], doc.surfaces?.[surface]);
    for (const [path, data] of Object.entries(doc.pages ?? {})) {
      if (!SURFACES.includes(data.surface)) continue;
      const row = pages.get(path) ?? { path, surface: data.surface, devices: emptyDeviceCounts() };
      addCounts(row.devices, data.devices);
      pages.set(path, row);
    }
  }
  return {
    since: docs.length ? docs.map((doc) => doc.day).sort()[0] : null,
    days: docs.length,
    surfaces,
    pages: [...pages.values()].sort(
      (a, b) =>
        totalInsights(b.devices).view - totalInsights(a.devices).view ||
        a.path.localeCompare(b.path)
    ),
  };
}
export interface InsightHeat {
  days: number;
  heat: Record<string, Record<string, number>>;
  targets: Record<string, number>;
}
export function summarizeInsightHeat(
  docs: {
    heat?: Record<string, Record<string, Record<string, number>>>;
    targets?: Record<string, Record<string, number>>;
  }[],
  device: InsightDevice
): InsightHeat {
  const result: InsightHeat = { days: docs.length, heat: {}, targets: {} };
  for (const doc of docs) {
    for (const [section, cells] of Object.entries(doc.heat?.[device] ?? {}))
      for (const [cell, count] of Object.entries(cells)) {
        result.heat[section] ??= {};
        result.heat[section][cell] = (result.heat[section][cell] ?? 0) + num(count);
      }
    for (const [target, count] of Object.entries(doc.targets?.[device] ?? {}))
      result.targets[target] = (result.targets[target] ?? 0) + num(count);
  }
  return result;
}
