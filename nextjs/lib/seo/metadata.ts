import type { Metadata } from 'next';
import { localeUrl } from '@/lib/locale-url';

type AppLocale = 'de' | 'en';

/**
 * Site-wide robots directive. Set on the root layout, so any page that never
 * mentions `robots` inherits it (home, kategorie, guides).
 *
 * `max-image-preview:large` is the part that matters: it only applies where it
 * is actually declared, and without it Google shows a small thumbnail next to
 * the result instead of the photo.
 *
 * A page with a conditional noindex must name this constant in the other
 * branch. `robots: cond ? 'noindex,nofollow' : undefined` does NOT fall back to
 * the parent: Next merges the key as present-and-undefined and drops the
 * inherited value, so the page ships with no robots meta at all. Writing
 * `'index,follow'` by hand keeps the page indexable but drops the image and
 * snippet directives.
 */
export const INDEXABLE_ROBOTS =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

/**
 * Die robots-Zeile einer Spot-Seite. Drei Zustände, und die Reihenfolge ist
 * keine Geschmacksfrage:
 *
 * 1. `seo.noIndex` aus Sanity: Jemand hat die Seite bewusst versteckt, das
 *    schlägt alles andere und nimmt auch die Links mit (`nofollow`).
 * 2. `isClosed`: Der Laden macht nicht mehr auf. Raus aus dem Index, aber
 *    `follow`: Die Seite verlinkt Nachbarn und den Bezirk, und eingehende
 *    Links sollen nicht ins Leere laufen. Die Sitemap sortiert den Spot
 *    ebenfalls aus; ohne diesen Zweig indexierte Google ihn trotzdem und
 *    zeigte ihn wie eine Empfehlung.
 * 3. Sonst die Site-Direktive samt Bild- und Snippet-Erlaubnis.
 */
export function restaurantRobots(r: { seo?: { noIndex?: boolean }; isClosed?: boolean }): string {
  if (r.seo?.noIndex) return 'noindex,nofollow';
  if (r.isClosed) return 'noindex,follow';
  return INDEXABLE_ROBOTS;
}

/**
 * Builds the `alternates.canonical` + `alternates.languages` block that every
 * page's `generateMetadata` needs. There are exactly two shapes; the wrong one
 * makes Google flag EN URLs without real translations as duplicates.
 *
 * - **EN live** (default, `hasEnContent` omitted/true): index, news and SPA
 *   pages always have an EN variant → canonical stays on the current locale,
 *   the `en` alternate is emitted.
 * - **EN gated** (`hasEnContent: false`): restaurant/bezirk detail pages whose
 *   document has no `descriptionEn` → canonical points at the DE URL and NO
 *   `en` alternate is emitted, so Google doesn't index a thin/duplicate EN
 *   page.
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
