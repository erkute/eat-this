// nextjs/lib/buddy/packTeaser.test.ts
import { describe, it, expect } from 'vitest'
import { pickPackForSpots, buildPackTeaser, formatPackPrice } from './packTeaser'
import { CATALOG } from '@/lib/stripe-catalog'
import type { SpotCandidate } from './types'

// Intl uses (narrow) no-break spaces between amount and € — normalize for asserts.
const norm = (s: string) => s.replace(/[  ]/g, ' ')

function spot(slug: string, categorySlugs: string[]): SpotCandidate {
  return {
    _id: slug, name: slug, slug, cuisineType: null, bezirk: null,
    shortDescription: null, tip: null, priceRange: null, mapsUrl: null,
    image: null, openNow: null, openLabel: null, distanceLabel: null,
    categorySlugs,
  }
}

describe('pickPackForSpots', () => {
  it('picks the pack when a clear majority of results shares its category', () => {
    const spots = [
      spot('a', ['pizza']),
      spot('b', ['pizza', 'dinner']),
      spot('c', ['pizza']),
      spot('d', ['dinner']),
    ]
    expect(pickPackForSpots(spots)?.packId).toBe('category-pizza')
  })

  it('returns null when no category reaches a majority', () => {
    const spots = [
      spot('a', ['pizza']),
      spot('b', ['dinner']),
      spot('c', ['coffee']),
      spot('d', ['drinks']),
    ]
    expect(pickPackForSpots(spots)).toBeNull()
  })

  it('returns null for thin results (fewer than 3 spots)', () => {
    expect(pickPackForSpots([spot('a', ['pizza']), spot('b', ['pizza'])])).toBeNull()
  })

  it('only votes over the top 10 results', () => {
    // 10 head spots are dinner; a long pizza tail must not flip the vote
    const head = Array.from({ length: 10 }, (_, i) => spot(`d${i}`, ['dinner']))
    const tail = Array.from({ length: 20 }, (_, i) => spot(`p${i}`, ['pizza']))
    expect(pickPackForSpots([...head, ...tail])?.packId).toBe('category-dinner')
  })

  it('never picks a category without a pack in the catalog', () => {
    const spots = [spot('a', ['unbekannt']), spot('b', ['unbekannt']), spot('c', ['unbekannt'])]
    expect(pickPackForSpots(spots)).toBeNull()
  })

  it('ignores duplicate category refs on a single spot', () => {
    const spots = [
      spot('a', ['pizza', 'pizza', 'pizza']),
      spot('b', ['dinner']),
      spot('c', ['dinner']),
      spot('d', ['dinner']),
    ]
    expect(pickPackForSpots(spots)?.packId).toBe('category-dinner')
  })
})

describe('buildPackTeaser', () => {
  it('builds a localized teaser with canonical copy and price', () => {
    const pack = CATALOG['category-pizza']
    const de = buildPackTeaser(pack, 'de')
    expect({ ...de, priceLabel: norm(de.priceLabel) }).toEqual({
      packId: 'category-pizza',
      slug: 'pizza',
      name: 'Pizza',
      spectrum: pack.spectrum.de,
      description: pack.description.de,
      art: '/pics/booster/booster_pizza.webp',
      priceLabel: '2,99 €',
    })
    const en = buildPackTeaser(pack, 'en')
    expect(norm(en.priceLabel)).toBe('€2.99')
    expect(en.description).toBe(pack.description.en)
  })
})

describe('formatPackPrice', () => {
  it('formats cents per locale', () => {
    expect(norm(formatPackPrice(299, 'de'))).toBe('2,99 €')
    expect(norm(formatPackPrice(2000, 'en'))).toBe('€20.00')
  })
})
