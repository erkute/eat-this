import type { Restaurant, OpeningHourSlot } from './types'
import { localizedCategoryName } from './categories'
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers'
import { pickLocale } from '@/lib/i18n/pickLocale'

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
  const hoursSummary = summarizeHours(r.openingHours)

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
export function summarizeHours(slots: OpeningHourSlot[] | undefined): string | null {
  if (!slots || slots.length === 0) return null
  return slots.map(s => `${s.days} ${s.hours}`).join(', ')
}

export interface FAQEntry {
  question: string
  answer: string
}

/**
 * Magazine-style split of the long description into editorial pieces.
 * Preserves the author's paragraph breaks (`\n\n`) so rhythm survives —
 * the previous flat-string body was visually compressing multi-paragraph
 * descriptions into a single wall of text.
 *
 *   - `lede`  — first sentence of the first paragraph, rendered as
 *               display-sized pull-quote *intro*.
 *   - `paragraphsBefore` — body paragraphs that come before the midQuote
 *                          (or all body paragraphs when no midQuote fires).
 *   - `midQuote` — first sentence of the middle paragraph, pulled out as
 *                  a block-quote between paragraphs. Only emitted when the
 *                  body has ≥3 paragraphs AND that sentence is quotable
 *                  (60–220 chars). Short bodies skip the quote entirely.
 *   - `paragraphsAfter`  — body paragraphs after the midQuote.
 *
 * No editorial Sanity field is involved: this is pure presentation.
 */
export interface MagazineDescription {
  lede:             string
  paragraphsBefore: string[]
  midQuote:         string | null
  paragraphsAfter:  string[]
}

export function splitDescriptionForMagazine(
  description: string | undefined,
): MagazineDescription | null {
  const text = (description ?? '').trim()
  if (!text) return null

  // Split source into paragraphs on 2+ consecutive newlines. Single \n is
  // treated as a soft break inside a paragraph (standard prose convention).
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  if (paragraphs.length === 0) return null

  // Lede = first sentence of paragraph 1. The remainder of paragraph 1 (if
  // any) becomes the leading body paragraph.
  const firstPara = paragraphs[0]!
  const ledeMatch = firstPara.match(/^([\s\S]+?[.!?])\s+([\s\S]+)$/)
  let lede: string
  let firstParaRest = ''
  if (ledeMatch) {
    lede = ledeMatch[1]!.trim()
    firstParaRest = ledeMatch[2]!.trim()
  } else {
    lede = firstPara
  }

  const bodyParagraphs: string[] = []
  if (firstParaRest) bodyParagraphs.push(firstParaRest)
  for (let i = 1; i < paragraphs.length; i++) bodyParagraphs.push(paragraphs[i]!)

  // Mid-page pull-quote: only fires when the body has ≥3 paragraphs AND the
  // first sentence of the middle paragraph is quotable (60-220 chars). For
  // shorter bodies we keep the rhythm clean — just paragraphs, no quote.
  let midQuote:        string   | null = null
  let paragraphsBefore: string[]      = bodyParagraphs
  let paragraphsAfter:  string[]      = []

  if (bodyParagraphs.length >= 3) {
    const midIdx     = Math.floor(bodyParagraphs.length / 2)
    const midPara    = bodyParagraphs[midIdx]!
    const midSentences = splitSentences(midPara)
    const firstMid   = midSentences[0]?.trim() ?? ''
    if (firstMid.length >= 60 && firstMid.length <= 220) {
      midQuote = firstMid
      const midRest = midSentences.slice(1).join(' ').trim()
      paragraphsBefore = bodyParagraphs.slice(0, midIdx)
      paragraphsAfter  = [
        ...(midRest ? [midRest] : []),
        ...bodyParagraphs.slice(midIdx + 1),
      ]
    }
  }

  return { lede, paragraphsBefore, midQuote, paragraphsAfter }
}

// Sentence splitter that doesn't get fooled by abbreviations like "z.B."
// or "i.e." — keeps trailing whitespace + punctuation with each sentence.
function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/)
  return parts.map(p => p.trim()).filter(Boolean)
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
  const tip = pickLocale(r.tip, r.tipEn, locale)
  const entries: FAQEntry[] = []

  if (tip) {
    entries.push(
      de
        ? { question: `Was sollte man bei ${name} bestellen?`, answer: tip }
        : { question: `What should I order at ${name}?`, answer: tip },
    )
  }

  if (r.address) {
    entries.push(
      de
        ? {
            question: `Wo finde ich ${name}?`,
            answer: bezirk
              ? `${name} liegt in ${bezirk}, ${r.address}.`
              : `${name} liegt an der Adresse ${r.address}.`,
          }
        : {
            question: `Where do I find ${name}?`,
            answer: bezirk ? `${name} is in ${bezirk}, ${r.address}.` : `${name} is at ${r.address}.`,
          },
    )
  }

  if (r.openingHours && r.openingHours.length > 0) {
    const summary = summarizeHours(r.openingHours)
    if (summary) {
      entries.push(
        de
          ? { question: `Wann hat ${name} geöffnet?`, answer: `Geöffnet ${summary}.` }
          : { question: `When is ${name} open?`, answer: `Open ${summary}.` },
      )
    }
  }

  if (r.reservationUrl) {
    entries.push(
      de
        ? {
            question: `Sollte ich bei ${name} reservieren?`,
            answer: `Eine Reservierung ist online möglich und wird empfohlen.`,
          }
        : {
            question: `Should I book ahead at ${name}?`,
            answer: `Online reservations are available and recommended.`,
          },
    )
  }

  const priceLabel = formatPriceLabel(r)
  if (priceLabel) {
    entries.push(
      de
        ? { question: `Was zahlt man bei ${name}?`, answer: `Hauptgerichte und Drinks bewegen sich im Bereich ${priceLabel}.` }
        : { question: `What does ${name} cost?`, answer: `Mains and drinks sit in the ${priceLabel} range.` },
    )
  }

  const cuisineParts = [r.cuisineType?.trim() || null, ...(r.categories?.slice(0, 3).map(c => localizedCategoryName(c, locale)) ?? [])].filter(
    (s): s is string => !!s && s.length > 0,
  )
  if (cuisineParts.length > 0) {
    const text = cuisineParts.join(' · ')
    entries.push(
      de
        ? { question: `Wofür steht ${name} kulinarisch?`, answer: `${name} steht für ${text}.` }
        : { question: `What does ${name} stand for?`, answer: `${name} stands for ${text}.` },
    )
  }

  return entries
}
