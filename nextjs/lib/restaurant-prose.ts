import type { Restaurant, OpeningHourSlot } from './types'
import { localizedCategoryName } from './categories'
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers'

type Loc = 'de' | 'en'

/**
 * Auto-generated prose blocks that live on the restaurant detail page.
 *
 * The point isn't editorial polish — it's surfacing entity facts as
 * natural language so restaurant pages clear Google's "thin content"
 * bar (target: ~200+ unique words per page) and qualify for indexing.
 * Every helper degrades gracefully when source fields are missing.
 */

/** One-line factual summary between header and description. */
export function buildQuickFacts(r: Restaurant, locale: Loc): string | null {
  const de = locale === 'de'
  const cuisine = r.cuisineType?.trim() || (r.categories?.[0] ? localizedCategoryName(r.categories[0], locale) : null)
  const bezirk = r.bezirk?.name || r.district
  if (!cuisine && !bezirk) return null

  const priceLabel = formatPriceLabel(r)
  const hoursSummary = summarizeHours(r.openingHours, locale)

  const segments: string[] = []
  if (de) {
    if (cuisine && bezirk) segments.push(`${r.name} ist ein ${cuisine}-Restaurant in ${bezirk}`)
    else if (cuisine) segments.push(`${r.name} ist ein ${cuisine}-Restaurant`)
    else if (bezirk) segments.push(`${r.name} liegt in ${bezirk}`)
    if (priceLabel) segments.push(`Preissegment ${priceLabel}`)
    let s = segments.join(', ')
    if (hoursSummary) s += `. Geöffnet ${hoursSummary}`
    return s + '.'
  }
  if (cuisine && bezirk) segments.push(`${r.name} is a ${cuisine} restaurant in ${bezirk}`)
  else if (cuisine) segments.push(`${r.name} is a ${cuisine} restaurant`)
  else if (bezirk) segments.push(`${r.name} is located in ${bezirk}`)
  if (priceLabel) segments.push(`priced ${priceLabel}`)
  let s = segments.join(', ')
  if (hoursSummary) s += `. Open ${hoursSummary}`
  return s + '.'
}

/** Concise multi-slot opening-hours summary, comma-separated. Null when empty. */
export function summarizeHours(slots: OpeningHourSlot[] | undefined, _locale: Loc): string | null {
  if (!slots || slots.length === 0) return null
  return slots.map(s => `${s.days} ${s.hours}`).join(', ')
}

export interface FAQEntry {
  question: string
  answer: string
}

/**
 * FAQ entries built from Sanity fields. Each answer is unique per restaurant
 * (it interpolates the restaurant's own hours / address / cuisine), so this
 * is real unique content — not template noise.
 *
 * Missing source fields skip the corresponding entry rather than emit
 * "Information not available", which would itself be near-duplicate filler.
 */
export function buildFAQEntries(r: Restaurant, locale: Loc): FAQEntry[] {
  const de = locale === 'de'
  const name = r.name
  const bezirk = r.bezirk?.name || r.district
  const entries: FAQEntry[] = []

  if (r.openingHours && r.openingHours.length > 0) {
    const summary = summarizeHours(r.openingHours, locale)!
    entries.push(
      de
        ? { question: `Wann hat ${name} geöffnet?`, answer: `${name} ist ${summary} geöffnet.` }
        : { question: `When is ${name} open?`, answer: `${name} is open ${summary}.` },
    )
  }

  if (r.address) {
    entries.push(
      de
        ? {
            question: `Wo befindet sich ${name}?`,
            answer: bezirk
              ? `${name} liegt in ${bezirk} — ${r.address}.`
              : `${name} liegt unter der Adresse ${r.address}.`,
          }
        : {
            question: `Where is ${name} located?`,
            answer: bezirk ? `${name} is in ${bezirk} — ${r.address}.` : `${name} is at ${r.address}.`,
          },
    )
  }

  const cuisineParts = [r.cuisineType?.trim() || null, ...(r.categories?.slice(0, 3).map(c => localizedCategoryName(c, locale)) ?? [])].filter(
    (s): s is string => !!s && s.length > 0,
  )
  if (cuisineParts.length > 0) {
    const text = cuisineParts.join(' · ')
    entries.push(
      de
        ? { question: `Welche Küche bietet ${name}?`, answer: `${name} serviert ${text}.` }
        : { question: `What kind of food does ${name} serve?`, answer: `${name} serves ${text}.` },
    )
  }

  const priceLabel = formatPriceLabel(r)
  if (priceLabel) {
    entries.push(
      de
        ? { question: `Was kostet ein Essen bei ${name}?`, answer: `Bei ${name} liegt das Preissegment bei ${priceLabel}.` }
        : { question: `How expensive is ${name}?`, answer: `${name} sits in the ${priceLabel} price range.` },
    )
  }

  if (r.reservationUrl) {
    entries.push(
      de
        ? { question: `Kann man bei ${name} reservieren?`, answer: `Ja, ${name} bietet eine Online-Reservierung an.` }
        : { question: `Can I make a reservation at ${name}?`, answer: `Yes, ${name} offers online reservations.` },
    )
  }

  return entries
}
