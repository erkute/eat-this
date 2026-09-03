import { describe, it, expect } from 'vitest'
import type { RestaurantCard } from '@/lib/types'
import { buildKategorieFAQEntries } from '@/lib/kategorie-prose'

function r(name: string, opts: Partial<RestaurantCard> = {}): RestaurantCard {
  return {
    _id: name,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    district: 'Mitte',
    priceRange: { min: 5, max: 15, currency: 'EUR' },
    ...opts,
  }
}

describe('buildKategorieFAQEntries', () => {
  const restaurants = [
    r('Alpha', { district: 'Mitte' }),
    r('Beta', { district: 'Mitte' }),
    r('Gamma', { district: 'Kreuzberg', priceRange: { min: 45, max: 120, currency: 'EUR' } }),
    r('Delta', { district: 'Neukölln', priceRange: { min: 8, max: 18, currency: 'EUR' } }),
  ]

  it('returns no entries without restaurants', () => {
    expect(
      buildKategorieFAQEntries({ slug: 'pizza', label: 'Pizza', restaurants: [], locale: 'de' })
    ).toEqual([])
  })

  it('builds count, district and highlight entries (DE)', () => {
    const entries = buildKategorieFAQEntries({ slug: 'pizza', label: 'Pizza', restaurants, locale: 'de' })
    const questions = entries.map(e => e.question)
    expect(questions).toContain('Wie viele Spots für Pizza in Berlin empfiehlt Eat This?')
    expect(questions).toContain('In welchen Bezirken findet man Pizza in Berlin?')
    expect(questions).toContain('Was sind bekannte Adressen für Pizza in Berlin?')

    const count = entries.find(e => e.question.startsWith('Wie viele'))
    expect(count?.answer).toContain('4 kuratierte Spots für Pizza in Berlin')
  })

  it('carries no price statements at all', () => {
    // Preis ist auf der Kategorie-Seite bewusst kein Thema mehr — weder als
    // Spanne im Banner noch als Schwelle in der FAQ.
    for (const locale of ['de', 'en'] as const) {
      const entries = buildKategorieFAQEntries({ slug: 'pizza', label: 'Pizza', restaurants, locale })
      const all = entries.map(e => `${e.question} ${e.answer}`).join(' ')
      expect(all).not.toMatch(/€|Preissegment|kleines Geld|gehoben|budget|price/i)
    }
  })

  it('asks in German search vocabulary, not the catalogue label', () => {
    const entries = buildKategorieFAQEntries({ slug: 'lunch', label: 'Lunch', restaurants, locale: 'de' })
    expect(entries.every(e => !e.question.includes('Lunch'))).toBe(true)
    expect(entries.some(e => e.question.includes('Mittagessen'))).toBe(true)
  })

  it('phrases venue categories without the "Spots für" scaffold', () => {
    const entries = buildKategorieFAQEntries({ slug: 'coffee', label: 'Coffee', restaurants, locale: 'de' })
    const questions = entries.map(e => e.question)
    expect(questions).toContain('Wie viele Cafés in Berlin empfiehlt Eat This?')
    expect(questions).toContain('Was sind bekannte Cafés in Berlin?')
  })

  it('interpolates restaurant data into answers (EN)', () => {
    const entries = buildKategorieFAQEntries({ slug: 'coffee', label: 'Coffee', restaurants, locale: 'en' })
    const districts = entries.find(e => e.question.includes('districts'))
    expect(districts?.answer).toContain('Mitte (2)')
    const highlights = entries.find(e => e.question.includes('notable'))
    expect(highlights?.answer).toContain('Alpha')
  })

  it('keeps numeric names out of the "notable addresses" answer', () => {
    // Sanity liefert alphabetisch: ein blankes slice(0,5) machte aus
    // „136 Berlin Restaurant, 1811, 963“ die bekanntesten Adressen.
    const mixed = [
      r('136 Berlin Restaurant'),
      r('1811'),
      r('963'),
      r('Bari', { tip: 'Handmade pasta' }),
      r('Gemello', { shortDescription: 'Vegane Pizza' }),
      r('Kuréme', { photo: 'https://cdn.example/x.webp' }),
    ]
    const entries = buildKategorieFAQEntries({
      slug: 'lunch',
      label: 'Lunch',
      restaurants: mixed,
      locale: 'de',
    })
    const highlights = entries.find(e => e.question.includes('bekannte Adressen'))!
    expect(highlights.answer).toContain('Bari')
    expect(highlights.answer).toContain('Gemello')
    expect(highlights.answer).not.toContain('1811')
    expect(highlights.answer).not.toContain('963')
  })

  it('answers "notable addresses" from the curated list when there is one', () => {
    const curated = [r('Jules Geisberg'), r('Kolo Coffee'), r('Bonanza Coffee Heroes')]
    const entries = buildKategorieFAQEntries({
      slug: 'coffee',
      label: 'Coffee',
      restaurants,
      locale: 'de',
      curated,
    })
    const highlights = entries.find(e => e.question.includes('bekannte'))!
    expect(highlights.answer).toContain('Jules Geisberg, Kolo Coffee, Bonanza Coffee Heroes')
    // Die alphabetische Heuristik darf nicht mehr durchschlagen.
    expect(highlights.answer).not.toContain('Alpha')
  })

  it('keeps the curated order and caps the answer at five names', () => {
    const curated = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'].map(n => r(n))
    const entries = buildKategorieFAQEntries({
      slug: 'lunch',
      label: 'Lunch',
      restaurants,
      locale: 'de',
      curated,
    })
    const highlights = entries.find(e => e.question.includes('bekannte'))!
    expect(highlights.answer).toContain('One, Two, Three, Four, Five')
    expect(highlights.answer).not.toContain('Six')
  })

  it('falls back to the heuristic when nothing is curated', () => {
    for (const curated of [undefined, []]) {
      const entries = buildKategorieFAQEntries({
        slug: 'pizza',
        label: 'Pizza',
        restaurants,
        locale: 'de',
        curated,
      })
      const highlights = entries.find(e => e.question.includes('bekannte'))!
      expect(highlights.answer).toContain('Alpha')
    }
  })

  it('ranks editorial content above bare entries', () => {
    const cards = [
      r('Aaa'),
      r('Bbb'),
      r('Zzz', { tip: 'Tipp', shortDescription: 'Text', photo: 'https://cdn.example/z.webp' }),
    ]
    const entries = buildKategorieFAQEntries({
      slug: 'lunch',
      label: 'Lunch',
      restaurants: cards,
      locale: 'de',
    })
    const highlights = entries.find(e => e.question.includes('bekannte Adressen'))!
    expect(highlights.answer).toContain('Zzz, Aaa, Bbb')
  })
})
