/* Pure data-derivation helpers for RestaurantDetail. Kept out of the
   component file so the .tsx reads as render-only and these are testable
   in isolation. None of them touch React or the DOM. */

export type WebsiteInfo =
  | { kind: 'instagram'; url: string; handle: string | null }
  | { kind: 'web';        url: string; display: string }

/**
 * Classify a website URL: an Instagram link becomes a glyph + @handle in
 * the UI; every other URL renders as the full "www.example.de" host so
 * the user sees where they're going. Falsy input → null.
 */
export function classifyWebsite(url: string | null | undefined): WebsiteInfo | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    if (host === 'instagram.com' || host === 'www.instagram.com') {
      const handle = u.pathname.split('/').filter(Boolean)[0] ?? null
      return { kind: 'instagram', url, handle }
    }
    let display = u.hostname
    if (!display.startsWith('www.') && display.split('.').length === 2) {
      display = `www.${display}`
    }
    return { kind: 'web', url, display }
  } catch {
    return {
      kind: 'web',
      url,
      display: url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    }
  }
}

/**
 * Format a price range from Places (`{min, max, currency}`) as "10–20 €".
 * Returns null when min/max aren't both present.
 */
export function formatPriceLabel(input: {
  priceRange?: { min?: number; max?: number; currency?: string }
}): string | null {
  const r = input.priceRange
  if (!r) return null
  if (r.min != null && r.max != null) {
    const cur = r.currency === 'EUR' || !r.currency ? '€' : r.currency
    return `${r.min}–${r.max} ${cur}`
  }
  if (r.min != null) return `ab ${r.min} €`
  return null
}

/**
 * Split the open-status label "Geöffnet · schließt 22:00" into the
 * colored main word and the muted suffix the UI renders separately.
 * Empty input → main: undefined.
 */
export function splitStatusLabel(label: string): { main: string | undefined; sub: string } {
  if (!label) return { main: undefined, sub: '' }
  const [main, ...rest] = label.split(' · ')
  return { main, sub: rest.join(' · ') }
}
