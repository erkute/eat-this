import { describe, it, expect } from 'vitest'
import type { RestaurantCard } from '@/lib/types'
import { buildKategorieQuickFacts, buildKategorieFAQEntries } from '@/lib/kategorie-prose'

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

describe('buildKategorieQuickFacts', () => {
  it('summarises count, districts and price span in DE', () => {
    const restaurants = [
      r('A', { district: 'Mitte' }),
      r('B', { district: 'Mitte' }),
      r('C', { district: 'Kreuzberg', priceRange: { min: 40, max: 100, currency: 'EUR' } }),
      r('D', { district: 'Neukölln', priceRange: { min: 10, max: 60, currency: 'EUR' } }),
    ]
    const text = buildKategorieQuickFacts({ label: 'Pizza', restaurants, locale: 'de' })
    expect(text).toContain('4 von Eat This kuratierte Pizza-Spots in Berlin')
    expect(text).toContain('Mitte')
    expect(text).toContain('Preisspanne 5–100 €')
  })

  it('returns null when no restaurants are loaded', () => {
    expect(buildKategorieQuickFacts({ label: 'Pizza', restaurants: [], locale: 'de' })).toBeNull()
  })

  it('omits district segment when only one district is present', () => {
    const restaurants = [r('A'), r('B')]
    const text = buildKategorieQuickFacts({ label: 'Pizza', restaurants, locale: 'de' })
    expect(text).not.toContain('die meisten in')
  })

  it('renders EN copy for the en locale', () => {
    const restaurants = [r('A'), r('B', { district: 'Kreuzberg' })]
    const text = buildKategorieQuickFacts({ label: 'Coffee', restaurants, locale: 'en' })
    expect(text).toContain('2 Eat This-curated coffee spots in Berlin')
  })
})

describe('buildKategorieFAQEntries', () => {
  const restaurants = [
    r('Alpha', { district: 'Mitte' }),
    r('Beta', { district: 'Mitte' }),
    r('Gamma', { district: 'Kreuzberg', priceRange: { min: 45, max: 120, currency: 'EUR' } }),
    r('Delta', { district: 'Neukölln', priceRange: { min: 8, max: 18, currency: 'EUR' } }),
  ]

  it('returns no entries without restaurants', () => {
    expect(buildKategorieFAQEntries({ label: 'Pizza', restaurants: [], locale: 'de' })).toEqual([])
  })

  it('builds count, district, highlight, budget and high-end entries (DE)', () => {
    const entries = buildKategorieFAQEntries({ label: 'Pizza', restaurants, locale: 'de' })
    const questions = entries.map(e => e.question)
    expect(questions).toContain('Wie viele Pizza-Spots empfiehlt Eat This in Berlin?')
    expect(questions).toContain('In welchen Bezirken findet man Pizza in Berlin?')
    expect(questions).toContain('Was sind bekannte Pizza-Adressen in Berlin?')
    expect(questions).toContain('Wo gibt es Pizza in Berlin für kleines Geld?')
    expect(questions).toContain('Welche Pizza-Spots in Berlin sind gehoben?')

    const count = entries.find(e => e.question.startsWith('Wie viele'))
    expect(count?.answer).toContain('4 kuratierte Pizza-Spots')
    const budget = entries.find(e => e.question.includes('kleines Geld'))
    expect(budget?.answer).toContain('Delta')
    const fine = entries.find(e => e.question.includes('gehoben'))
    expect(fine?.answer).toContain('Gamma')
  })

  it('interpolates restaurant data into answers (EN)', () => {
    const entries = buildKategorieFAQEntries({ label: 'Coffee', restaurants, locale: 'en' })
    const districts = entries.find(e => e.question.includes('districts'))
    expect(districts?.answer).toContain('Mitte (2)')
    const highlights = entries.find(e => e.question.includes('notable'))
    expect(highlights?.answer).toContain('Alpha')
  })

  it('skips budget entry when no spot is in the bucket', () => {
    const expensive = [
      r('A', { priceRange: { min: 45, max: 90, currency: 'EUR' } }),
      r('B', { priceRange: { min: 50, max: 120, currency: 'EUR' }, district: 'Kreuzberg' }),
    ]
    const entries = buildKategorieFAQEntries({ label: 'Fine Dining', restaurants: expensive, locale: 'de' })
    expect(entries.some(e => e.question.includes('kleines Geld'))).toBe(false)
  })
})
