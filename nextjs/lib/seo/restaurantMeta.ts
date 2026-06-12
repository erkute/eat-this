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
 * Antwort-Versprechen-Description für Seiten mit gepflegten `whatToOrder`-
 * Empfehlungen: bedient die „karte/speisekarte"-Suchintention direkt im
 * Snippet („Was bestellen? Was kostet's?") statt nur zu beschreiben.
 * Kuratierte `seo.metaDescription` überschreibt den Builder im Aufrufer.
 * Null ohne Gerichte.
 */
export function buildOrderPromiseDescription(opts: {
  name: string
  dishes: string[]
  priceLabel?: string | null
  locale: 'de' | 'en'
}): string | null {
  const { name, priceLabel, locale } = opts
  const dishes = opts.dishes.map(d => d.trim()).filter(Boolean).slice(0, 3)
  if (dishes.length === 0) return null

  const dishList =
    dishes.length === 1 ? dishes[0]! : `${dishes.slice(0, -1).join(', ')} & ${dishes[dishes.length - 1]}`
  const price = priceLabel ? ` (${priceLabel})` : ''

  return locale === 'de'
    ? `Was bestellen bei ${name}? ${dishList} — unsere Empfehlungen mit Preisen${price}, und ob sich der Besuch lohnt.`
    : `What to order at ${name}? ${dishList} — our picks with prices${price}, and whether it's worth the visit.`
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
  // Satzgrenze muss hinter der 40-Zeichen-Marke liegen — frühere Treffer
  // sind eher Abkürzungen oder Mini-Opener, die allein keinen Sinn ergeben.
  if (stop >= 40) return slice.slice(0, stop + 1)
  // Ellipsis path: reserve 2 chars (' …') so the total stays ≤ max.
  const fallbackSlice = clean.slice(0, max - 2)
  const lastSpace = fallbackSlice.lastIndexOf(' ')
  return (lastSpace > 0 ? fallbackSlice.slice(0, lastSpace) : fallbackSlice) + ' …'
}
