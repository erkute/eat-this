import { describe, it, expect } from 'vitest'
import type { Restaurant } from '@/lib/types'
import { buildFAQEntries, buildWhatToOrderAnswer, summarizeHours } from '@/lib/restaurant-prose'

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

describe('summarizeHours', () => {
  it('joins multiple slots with a comma', () => {
    expect(
      summarizeHours([
        { days: 'Mo-Fr', hours: '11:00-15:00' },
        { days: 'Sa', hours: '11:00-22:00' },
      ]),
    ).toBe('Mo-Fr 11:00-15:00, Sa 11:00-22:00')
  })

  it('returns null on empty input', () => {
    expect(summarizeHours(undefined)).toBeNull()
    expect(summarizeHours([])).toBeNull()
  })
})

describe('buildFAQEntries', () => {
  it('emits five entries when all source fields are present', () => {
    const entries = buildFAQEntries(makeRestaurant(), 'de')
    expect(entries.map(e => e.question)).toEqual([
      'Wo finde ich 893 Ryōtei?',
      'Wann hat 893 Ryōtei geöffnet?',
      'Sollte ich bei 893 Ryōtei reservieren?',
      'Was zahlt man bei 893 Ryōtei?',
      'Wofür steht 893 Ryōtei kulinarisch?',
    ])
  })

  it('skips entries whose source data is missing', () => {
    const entries = buildFAQEntries(
      makeRestaurant({ openingHours: undefined, reservationUrl: undefined, priceRange: undefined }),
      'de',
    )
    expect(entries.map(e => e.question)).toEqual([
      'Wo finde ich 893 Ryōtei?',
      'Wofür steht 893 Ryōtei kulinarisch?',
    ])
  })

  it('interpolates unique answer content per restaurant', () => {
    const a = buildFAQEntries(makeRestaurant({ name: 'A', address: 'Foostr. 1' }), 'de')
    const b = buildFAQEntries(makeRestaurant({ name: 'B', address: 'Barstr. 2' }), 'de')
    expect(a[0].answer).toContain('Foostr. 1')
    expect(b[0].answer).toContain('Barstr. 2')
    expect(a[0].answer).not.toEqual(b[0].answer)
  })

  it('renders EN copy when locale is en', () => {
    const entries = buildFAQEntries(makeRestaurant(), 'en')
    expect(entries[0].question).toBe('Where do I find 893 Ryōtei?')
    expect(entries[0].answer).toBe('893 Ryōtei is in Charlottenburg, Kantstraße 135, 10623 Berlin.')
  })

  it('answers the order question from whatToOrder when maintained, beating tip', () => {
    const entries = buildFAQEntries(
      makeRestaurant({
        tip: 'Unbedingt das Omakase.',
        whatToOrder: [{ dish: 'Omakase-Menü', note: 'Zwölf Gänge, jeden Cent wert.', price: '120 €' }],
      }),
      'de',
    )
    expect(entries[0].question).toBe('Was sollte man bei 893 Ryōtei bestellen?')
    expect(entries[0].answer).toBe('Unsere Empfehlungen: Omakase-Menü (120 €) — Zwölf Gänge, jeden Cent wert.')
  })

  it('falls back to tip for the order question without whatToOrder', () => {
    const entries = buildFAQEntries(makeRestaurant({ tip: 'Unbedingt das Omakase.' }), 'de')
    expect(entries[0]).toEqual({
      question: 'Was sollte man bei 893 Ryōtei bestellen?',
      answer: 'Unbedingt das Omakase.',
    })
  })
})

describe('buildWhatToOrderAnswer', () => {
  it('joins multiple dishes as sentences with price and reason', () => {
    const r = makeRestaurant({
      whatToOrder: [
        { dish: 'Pork Belly', note: 'Knusprig und fettig — das Signature Dish.', price: '18 €' },
        { dish: 'Wolfsbarsch', note: 'Ganzer Fisch vom Grill' },
        { dish: 'Kimchi Pancake' },
      ],
    })
    expect(buildWhatToOrderAnswer(r, 'de')).toBe(
      'Unsere Empfehlungen: Pork Belly (18 €) — Knusprig und fettig — das Signature Dish. Wolfsbarsch — Ganzer Fisch vom Grill. Kimchi Pancake.',
    )
  })

  it('prefers the EN note on locale en and falls back to German', () => {
    const r = makeRestaurant({
      whatToOrder: [
        { dish: 'Pork Belly', note: 'Knusprig.', noteEn: 'Crispy, the signature dish.', price: '18 €' },
        { dish: 'Wolfsbarsch', note: 'Vom Grill.' },
      ],
    })
    expect(buildWhatToOrderAnswer(r, 'en')).toBe(
      'Our picks: Pork Belly (18 €) — Crispy, the signature dish. Wolfsbarsch — Vom Grill.',
    )
  })

  it('returns null when no recommendations are maintained', () => {
    expect(buildWhatToOrderAnswer(makeRestaurant(), 'de')).toBeNull()
    expect(buildWhatToOrderAnswer(makeRestaurant({ whatToOrder: [] }), 'de')).toBeNull()
    expect(buildWhatToOrderAnswer(makeRestaurant({ whatToOrder: [{ dish: '  ' }] }), 'de')).toBeNull()
  })
})
