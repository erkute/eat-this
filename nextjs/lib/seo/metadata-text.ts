export const METADATA_TITLE_MAX = 60;
export const METADATA_DESCRIPTION_MAX = 155;
const METADATA_BRAND_SUFFIX = ' | EAT THIS';
const METADATA_TITLE_TEXT_MAX = METADATA_TITLE_MAX - METADATA_BRAND_SUFFIX.length;

const TRAILING_BRAND = /\s*(?:\||[·—–-])\s*eat this(?: berlin)?$/i;

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;

  const slice = text.slice(0, Math.max(1, max - 1)).trimEnd();
  const lastSpace = slice.lastIndexOf(' ');
  const cutAt = lastSpace >= Math.floor(max * 0.6) ? lastSpace : slice.length;
  const clean = slice
    .slice(0, cutAt)
    .replace(/[,:;|/—–-]+$/u, '')
    .trimEnd();
  return `${clean}…`;
}

/**
 * Brand suffix only when the title fits beside it. A longer title keeps all
 * of its words and goes out plain, like `buildPlainTitle`.
 *
 * Until 09.10.2026 the suffix always won and the title was cut to make room:
 * 34 of 64 article titles in the live sitemap went out ellipsised, among them
 * the EN donut guide, "Brammibal’s and Atelier Dough: two takes on a… | EAT
 * THIS" — 3,175 impressions in 90 days, most of them for "best berliner
 * doughnut near me", and the word "donut" was the one that got cut. Google
 * shows the site name beside the title anyway; the words are the part that
 * can only come from the title.
 */
export function buildBrandedTitle(title: string): string {
  const clean = title.trim().replace(/\s+/g, ' ').replace(TRAILING_BRAND, '').trim();
  if (clean.length <= METADATA_TITLE_TEXT_MAX) return `${clean}${METADATA_BRAND_SUFFIX}`;
  return truncateAtWord(clean, METADATA_TITLE_MAX);
}

/**
 * Same cleanup, no brand suffix — the whole 60 characters go to the title.
 *
 * The suffix costs 11 of 60, and on the district pages that was the binding
 * constraint: six of seventeen curated titles were already being cut with an
 * ellipsis, and Lichtenberg's lost the only "Berlin" in the whole set
 * ("Vietnamesisches Berlin" → "Vietnamesisches…"). The brand is in the domain
 * and Google renders the site name beside the title anyway, so on a page whose
 * ranking depends on naming its district AND its city, those characters buy
 * more as content than as branding.
 */
export function buildPlainTitle(title: string): string {
  const clean = title.trim().replace(/\s+/g, ' ').replace(TRAILING_BRAND, '').trim();
  return truncateAtWord(clean, METADATA_TITLE_MAX);
}

export function truncateMetadataDescription(text: string, max = METADATA_DESCRIPTION_MAX): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const stop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (stop >= 40) return slice.slice(0, stop + 1);

  const fallbackSlice = clean.slice(0, max - 2);
  const lastSpace = fallbackSlice.lastIndexOf(' ');
  return `${lastSpace > 0 ? fallbackSlice.slice(0, lastSpace) : fallbackSlice} …`;
}
