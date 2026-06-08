import type { BezirkDoc, RestaurantCard } from './types'
import { localizedCategoryName } from './categories'
import type { FAQEntry } from './restaurant-prose'

type Loc = 'de' | 'en'

/**
 * Auto-generated prose blocks for the bezirk detail page.
 *
 * Same goal as restaurant-prose: lift unique word count above Google's
 * thin-content bar. Each helper derives from the list of restaurants the
 * page already loads, so no extra Sanity calls are needed.
 */

interface BezirkContext {
  bezirk: Pick<BezirkDoc, 'name'>
  restaurants: RestaurantCard[]
  locale: Loc
}

/** Counts of the top categories represented in this bezirk. */
function categoryBreakdown(restaurants: RestaurantCard[], locale: Loc, limit = 3): { label: string; count: number }[] {
  const tally = new Map<string, { label: string; count: number }>()
  for (const r of restaurants) {
    for (const cat of r.categories ?? []) {
      const label = localizedCategoryName(cat, locale)
      const prev = tally.get(cat.slug)
      if (prev) prev.count += 1
      else tally.set(cat.slug, { label, count: 1 })
    }
  }
  return [...tally.values()].sort((a, b) => b.count - a.count).slice(0, limit)
}

/** Price range across the bezirk (min of mins, max of maxes). */
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

/** One-line factual summary that sits below the bezirk header. */
export function buildBezirkQuickFacts({ bezirk, restaurants, locale }: BezirkContext): string | null {
  const count = restaurants.length
  if (count === 0) return null
  const de = locale === 'de'
  const cats = categoryBreakdown(restaurants, locale)
  const span = priceSpan(restaurants)

  const segments: string[] = []
  if (de) {
    segments.push(`In ${bezirk.name} stehen ${count} von Eat This kuratierte Restaurants`)
    if (cats.length > 0) {
      const catText = cats.map(c => `${c.count} ${c.label}`).join(', ')
      segments.push(`Schwerpunkte: ${catText}`)
    }
    if (span) segments.push(`Preisspanne ${span.min}–${span.max} ${span.currency}`)
    return segments.join('. ') + '.'
  }
  segments.push(`${count} Eat This-curated restaurants in ${bezirk.name}`)
  if (cats.length > 0) {
    const catText = cats.map(c => `${c.count} ${c.label}`).join(', ')
    segments.push(`mostly ${catText}`)
  }
  if (span) segments.push(`prices ${span.min}–${span.max} ${span.currency}`)
  return segments.join('. ') + '.'
}

/** FAQ entries derived from the bezirk's restaurant list. */
export function buildBezirkFAQEntries({ bezirk, restaurants, locale }: BezirkContext): FAQEntry[] {
  const de = locale === 'de'
  const entries: FAQEntry[] = []
  const name = bezirk.name
  if (restaurants.length === 0) return entries

  // 1. How many
  entries.push(
    de
      ? {
          question: `Wie viele Restaurants empfiehlt Eat This in ${name}?`,
          answer: `Aktuell stehen ${restaurants.length} kuratierte Spots in ${name} auf Eat This Berlin.`,
        }
      : {
          question: `How many restaurants does Eat This recommend in ${name}?`,
          answer: `Eat This Berlin currently features ${restaurants.length} curated spots in ${name}.`,
        },
  )

  // 2. Categories / cuisines
  const cats = categoryBreakdown(restaurants, locale, 5)
  if (cats.length > 0) {
    const list = cats.map(c => c.label).join(', ')
    entries.push(
      de
        ? { question: `Welche Restaurant-Kategorien gibt es in ${name}?`, answer: `In ${name}: ${list}.` }
        : { question: `What kinds of restaurants are in ${name}?`, answer: `In ${name}: ${list}.` },
    )
  }

  // 2b. Discovery-Intent: "wo gibt es die beste {Kategorie} in {Bezirk}" —
  // genau die Long-Tail-Query, für die der Hub ranken soll. Nennt die
  // Top-Kategorie + bis zu drei Spots, die dieser Kategorie angehören.
  const topCat = cats[0]
  if (topCat) {
    const inCat = restaurants
      .filter(r => (r.categories ?? []).some(c => localizedCategoryName(c, locale) === topCat.label))
      .slice(0, 3)
      .map(r => r.name)
    if (inCat.length > 0) {
      const list = inCat.join(', ')
      // "die besten {Kategorie}-Spots" statt "die beste {Kategorie}" — vermeidet
      // den Genus-Bruch ("die beste Café"/"die beste Frühstück" wären falsch) und
      // bleibt brand-konform (das Team sagt durchgängig "Spots").
      entries.push(
        de
          ? {
              question: `Wo gibt es die besten ${topCat.label}-Spots in ${name}?`,
              answer: `Für ${topCat.label} in ${name} empfiehlt Eat This: ${list}.`,
            }
          : {
              question: `Where are the best ${topCat.label} spots in ${name}?`,
              answer: `For ${topCat.label} in ${name}, Eat This recommends: ${list}.`,
            },
      )
    }
  }

  // 3. Highlights (top 5 by name order — alpha)
  if (restaurants.length >= 3) {
    const highlights = restaurants.slice(0, 5).map(r => r.name).join(', ')
    entries.push(
      de
        ? { question: `Was sind bekannte Restaurants in ${name}?`, answer: `Aus der Auswahl: ${highlights}.` }
        : { question: `What are some notable restaurants in ${name}?`, answer: `Highlights from the selection: ${highlights}.` },
    )
  }

  // 4. Budget spots (max <= 20)
  const budget = restaurants.filter(r => typeof r.priceRange?.max === 'number' && r.priceRange.max! <= 20).slice(0, 5)
  if (budget.length > 0) {
    const list = budget.map(r => r.name).join(', ')
    entries.push(
      de
        ? { question: `Wo isst man in ${name} günstig?`, answer: `Im unteren Preissegment (bis 20 €): ${list}.` }
        : { question: `Where can I eat cheap in ${name}?`, answer: `In the lower price range (up to €20): ${list}.` },
    )
  }

  // 5. Higher-end spots (min >= 40)
  const fineDining = restaurants.filter(r => typeof r.priceRange?.min === 'number' && r.priceRange.min! >= 40).slice(0, 5)
  if (fineDining.length > 0) {
    const list = fineDining.map(r => r.name).join(', ')
    entries.push(
      de
        ? { question: `Wo isst man in ${name} gehoben?`, answer: `Im höheren Preissegment (ab 40 €): ${list}.` }
        : { question: `Where is fine dining in ${name}?`, answer: `In the higher price range (from €40): ${list}.` },
    )
  }

  return entries
}
