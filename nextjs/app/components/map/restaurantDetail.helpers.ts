/* Pure data-derivation helpers for RestaurantDetail. Kept out of the
   component file so the .tsx reads as render-only and these are testable
   in isolation. None of them touch React or the DOM. */

export type WebsiteInfo =
  | { kind: 'instagram'; url: string; handle: string | null }
  | { kind: 'web'; url: string; display: string };

/**
 * Classify a website URL: an Instagram link becomes a glyph + @handle in
 * the UI; every other URL renders as the full "www.example.de" host so
 * the user sees where they're going. Falsy input → null.
 */
export function classifyWebsite(url: string | null | undefined): WebsiteInfo | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // Only ever emit links we'll render in an href. Reject non-web schemes
    // (javascript:, data:, vbscript:, file: …) so a bad CMS value can't turn
    // into a clickable XSS payload. instagram.com always parses as http(s).
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    const host = u.hostname.toLowerCase();
    if (host === 'instagram.com' || host === 'www.instagram.com') {
      const handle = u.pathname.split('/').filter(Boolean)[0] ?? null;
      return { kind: 'instagram', url, handle };
    }
    let display = u.hostname;
    if (!display.startsWith('www.') && display.split('.').length === 2) {
      display = `www.${display}`;
    }
    return { kind: 'web', url, display };
  } catch {
    // Unparseable input (e.g. a bare host like "example.de"). Still guard the
    // scheme — leading whitespace can hide a "javascript:" payload from new URL.
    const trimmed = url.trim();
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:/i.test(trimmed)) return null;
    return {
      kind: 'web',
      url,
      display: url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    };
  }
}

/**
 * Format a price range from Places (`{min, max, currency}`) as "10–20 €".
 *
 * Google leaves `endPrice` off its top band and only sends `startPrice: 100`,
 * which is how nearly every fine-dining spot arrives — those render open-ended
 * as "ab 100 €" / "from 100 €" rather than being dropped. Requiring both bounds
 * is what kept the price off 45 of 51 fine-dining pages until 25.08.2026.
 *
 * A lone `max` stays null: "up to 20 €" is not a claim Places supports, and no
 * document in either dataset has one.
 */
export function formatPriceLabel(
  input: {
    priceRange?: { min?: number; max?: number; currency?: string };
  },
  locale?: string
): string | null {
  const r = input.priceRange;
  if (!r) return null;
  if (r.min == null) return null;
  const cur = r.currency === 'EUR' || !r.currency ? '€' : r.currency;
  if (r.max == null) {
    return locale === 'en' ? `from ${r.min} ${cur}` : `ab ${r.min} ${cur}`;
  }
  return `${r.min}–${r.max} ${cur}`;
}

/**
 * Split the open-status label "Geöffnet · schließt 22:00" into the
 * colored main word and the muted suffix the UI renders separately.
 * Empty input → main: undefined.
 */
export function splitStatusLabel(label: string): { main: string | undefined; sub: string } {
  if (!label) return { main: undefined, sub: '' };
  const [main, ...rest] = label.split(' · ');
  return { main, sub: rest.join(' · ') };
}
