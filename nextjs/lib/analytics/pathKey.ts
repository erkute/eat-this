// nextjs/lib/analytics/pathKey.ts
//
// Welche Pfade als Schluessel ins Tagesdokument duerfen.
//
// Bis 08.09.2026 stand hier ein Formregex: bis zu vier Segmente aus
// Kleinbuchstaben, sonst nichts. Das liess `/a/b/c/d` und jedes erfundene
// Wort durch — und `paths`, `entryPaths` und `continuations` sind freie
// Map-Schluessel in EINEM Dokument. Firestore deckelt ein Dokument bei 1 MB
// und 20.000 Indexeintraegen; ist die Grenze gerissen, schlagen ALLE
// Schreibvorgaenge des Tages fehl. Der Kommentar an der Ereignis-Allowlist in
// app/api/count/route.ts beschrieb genau diese Gefahr — sie galt fuer die
// Pfade genauso, nur stand dort kein Riegel.
//
// Jetzt muss ein Pfad eine Route sein, die diese Seite wirklich ausliefert.
// Die dynamischen Slugs bleiben unbegrenzt (es gibt keine Slug-Liste, die
// dieser Endpunkt billig kennen koennte) — die deckelt lib/analytics/dayKeyBudget.ts.
import { routing } from '@/i18n/routing';

/** Routen ohne Slug, genau so wie sie ausgeliefert werden. `''` ist die
 *  Startseite. Gegenprobe: `find app -name page.tsx`. */
const STATIC_ROUTES = new Set([
  '',
  '/map',
  '/must-eats',
  '/news',
  '/bezirk',
  '/kategorie',
  '/packs',
  '/profile',
  '/badge',
  '/about',
  '/contact',
  '/impressum',
  '/datenschutz',
  '/agb',
  '/checkout/success',
  // Das geteilte Sammelalbum. Es liegt unter `/deck/<uid>` — der Schluessel
  // ist die gekuerzte Form, siehe DECK_PATH.
  '/deck',
]);

/** Routen mit genau EINEM Slug-Segment dahinter. `deck` fehlt hier mit
 *  Absicht — sein Segment ist eine Firebase-UID, siehe DECK_PATH. */
const SLUG_ROUTES = new Set(['restaurant', 'news', 'bezirk', 'kategorie', 'pack']);

/** Das geteilte Deck traegt eine Firebase-UID im Pfad (`/deck/Z2IJ8CJsAbCd…`).
 *  Gezaehlt wird die Seite, nicht die Person: der Pfad wird auf `/deck`
 *  gekuerzt. Die UID selbst darf nie ein Schluessel im Tagesdokument werden —
 *  eine fremde Kennung gehoert dort weder als Schluessel noch als Wert hinein,
 *  und je Konto ein Schluessel waere genau der Verstaerker, den dieses Modul
 *  schliesst. */
const DECK_PATH = /^\/deck\/[A-Za-z0-9_-]{1,128}$/;

/** Ein Sanity-Slug: Kleinbuchstaben, Ziffern, einfache Bindestriche. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX = 80;

/** `/welcome` haengt nicht am Locale-Router (app/welcome/page.tsx). */
const UNLOCALIZED_ROUTES = new Set(['/welcome']);

/** Alles unter /en, /de/… ausser dem Default-Praefix. `localePrefix: 'as-needed'`
 *  heisst: DE ohne Praefix, EN mit. */
const LOCALE_PREFIXES = new Set(
  routing.locales.filter((locale) => locale !== routing.defaultLocale).map((locale) => `/${locale}`)
);

/**
 * Der Map-Schluessel fuer einen Pfad, oder `null`, wenn diese Seite ihn nicht
 * ausliefert.
 *
 * Firestore-Map-Schluessel duerfen keinen Punkt enthalten — und ein Punkt im
 * Pfad ist ohnehin nur ein Scanner (`/wp-admin/install.php`).
 */
export function pathKey(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.length > 120) return null;
  // Trailing slash weg, damit `/map/` und `/map` nicht zwei Schluessel sind.
  const path = raw.length > 1 ? raw.replace(/\/+$/, '') : '';
  if (UNLOCALIZED_ROUTES.has(path)) return path;

  const firstSlash = path.indexOf('/', 1);
  const head = firstSlash === -1 ? path : path.slice(0, firstSlash);
  const localized = LOCALE_PREFIXES.has(head) ? path.slice(head.length) : path;
  const prefix = localized === path ? '' : head;

  if (STATIC_ROUTES.has(localized)) return `${prefix}${localized}` || '/';
  if (DECK_PATH.test(localized)) return `${prefix}/deck`;

  const segments = localized.split('/').slice(1);
  if (segments.length !== 2) return null;
  const [route, slug] = segments;
  if (!SLUG_ROUTES.has(route)) return null;
  if (slug.length > SLUG_MAX || !SLUG.test(slug)) return null;
  return `${prefix}/${route}/${slug}`;
}
