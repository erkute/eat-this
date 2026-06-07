import type { RestaurantCard } from './types'
import type { FAQEntry } from './restaurant-prose'

type Loc = 'de' | 'en'

/**
 * Auto-generated prose blocks for the kategorie detail page.
 *
 * Same goal as bezirk-prose: lift unique word count above Google's
 * thin-content bar. Each helper derives from the list of restaurants the
 * page already loads, so no extra Sanity calls are needed.
 */

interface KategorieContext {
  label: string
  restaurants: RestaurantCard[]
  locale: Loc
}

/** Counts of the top districts represented in this category. */
function districtBreakdown(restaurants: RestaurantCard[], limit = 4): { name: string; count: number }[] {
  const tally = new Map<string, number>()
  for (const r of restaurants) {
    if (!r.district) continue
    tally.set(r.district, (tally.get(r.district) ?? 0) + 1)
  }
  return [...tally.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/** Price range across the category (min of mins, max of maxes). */
function priceSpan(restaurants: RestaurantCard[]): { min: number; max: number; currency: string } | null {
  let min = Infinity
  let max = -Infinity
  let currency = '€'
  for (const r of restaurants) {
    const p = r.priceRange
    if (!p) continue
    if (typeof p.min === 'number') min = Math.min(min, p.min)
    if (typeof p.max === 'number') max = Math.max(max, p.max)
    if (p.currency) currency = p.currency === 'EUR' ? '€' : p.currency
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null
  return { min, max, currency }
}

/** One-line factual summary that sits below the kategorie header. */
export function buildKategorieQuickFacts({ label, restaurants, locale }: KategorieContext): string | null {
  const count = restaurants.length
  if (count === 0) return null
  const de = locale === 'de'
  const districts = districtBreakdown(restaurants)
  const span = priceSpan(restaurants)

  const segments: string[] = []
  if (de) {
    segments.push(`${count} von Eat This kuratierte ${label}-Spots in Berlin`)
    if (districts.length > 1) {
      segments.push(`die meisten in ${districts.slice(0, 3).map(d => d.name).join(', ')}`)
    }
    if (span) segments.push(`Preisspanne ${span.min}–${span.max} ${span.currency}`)
    return segments.join('. ') + '.'
  }
  segments.push(`${count} Eat This-curated ${label.toLowerCase()} spots in Berlin`)
  if (districts.length > 1) {
    segments.push(`most of them in ${districts.slice(0, 3).map(d => d.name).join(', ')}`)
  }
  if (span) segments.push(`prices ${span.min}–${span.max} ${span.currency}`)
  return segments.join('. ') + '.'
}

/** FAQ entries derived from the category's restaurant list. */
export function buildKategorieFAQEntries({ label, restaurants, locale }: KategorieContext): FAQEntry[] {
  const de = locale === 'de'
  const entries: FAQEntry[] = []
  if (restaurants.length === 0) return entries

  // 1. How many
  entries.push(
    de
      ? {
          question: `Wie viele ${label}-Spots empfiehlt Eat This in Berlin?`,
          answer: `Aktuell stehen ${restaurants.length} kuratierte ${label}-Spots auf Eat This Berlin.`,
        }
      : {
          question: `How many ${label.toLowerCase()} spots does Eat This recommend in Berlin?`,
          answer: `Eat This Berlin currently features ${restaurants.length} curated ${label.toLowerCase()} spots.`,
        },
  )

  // 2. Districts
  const districts = districtBreakdown(restaurants, 5)
  if (districts.length > 1) {
    const list = districts.map(d => `${d.name} (${d.count})`).join(', ')
    entries.push(
      de
        ? { question: `In welchen Bezirken findet man ${label} in Berlin?`, answer: `Die Auswahl verteilt sich u. a. auf ${list}.` }
        : { question: `Which districts are best for ${label.toLowerCase()} in Berlin?`, answer: `The selection spreads across ${list}.` },
    )
  }

  // 3. Highlights (top 5 by list order)
  if (restaurants.length >= 3) {
    const highlights = restaurants.slice(0, 5).map(r => r.name).join(', ')
    entries.push(
      de
        ? { question: `Was sind bekannte ${label}-Adressen in Berlin?`, answer: `Aus der Auswahl: ${highlights}.` }
        : { question: `What are some notable ${label.toLowerCase()} spots in Berlin?`, answer: `Highlights from the selection: ${highlights}.` },
    )
  }

  // 4. Budget spots (max <= 20)
  const budget = restaurants.filter(r => typeof r.priceRange?.max === 'number' && r.priceRange.max! <= 20).slice(0, 5)
  if (budget.length > 0) {
    const list = budget.map(r => r.name).join(', ')
    entries.push(
      de
        ? { question: `Wo gibt es ${label} in Berlin für kleines Geld?`, answer: `Im unteren Preissegment (bis 20 €): ${list}.` }
        : { question: `Where can I get ${label.toLowerCase()} in Berlin on a budget?`, answer: `In the lower price range (up to €20): ${list}.` },
    )
  }

  // 5. Higher-end spots (min >= 40)
  const fineDining = restaurants.filter(r => typeof r.priceRange?.min === 'number' && r.priceRange.min! >= 40).slice(0, 5)
  if (fineDining.length > 0) {
    const list = fineDining.map(r => r.name).join(', ')
    entries.push(
      de
        ? { question: `Welche ${label}-Spots in Berlin sind gehoben?`, answer: `Im höheren Preissegment (ab 40 €): ${list}.` }
        : { question: `Which ${label.toLowerCase()} spots in Berlin are higher-end?`, answer: `In the higher price range (from €40): ${list}.` },
    )
  }

  return entries
}
