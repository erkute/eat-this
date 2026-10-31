// nextjs/lib/analytics/homeHeat.ts
//
// Scrolltiefe und Klicks der Startseite — die Definitionen, die Browser,
// Zähl-Route und /admin/stats teilen.
//
// Läuft über denselben einwilligungsfreien Zähler wie die Seitenaufrufe
// (app/api/count/route.ts) und hält dieselbe Regel: nichts verknüpft einen
// Beacon mit einer Person. Ein Scroll-Beacon sagt nur „ein Aufruf kam bis
// hierher", ein Klick-Beacon nur „in diesem Abschnitt, an dieser Stelle, auf
// dieses Element". Gespeichert werden Summen je Tag in `analytics_home/<tag>`.
//
// Positionen sind relativ zum Abschnitt, nicht zur Seite: dieselbe Startseite
// ist am Telefon dreimal so lang wie am Desktop, und Bilder laden nach. Im
// Abschnitt gemessen, legt sich der Punkt in der Vorschau wieder auf dieselbe
// Stelle, egal wie hoch der Abschnitt dort gerade ist.

/** Die Abschnitte in Seitenreihenfolge, mit ihrem Selektor auf der Startseite. */
export const HOME_SECTIONS = [
  { key: 'nav', label: 'Kopfleiste', selector: '#navbar' },
  { key: 'hero', label: 'Einstieg', selector: '[data-hub-hero]' },
  { key: 'map', label: 'Map', selector: '[data-hub-map-intro]' },
  { key: 'magazine', label: 'Magazin', selector: '[data-hub-magazine]' },
  { key: 'musteats', label: 'Must Eats', selector: '[data-hub-musteats]' },
  { key: 'districts', label: 'Bezirke', selector: '[data-hub-districts]' },
  { key: 'remy', label: 'Frag Remy', selector: '[data-hub-fragremy]' },
  { key: 'faq', label: 'FAQ', selector: '[data-hub-faq]' },
  { key: 'starter', label: 'Starter Pack', selector: '[data-hub-starter]' },
  { key: 'footer', label: 'Footer', selector: '[data-hub] [data-site-footer]' },
] as const;

export type HomeSection = (typeof HOME_SECTIONS)[number]['key'];

/** Die Kopfleiste liegt fest über allem und wird nicht „erreicht" — sie zählt
 *  nur Klicks, nicht in die Scrolltiefe. */
export const SCROLL_SECTIONS: readonly HomeSection[] = HOME_SECTIONS.map((s) => s.key).filter(
  (key) => key !== 'nav'
);

const SECTION_KEYS = new Set<string>(HOME_SECTIONS.map((s) => s.key));

/** Dieselbe Grenze wie die SiteNav (< 768 px klappt sie weg). */
export const PHONE_MAX_WIDTH = 767;
export const HOME_DEVICES = ['phone', 'desktop'] as const;
export type HomeDevice = (typeof HOME_DEVICES)[number];

/** 20 × 20 Felder je Abschnitt: fein genug für einen Knopf, grob genug, dass
 *  ein Tagesdokument höchstens 2 × 10 × 400 Zellen trägt. */
export const HEAT_GRID = 20;

/** Scrolltiefe in Zehnerschritten, 0–100 % der Startseite. */
export const DEPTH_STEP = 10;

/** Wie viele verschiedene Klickziele ein Tag je Gerät aufnimmt. Die Startseite
 *  hat rund 120 klickbare Elemente; der Rest fällt in OVERFLOW_TARGET. */
export const TARGET_BUDGET = 300;
export const OVERFLOW_TARGET = 'other';

const TARGET_MAX = 60;

export type HomeBeacon =
  | { kind: 'scroll'; device: HomeDevice; depth: number; reached: HomeSection[] }
  | {
      kind: 'click';
      device: HomeDevice;
      section: HomeSection;
      cell: string;
      target: string | null;
    };

function isDevice(value: unknown): value is HomeDevice {
  return value === 'phone' || value === 'desktop';
}

function isSection(value: unknown): value is HomeSection {
  return typeof value === 'string' && SECTION_KEYS.has(value);
}

function unit(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : null;
}

/** Ein Klickziel als Map-Schlüssel: ein Pfad, ein Host oder die Beschriftung.
 *  Keine Punkte (Firestore), kein Steuerzeichen, gekürzt. */
export function targetKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\./g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TARGET_MAX);
  if (!cleaned || cleaned === OVERFLOW_TARGET || /^__.*__$/.test(cleaned)) return null;
  return cleaned;
}

/** Der Teil eines Zähl-Beacons, der die Startseite betrifft — oder `null`. */
export function parseHomeBeacon(body: Record<string, unknown>): HomeBeacon | null {
  const home = body.home;
  if (home !== 'scroll' && home !== 'click') return null;
  if (!isDevice(body.device)) return null;

  if (home === 'scroll') {
    const depth = unit(body.depth);
    if (depth === null || !Array.isArray(body.reached)) return null;
    const reached = [...new Set(body.reached.filter(isSection))].filter((key) =>
      SCROLL_SECTIONS.includes(key)
    );
    const bucket = Math.min(100, Math.floor((depth * 100) / DEPTH_STEP) * DEPTH_STEP);
    return { kind: 'scroll', device: body.device, depth: bucket, reached };
  }

  const x = unit(body.x);
  const y = unit(body.y);
  if (!isSection(body.section) || x === null || y === null) return null;
  const cell = (v: number) => Math.min(HEAT_GRID - 1, Math.floor(v * HEAT_GRID));
  return {
    kind: 'click',
    device: body.device,
    section: body.section,
    cell: `${cell(x)}_${cell(y)}`,
    target: targetKey(body.target),
  };
}

/* ── Schlüsselbudget ─────────────────────────────────────────────────── */

type TargetKeys = Record<HomeDevice, Set<string>>;

let targetCache: { day: string; loadedAt: number; keys: TargetKeys } | null = null;

/**
 * Die Klickziele, die heute schon in `analytics_home/<tag>` stehen — wie
 * dayKeys() in lib/analytics/dayKeyBudget.ts höchstens einmal je Minute und
 * Instanz gelesen. `null`, wenn der Lesevorgang scheiterte.
 */
export async function homeTargetKeys(
  day: string,
  read: () => Promise<Record<string, unknown> | undefined>,
  now: number = Date.now()
): Promise<TargetKeys | null> {
  if (targetCache && targetCache.day === day && now - targetCache.loadedAt < 60_000)
    return targetCache.keys;
  try {
    const clicks = ((await read())?.clicks ?? {}) as HomeDoc['clicks'] & object;
    const keysOf = (device: HomeDevice) =>
      new Set(
        Object.entries(clicks[device] ?? {}).flatMap(([section, targets]) =>
          Object.keys(targets ?? {}).map((target) => `${section}|${target}`)
        )
      );
    const keys = { phone: keysOf('phone'), desktop: keysOf('desktop') };
    targetCache = { day, loadedAt: now, keys };
    return keys;
  } catch {
    return null;
  }
}

/** Das Ziel, unter dem gezählt wird — oder OVERFLOW_TARGET, wenn das Budget
 *  des Geräts voll ist und das Ziel neu wäre. */
export function homeTargetWithinBudget(
  keys: TargetKeys | null,
  device: HomeDevice,
  section: HomeSection,
  target: string
): string {
  if (!keys) return OVERFLOW_TARGET;
  const id = `${section}|${target}`;
  if (keys[device].has(id)) return target;
  if (keys[device].size >= TARGET_BUDGET) return OVERFLOW_TARGET;
  keys[device].add(id);
  return target;
}

/** Nur für Tests: der Zwischenspeicher lebt sonst so lange wie die Instanz. */
export function resetHomeTargetsCache(): void {
  targetCache = null;
}

/* ── Auswertung ──────────────────────────────────────────────────────── */

/** `analytics_home/<tag>`, so wie die Zähl-Route es schreibt. */
export interface HomeDoc {
  day: string;
  views?: Partial<Record<HomeDevice, number>>;
  depth?: Partial<Record<HomeDevice, Record<string, number>>>;
  reached?: Partial<Record<HomeDevice, Record<string, number>>>;
  clicks?: Partial<Record<HomeDevice, Record<string, Record<string, number>>>>;
  heat?: Partial<Record<HomeDevice, Record<string, Record<string, number>>>>;
}

export interface HomeDeviceStats {
  /** Gemessene Aufrufe — jeder schickt beim Verlassen einen Scroll-Beacon. */
  views: number;
  /** Anteil der Aufrufe, die mindestens so tief kamen, je 10 %. */
  depth: { depth: number; share: number }[];
  /** Je Abschnitt (ohne Kopfleiste): wie viele Aufrufe ihn erreichten. */
  reached: { section: HomeSection; count: number }[];
  clicks: number;
  /** Klickziele, meistgeklickt zuerst. */
  targets: { section: HomeSection; target: string; count: number }[];
  /** Klicks je Abschnitt und Zelle (`gx_gy`). */
  heat: Partial<Record<HomeSection, Record<string, number>>>;
}

export interface HomeStats {
  days: number;
  /** Der erste Tag im Zeitraum mit Daten — davor lief die Messung noch nicht. */
  since: string | null;
  devices: Record<HomeDevice, HomeDeviceStats>;
}

function add(map: Map<string, number>, key: string, value: unknown): void {
  if (typeof value === 'number' && Number.isFinite(value))
    map.set(key, (map.get(key) ?? 0) + value);
}

function summarizeDevice(docs: HomeDoc[], device: HomeDevice): HomeDeviceStats {
  let views = 0;
  const depth = new Map<string, number>();
  const reached = new Map<string, number>();
  const targets = new Map<string, number>();
  const heat = new Map<string, Map<string, number>>();

  for (const doc of docs) {
    views += doc.views?.[device] ?? 0;
    for (const [bucket, count] of Object.entries(doc.depth?.[device] ?? {}))
      add(depth, bucket, count);
    for (const [section, count] of Object.entries(doc.reached?.[device] ?? {}))
      add(reached, section, count);
    for (const [section, byTarget] of Object.entries(doc.clicks?.[device] ?? {})) {
      if (!isSection(section)) continue;
      for (const [target, count] of Object.entries(byTarget ?? {}))
        add(targets, `${section}\u0000${target}`, count);
    }
    for (const [section, cells] of Object.entries(doc.heat?.[device] ?? {})) {
      if (!isSection(section)) continue;
      const bySection = heat.get(section) ?? new Map<string, number>();
      for (const [cell, count] of Object.entries(cells ?? {})) add(bySection, cell, count);
      heat.set(section, bySection);
    }
  }

  // „Mindestens so tief": von unten aufsummiert.
  const depthRows: { depth: number; share: number }[] = [];
  let atLeast = 0;
  for (let step = 100; step >= 0; step -= DEPTH_STEP) {
    atLeast += depth.get(String(step)) ?? 0;
    depthRows.unshift({ depth: step, share: views > 0 ? atLeast / views : 0 });
  }

  const heatOut: Partial<Record<HomeSection, Record<string, number>>> = {};
  let clicks = 0;
  for (const [section, cells] of heat) {
    heatOut[section as HomeSection] = Object.fromEntries(cells);
    for (const count of cells.values()) clicks += count;
  }

  return {
    views,
    depth: depthRows,
    reached: SCROLL_SECTIONS.map((section) => ({ section, count: reached.get(section) ?? 0 })),
    clicks,
    targets: [...targets]
      .map(([key, count]) => {
        const [section, target] = key.split('\u0000');
        return { section: section as HomeSection, target, count };
      })
      .sort((a, b) => b.count - a.count),
    heat: heatOut,
  };
}

export function summarizeHome(docs: HomeDoc[]): HomeStats {
  const days = docs.map((doc) => doc.day).sort();
  return {
    days: days.length,
    since: days[0] ?? null,
    devices: {
      phone: summarizeDevice(docs, 'phone'),
      desktop: summarizeDevice(docs, 'desktop'),
    },
  };
}
