import { CUISINE_LABELS_DE } from './cuisineLabels'

const TITLE_BUDGET = 62
const BRAND_SUFFIX = ' | EAT THIS'

/**
 * SERP-Title für Restaurant-Seiten: `{Name} – {Label} in Berlin-{Bezirk}`.
 * Edge-Cases: Name enthält "Berlin" → kein Doppel-Berlin; über Budget →
 * Label fällt weg, Standort-Keyword bleibt. Sanity `seo.metaTitle`
 * überschreibt den Builder im Aufrufer.
 */
export function buildRestaurantTitle(opts: {
  name: string
  cuisineType?: string | null
  district?: string | null
  locale: 'de' | 'en'
}): string {
  const { name, cuisineType, district, locale } = opts
  const label = cuisineType
    ? locale === 'de'
      ? (CUISINE_LABELS_DE[cuisineType] ?? cuisineType)
      : cuisineType
    : null
  const nameHasBerlin = /berlin/i.test(name)
  const place = district
    ? nameHasBerlin
      ? `in ${district}`
      : `in Berlin-${district}`
    : nameHasBerlin
      ? null
      : 'in Berlin'

  const compose = (mid: string | null) => (mid ? `${name} – ${mid}` : name) + BRAND_SUFFIX

  const full = compose([label, place].filter(Boolean).join(' ') || null)
  if (full.length <= TITLE_BUDGET || !label) return full
  // Über Budget: Cuisine-Label opfern, Standort-Keyword behalten.
  return compose(district ? (nameHasBerlin ? district : `Berlin-${district}`) : place)
}

/**
 * Meta-Description-Kürzung auf ≤max Zeichen an der letzten Satzgrenze
 * (statt Google-Hard-Cut mitten im Wort). Ohne Satzende im Fenster:
 * Wortgrenze + Ellipse.
 */
export function truncateAtSentence(text: string, max = 160): string {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (clean.length <= max) return clean
  const slice = clean.slice(0, max)
  const stop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '))
  if (stop >= 40) return slice.slice(0, stop + 1)
  // Ellipsis path: reserve 2 chars (' …') so the total stays ≤ max.
  const fallbackSlice = clean.slice(0, max - 2)
  const lastSpace = fallbackSlice.lastIndexOf(' ')
  return (lastSpace > 0 ? fallbackSlice.slice(0, lastSpace) : fallbackSlice) + ' …'
}
