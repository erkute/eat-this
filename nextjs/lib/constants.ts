export const SITE_URL = 'https://www.eatthisdot.com';

// Cache-bust for the manually-linked SPA stylesheet (public/css/style.min.css).
// Single source of truth — every (spa)/restaurant/bezirk/pack/kategorie/
// profile/login layout references this so the value can't drift between routes
// (it had: 6× v=154 vs 1× v=170). BUMP THIS on any css/style.css change.
export const CSS_VERSION = 312;

// Cache-bust for the shared category share cards (public/pics/og/og_*.png).
// Two routes emit the same nine files — guides/[slug] and kategorie/[slug] —
// and each carried its own version, one of them hardcoded. Social crawlers
// cache these hard, so a stale copy sticks around for a long time. Single
// source of truth, same deal as CSS_VERSION: BUMP THIS whenever a file in
// public/pics/og/ changes.
export const OG_PACK_VERSION = 4;

// Cache-bust for the brand share cards (public/pics/og-card.png, 1200×630, and
// og-card-square.png, 1200×1200). Twelve call sites emit these two files and
// every one of them carried its own hardcoded `?v=4` — same drift risk
// OG_PACK_VERSION was introduced to kill. Social crawlers cache share images
// hard, so a stale copy sticks around for a long time: BUMP THIS whenever
// either file changes.
export const OG_CARD_VERSION = 5;

/**
 * The day the page templates last changed in a way a crawler can see — new
 * JSON-LD, different image markup, a changed robots or title tag. Feeds
 * `lastmod` in app/sitemap.ts for every URL that has no trustworthy
 * per-document date of its own.
 *
 * Bump it by hand, and only for a change that alters what Googlebot receives.
 * **Never derive it from `new Date()`.** A `lastmod` that moves on its own is
 * the exact lie Google stops believing — and it stops believing it for the
 * whole host, not just the URL that lied.
 *
 * Understating is safe, overstating is not: when a single restaurant's copy
 * changes in Sanity, this date stays put and Google recrawls on its own
 * schedule. That is the trade the old "omit it entirely" comment was after —
 * except omitting it left the catalogue with no recrawl signal at all, and
 * /bezirk/schoeneberg sat six weeks stale in the index because of it.
 *
 * 2026-08-23: primaryImageOfPage, 1200 px JSON-LD images, eager lead photo,
 * max-image-preview:large across the catalogue, Berlin in the brand titles.
 */
export const TEMPLATE_REVISED = '2026-08-23';

// Adobe Fonts kit (Providence, chauncy, salted, moonblossom). [locale]/layout
// loads it non-blocking via CRITICAL_BOOTSTRAP, but that script never runs on
// a streamed notFound()/error render — those screens link it themselves.
export const TYPEKIT_STYLESHEET = 'https://use.typekit.net/kgb1lmh.css';

export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) return SITE_URL;
  try {
    return new URL(configured).origin;
  } catch {
    return SITE_URL;
  }
}
