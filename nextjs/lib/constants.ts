export const SITE_URL = 'https://www.eatthisdot.com';

// Cache-bust for the shared category share cards (public/pics/og/og_*.png).
// Two routes emit the same nine files — guides/[slug] and kategorie/[slug] —
// and each carried its own version, one of them hardcoded. Social crawlers
// cache these hard, so a stale copy sticks around for a long time. Single
// source of truth: BUMP THIS whenever a file in public/pics/og/ changes.
export const OG_PACK_VERSION = 8;

// Cache-bust for the brand share cards (public/pics/og-card.png, 1200×630, and
// og-card-square.png, 1200×1200). Twelve call sites emit these two files and
// every one of them carried its own hardcoded `?v=4` — same drift risk
// OG_PACK_VERSION was introduced to kill. Social crawlers cache share images
// hard, so a stale copy sticks around for a long time: BUMP THIS whenever
// either file changes.
export const OG_CARD_VERSION = 9;

// Brand logo for Google (Organization, article publisher): the "e" on paper, square like Google shows it.
// Same file as the 512 px favicon (scripts/build-brand-icons.mts); the version follows the favicon links.
export const BRAND_LOGO = {
  src: '/pics/favicon-512.png?v=20261114',
  width: 512,
  height: 512,
} as const;

// Shared Figma wordmark: cleaned a, supplied paper texture, intrinsic dimensions.
export const BRAND_WORDMARK = {
  src: '/pics/eat-this-crumpled-wordmark.webp?v=20261028',
  width: 2600,
  height: 645,
} as const;

/**
 * The day the page templates last changed in a way a crawler can see — new
 * JSON-LD, different image markup, a changed robots or title tag. Feeds
 * `lastmod` in lib/seo/sitemap-entries.ts for every URL that has no trustworthy
 * per-document date of its own.
 *
 * Bump it by hand, and only for a change that alters what Googlebot receives.
 * **Never derive it from `new Date()`.** A `lastmod` that moves on its own is
 * the exact lie Google stops believing — and it stops believing it for the
 * whole host, not just the URL that lied.
 *
 * Understating is safe, overstating is not: when a single restaurant's copy
 * changes in Sanity, this date stays put and Google recrawls on its own
 * schedule. Omitting it entirely would leave the catalogue with no recrawl
 * signal at all. A removal does not bump it either: lastmod should trigger a
 * recrawl when there is something new to fetch.
 *
 * The current value stands for: head keywords in the category hub titles
 * (Kaffee, Fast Food, Dessert), /kategorie as a hub of real spots, and the
 * burger drawer's entry on every page.
 */
export const TEMPLATE_REVISED = '2026-08-25';

export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) return SITE_URL;
  try {
    return new URL(configured).origin;
  } catch {
    return SITE_URL;
  }
}

/**
 * Wie lange ein aus Sanity geholter Datensatz als frisch gilt (Sekunden).
 *
 * 24 Stunden, nicht eine. Im Stundentakt dürften sich alle vorgerenderten
 * Seiten (Restaurants, Bezirke, Kategorien, Artikel, statische Seiten, jeweils
 * DE und EN) jede Stunde neu aus Sanity versorgen, jede mit mehreren Fetches.
 * Das braucht das API-CDN-Kontingent des Plans auf; dann antworten Startseite
 * und /map mit 500, und jeder CI-Build bricht mit 402 `plan_limit_reached` ab.
 *
 * Der Takt ist nicht der Weg, auf dem Inhalte live gehen. Das ist der
 * Sanity-Webhook auf /api/revalidate, der bei jeder Änderung gezielt die
 * betroffenen Tags und Pfade invalidiert. Diese Frist ist nur das Netz
 * darunter, für den Fall, dass ein Webhook verloren geht.
 *
 * Genau deshalb hängt an dieser Zahl eine Bedingung: **Sie darf nur so lang
 * sein, wie der Webhook wirklich funktioniert.** Fällt er aus, ist dieser Wert
 * die einzige Frist, nach der Inhalte erscheinen, und aus einer Stunde
 * Verzögerung wird ein Tag. Prüfen mit:
 *
 *   cd studio && SANITY_STUDIO_ENV=production SANITY_STUDIO_PROJECT_ID=ehwjnjr2 \
 *     SANITY_STUDIO_DATASET=production ./node_modules/.bin/sanity hook logs "Next.js revalidate"
 *
 * Steht dort `failure`, gehört dieser Wert zurück auf 3600, bis der Hook wieder
 * 200 liefert.
 */
export const SANITY_REVALIDATE_SECONDS = 86400;

/**
 * Frist für die Flächen, die pro Request frisch aussehen müssen: Die Karte und
 * die Startseite sind `force-dynamic`, ihre Sanity-Fetches sind das Einzige,
 * was sie überhaupt cached hält. Fünf Minuten: Bei einem Crawler, der die Karte
 * im Minutentakt abruft, wäre eine Minute ein Dauerabo auf frische
 * Sanity-Anfragen.
 */
export const SANITY_LIVE_SURFACE_SECONDS = 300;
