import { SITE_URL } from './constants'

/**
 * Builds an absolute URL for a given locale + path.
 *
 * DE lives at the site root (`/`), EN/other locales at `/{locale}`. Passing
 * `'/'` or `''` as the path resolves to the locale root *without* a trailing
 * slash for non-DE — Next.js' default redirects `/en/` → `/en`, which Google
 * Search Console then flags as "Page with redirect". Same trap applies to
 * breadcrumb JSON-LD items pointing at the locale root.
 */
export function localeUrl(locale: string, path: string): string {
  const normalized = path === '/' ? '' : path
  if (locale === 'de') return normalized ? `${SITE_URL}${normalized}` : `${SITE_URL}/`
  return `${SITE_URL}/${locale}${normalized}`
}
