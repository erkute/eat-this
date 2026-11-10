/** Seitenarten bleiben über DE und EN gleich; die Detailzeilen behalten ihre Sprache. */
export const PAGE_GROUPS = [
  ['home', 'Startseite'],
  ['articles', 'Artikel'],
  ['spots', 'Spot-Seiten'],
  ['map', 'Map'],
  ['must-eats', 'Must Eats'],
  ['magazine', 'Magazin-Übersicht'],
  ['districts', 'Bezirke'],
  ['categories', 'Kategorien'],
  ['packs', 'Booster Packs'],
  ['profile', 'Profil'],
  ['deck', 'Geteilte Sammelalben'],
  ['info', 'Info & Rechtliches'],
  ['checkout', 'Kaufbestätigung'],
  ['other', 'Weitere Seiten'],
] as const;
type PageGroup = (typeof PAGE_GROUPS)[number][0];
export interface PageCount {
  key: string;
  count: number;
}
interface PageRow {
  key: string;
  group: PageGroup;
  locale: 'de' | 'en';
  entries: number;
  views: number;
}
export interface MeasurementDay {
  day: string;
  recorded: boolean;
  visitors: number;
  entries: number;
  pageviews: number;
  views: number;
  overflow: number;
}

const ROUTE_GROUPS: Record<string, PageGroup> = {
  news: 'magazine',
  restaurant: 'spots',
  map: 'map',
  'must-eats': 'must-eats',
  bezirk: 'districts',
  kategorie: 'categories',
  packs: 'packs',
  pack: 'packs',
  profile: 'profile',
  deck: 'deck',
  checkout: 'checkout',
  about: 'info',
  contact: 'info',
  impressum: 'info',
  datenschutz: 'info',
  agb: 'info',
};

export function pageInfo(key: string): {
  group: PageGroup;
  locale: 'de' | 'en';
  label: string;
} {
  const locale = /^\/en(?:\/|$)/.test(key) ? 'en' : 'de';
  const path = (locale === 'en' ? key.slice(3) : key) || '/';
  const first = path.split('/')[1];
  const group: PageGroup =
    path === '/'
      ? 'home'
      : first === 'news' && path !== '/news'
        ? 'articles'
        : (ROUTE_GROUPS[first] ?? 'other');
  const label = PAGE_GROUPS.find(([id]) => id === group)![1];
  return {
    group,
    locale,
    label: path === '/other' ? 'Weitere Seiten (Sammelzähler)' : label,
  };
}

/** Vereinigung statt Schnittmenge: auch eine Seite ohne Einstieg bleibt sichtbar. */
export function pageRows(paths: PageCount[], entryPaths: PageCount[]): PageRow[] {
  const rows = new Map<string, PageRow>();
  for (const [items, field] of [
    [paths, 'views'],
    [entryPaths, 'entries'],
  ] as const) {
    for (const { key, count } of items) {
      const info = pageInfo(key);
      const row = rows.get(key) ?? {
        key,
        group: info.group,
        locale: info.locale,
        entries: 0,
        views: 0,
      };
      row[field] += count;
      rows.set(key, row);
    }
  }
  return [...rows.values()].sort((a, b) => b.views - a.views || a.key.localeCompare(b.key));
}

/** Abgleich gespeicherter Summen; er beweist keine Identität einzelner Menschen. */
export function measureDay(doc: {
  day: string;
  visitors?: number;
  pageviews?: number;
  paths?: Record<string, number>;
  entryPaths?: Record<string, number>;
}): MeasurementDay {
  const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : 0);
  const sum = (values: Record<string, number> = {}) =>
    Object.values(values).reduce((s, n) => s + num(n), 0);
  return {
    day: doc.day,
    recorded: doc.visitors !== undefined || doc.pageviews !== undefined,
    visitors: num(doc.visitors),
    entries: sum(doc.entryPaths),
    pageviews: num(doc.pageviews),
    views: sum(doc.paths),
    overflow: num(doc.paths?.['/other']) + num(doc.entryPaths?.['/other']),
  };
}
