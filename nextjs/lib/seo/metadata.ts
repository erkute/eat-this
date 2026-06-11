import type { Metadata } from 'next'
import { localeUrl } from '@/lib/locale-url'

export type AppLocale = 'de' | 'en'

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
  opts: { hasEnContent?: boolean } = {},
): { canonical: string; languages: Record<string, string> } {
  const enLive = opts.hasEnContent !== false
  const canonical = enLive ? localeUrl(locale, pageSlug) : localeUrl('de', pageSlug)
  const languages: Record<string, string> = {
    de: localeUrl('de', pageSlug),
    'x-default': localeUrl('de', pageSlug),
  }
  if (enLive) languages.en = localeUrl('en', pageSlug)
  return { canonical, languages }
}

/** App locale → Open Graph `og:locale` value. */
export function toOgLocale(locale: AppLocale): 'de_DE' | 'en_US' {
  return locale === 'de' ? 'de_DE' : 'en_US'
}

/** Convenience wrapper returning a ready `alternates` Metadata fragment. */
export function hreflangAlternates(
  pageSlug: string,
  locale: AppLocale,
  opts: { hasEnContent?: boolean } = {},
): NonNullable<Metadata['alternates']> {
  return buildHreflangAlternates(pageSlug, locale, opts)
}
