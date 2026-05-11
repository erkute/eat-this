import { describe, it, expect } from 'vitest'
import type { Restaurant } from '@/lib/types'
import { buildQuickFacts, buildFAQEntries, summarizeHours } from '@/lib/restaurant-prose'

function makeRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    _id: 'r1',
    name: '893 Ryōtei',
    slug: '893-ryotei',
    lat: 52.5,
    lng: 13.4,
    cuisineType: 'Japanese',
    address: 'Kantstraße 135, 10623 Berlin',
    openingHours: [{ days: 'Tue-Sat', hours: '18:00-23:00' }],
    priceRange: { min: 40, max: 100, currency: 'EUR' },
    reservationUrl: 'https://example.com/reserve',
    bezirk: { _id: 'b1', name: 'Charlottenburg', slug: 'charlottenburg' },
    categories: [{ slug: 'dinner', name: 'Abendessen', nameEn: 'Dinner' }],
    ...overrides,
  }
}

describe('buildQuickFacts', () => {
  it('renders the full DE sentence with cuisine, bezirk, price, hours', () => {
    expect(buildQuickFacts(makeRestaurant(), 'de')).toBe(
      '893 Ryōtei ist ein Japanese-Restaurant in Charlottenburg, Preissegment 40–100 €. Geöffnet Tue-Sat 18:00-23:00.',
    )
  })

  it('renders an EN equivalent', () => {
    expect(buildQuickFacts(makeRestaurant(), 'en')).toBe(
      '893 Ryōtei is a Japanese restaurant in Charlottenburg, priced 40–100 €. Open Tue-Sat 18:00-23:00.',
    )
  })

  it('drops missing segments rather than emitting filler', () => {
    const r = makeRestaurant({ cuisineType: undefined, categories: undefined, priceRange: undefined, openingHours: undefined })
    expect(buildQuickFacts(r, 'de')).toBe('893 Ryōtei liegt in Charlottenburg.')
  })

  it('falls back to the first category when no cuisineType is set', () => {
    const r = makeRestaurant({ cuisineType: undefined })
    expect(buildQuickFacts(r, 'de')).toContain('Abendessen-Restaurant in Charlottenburg')
  })

  it('returns null when neither cuisine nor bezirk are known', () => {
    const r = makeRestaurant({ cuisineType: undefined, categories: undefined, bezirk: undefined, district: undefined })
    expect(buildQuickFacts(r, 'de')).toBeNull()
  })
})

describe('summarizeHours', () => {
  it('joins multiple slots with a comma', () => {
    expect(
      summarizeHours(
        [
          { days: 'Mo-Fr', hours: '11:00-15:00' },
          { days: 'Sa', hours: '11:00-22:00' },
        ],
        'de',
      ),
    ).toBe('Mo-Fr 11:00-15:00, Sa 11:00-22:00')
  })

  it('returns null on empty input', () => {
    expect(summarizeHours(undefined, 'de')).toBeNull()
    expect(summarizeHours([], 'de')).toBeNull()
  })
})

describe('buildFAQEntries', () => {
  it('emits five entries when all source fields are present', () => {
    const entries = buildFAQEntries(makeRestaurant(), 'de')
    expect(entries.map(e => e.question)).toEqual([
      'Wann hat 893 Ryōtei geöffnet?',
      'Wo befindet sich 893 Ryōtei?',
      'Welche Küche bietet 893 Ryōtei?',
      'Was kostet ein Essen bei 893 Ryōtei?',
      'Kann man bei 893 Ryōtei reservieren?',
    ])
  })

  it('skips entries whose source data is missing', () => {
    const entries = buildFAQEntries(
      makeRestaurant({ openingHours: undefined, reservationUrl: undefined, priceRange: undefined }),
      'de',
    )
    expect(entries.map(e => e.question)).toEqual([
      'Wo befindet sich 893 Ryōtei?',
      'Welche Küche bietet 893 Ryōtei?',
    ])
  })

  it('interpolates unique answer content per restaurant', () => {
    const a = buildFAQEntries(makeRestaurant({ name: 'A', address: 'Foostr. 1' }), 'de')
    const b = buildFAQEntries(makeRestaurant({ name: 'B', address: 'Barstr. 2' }), 'de')
    expect(a[1].answer).toContain('Foostr. 1')
    expect(b[1].answer).toContain('Barstr. 2')
    expect(a[1].answer).not.toEqual(b[1].answer)
  })

  it('renders EN copy when locale is en', () => {
    const entries = buildFAQEntries(makeRestaurant(), 'en')
    expect(entries[0].question).toBe('When is 893 Ryōtei open?')
    expect(entries[0].answer).toBe('893 Ryōtei is open Tue-Sat 18:00-23:00.')
  })
})
