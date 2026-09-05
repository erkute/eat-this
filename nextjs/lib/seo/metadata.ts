import type { Metadata } from 'next';
import { localeUrl } from '@/lib/locale-url';

type AppLocale = 'de' | 'en';

/**
 * Site-wide robots directive. Set on the root layout, so any page that never
 * mentions `robots` inherits it (home, kategorie, guides).
 *
 * `max-image-preview:large` is the part that matters: it only applies where
 * it is actually declared, and without it Google shows a small thumbnail next
 * to the result instead of the photo. It used to live on the `(spa)` layout
 * alone, which left the whole catalogue — restaurant, bezirk, news — without
 * it.
 *
 * A page with a conditional noindex must name this constant in the other
 * branch. `robots: cond ? 'noindex,nofollow' : undefined` looks like it falls
 * back to the parent but does NOT: Next merges the key as present-and-
 * undefined and drops the inherited value, so the page ships with no robots
 * meta at all. Verified against a production build on 2026-08-23 — that is
 * exactly how restaurant and bezirk pages lost the directive. Writing
 * `'index,follow'` by hand is the same trap one step further: it keeps the
 * page indexable while silently dropping the image and snippet directives.
 */
export const INDEXABLE_ROBOTS =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

/**
 * Die robots-Zeile einer Spot-Seite. Drei Zustaende, und die Reihenfolge ist
 * keine Geschmacksfrage:
 *
 * 1. `seo.noIndex` aus Sanity — jemand hat die Seite bewusst versteckt, das
 *    schlaegt alles andere und nimmt auch die Links mit (`nofollow`).
 * 2. `isClosed` — der Laden macht nicht mehr auf. Raus aus dem Index, aber
 *    `follow`: die Seite verlinkt Nachbarn und den Bezirk, und eingehende
 *    Links sollen nicht ins Leere laufen. Bis zum 05.09.2026 fehlte dieser
 *    Zweig, waehrend die Sitemap den Spot laengst aussortierte — Google
 *    indexierte ihn trotzdem und zeigte ihn wie eine Empfehlung.
 * 3. Sonst die Site-Direktive samt Bild- und Snippet-Erlaubnis.
 */
export function restaurantRobots(r: { seo?: { noIndex?: boolean }; isClosed?: boolean }): string {
  if (r.seo?.noIndex) return 'noindex,nofollow';
  if (r.isClosed) return 'noindex,follow';
  return INDEXABLE_ROBOTS;
}

/**
 * Builds the `alternates.canonical` + `alternates.languages` block that every
 * page's `generateMetadata` needs.
 *
 * There are exactly two shapes, and picking the wrong one is the SEO bug
 * CLAUDE.md gotcha #3 warns about (Google flagged EN URLs without real
 * translations as duplicates):
 *
 * - **EN live** (default, `hasEnContent` omitted/true): index, news and SPA
 *   pages always have an EN variant → canonical stays on the current locale,
 *   the `en` alternate is emitted.
 * - **EN gated** (`hasEnContent: false`): restaurant/bezirk detail pages whose
 *   document has no `descriptionEn` → canonical points at the DE URL and NO
 *   `en` alternate is emitted, so Google doesn't index a thin/duplicate EN page.
 *
 * `de` and `x-default` always resolve to the DE URL.
 */
export function buildHreflangAlternates(
  pageSlug: string,
  locale: AppLocale,
  opts: { hasEnContent?: boolean } = {}
): { canonical: string; languages: Record<string, string> } {
  const enLive = opts.hasEnContent !== false;
  const canonical = enLive ? localeUrl(locale, pageSlug) : localeUrl('de', pageSlug);
  const languages: Record<string, string> = {
    de: localeUrl('de', pageSlug),
    'x-default': localeUrl('de', pageSlug),
  };
  if (enLive) languages.en = localeUrl('en', pageSlug);
  return { canonical, languages };
}

/** App locale → Open Graph `og:locale` value. */
export function toOgLocale(locale: AppLocale): 'de_DE' | 'en_US' {
  return locale === 'de' ? 'de_DE' : 'en_US';
}

/** Convenience wrapper returning a ready `alternates` Metadata fragment. */
export function hreflangAlternates(
  pageSlug: string,
  locale: AppLocale,
  opts: { hasEnContent?: boolean } = {}
): NonNullable<Metadata['alternates']> {
  return buildHreflangAlternates(pageSlug, locale, opts);
}
