/* Pure data-derivation helpers for RestaurantDetail. Kept out of the
   component file so the .tsx reads as render-only and these are testable
   in isolation. None of them touch React or the DOM. */

type WebsiteInfo =
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
 * Eine Adresse aus Sanity ("KaDeWe, 6. Etage, Tauentzienstraße 21-24, 10789
 * Berlin, Deutschland") als Zeilen: jeder Komma-Teil steht für sich, das Land
 * entfällt — ein Berliner Guide braucht „Deutschland" nicht. So landet ein
 * Hauszusatz wie „KaDeWe" oder „Hinterhof" auf einer eigenen Zeile, statt als
 * Straße zu gelten und den Rest in eine einzige, umbrechende Zeile zu drücken.
 */
export function addressLines(address: string | null | undefined): string[] {
  return (address ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && !/^(deutschland|germany)$/i.test(part));
}

/**
 * Ein Instagram-Name in Stücken, die jeweils auf „." oder „_" enden. Zwischen
 * den Stücken darf die Zeile brechen: ein Name, der auch die volle Breite
 * sprengt, trennt sich dann an seinem eigenen Trennzeichen und nicht mitten im
 * Wort.
 */
export function handleBreakParts(handle: string): string[] {
  return handle.match(/[^._]*[._]+|[^._]+/g) ?? [];
}
