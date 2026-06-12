// nextjs/lib/buddy/packTeaser.test.ts
import { describe, it, expect } from 'vitest'
import { pickPackForSpots, buildPackTeaser } from './packTeaser'
import { CATALOG } from '@/lib/stripe-catalog'
import type { SpotCandidate } from './types'

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

  it('returns null when the vote is tied between two categories', () => {
    // lunch and dinner tie 4:4 — insertion order must not pick the winner
    const spots = [
      spot('a', ['lunch', 'dinner']),
      spot('b', ['lunch', 'dinner']),
      spot('c', ['lunch', 'dinner']),
      spot('d', ['lunch', 'dinner']),
    ]
    expect(pickPackForSpots(spots)).toBeNull()
  })
})

describe('pickPackForSpots with user intent', () => {
  // Real catalog shape: breakfast cafés and cocktail bars also carry the
  // near-universal lunch/dinner refs, which otherwise outvote the topic the
  // user actually asked for (breakfast search → Lunch card).
  const breakfastScene = [
    spot('a', ['breakfast', 'lunch']),
    spot('b', ['breakfast', 'lunch', 'coffee']),
    spot('c', ['lunch', 'dinner']),
    spot('d', ['lunch', 'dinner']),
    spot('e', ['lunch', 'dinner']),
  ]
  const barScene = [
    spot('a', ['drinks']),
    spot('b', ['drinks', 'dinner']),
    spot('c', ['lunch', 'dinner']),
    spot('d', ['lunch', 'dinner']),
    spot('e', ['lunch', 'dinner']),
  ]

  it('anchors on the pack the user asked for even when generic tags outnumber it', () => {
    expect(pickPackForSpots(breakfastScene, 'frühstück')?.packId).toBe('category-breakfast')
    expect(pickPackForSpots(barScene, 'drinks')?.packId).toBe('category-drinks')
  })

  it('maps DE/EN synonyms and multi-word terms to the pack topic', () => {
    expect(pickPackForSpots(breakfastScene, 'brunch')?.packId).toBe('category-breakfast')
    expect(pickPackForSpots(breakfastScene, 'breakfast')?.packId).toBe('category-breakfast')
    expect(pickPackForSpots(barScene, 'cocktails')?.packId).toBe('category-drinks')
    expect(pickPackForSpots(barScene, 'bar')?.packId).toBe('category-drinks')
    expect(pickPackForSpots(barScene, 'natural wine')?.packId).toBe('category-drinks')
  })

  it('shows nothing when the asked-for topic has no support in the results', () => {
    // user asked for breakfast, results carry no breakfast ref at all — a
    // Lunch card here is exactly the reported bug, no card is correct
    const spots = [
      spot('a', ['lunch', 'dinner']),
      spot('b', ['lunch', 'dinner']),
      spot('c', ['lunch']),
    ]
    expect(pickPackForSpots(spots, 'frühstück')).toBeNull()
  })

  it('falls back to the majority vote for dish terms that name no pack topic', () => {
    const spots = [
      spot('a', ['pizza']),
      spot('b', ['pizza', 'dinner']),
      spot('c', ['pizza']),
      spot('d', ['dinner']),
    ]
    expect(pickPackForSpots(spots, 'ramen')?.packId).toBe('category-pizza')
  })
})

describe('buildPackTeaser', () => {
  it('builds a localized teaser with canonical copy and artwork (no price)', () => {
    const pack = CATALOG['category-pizza']
    const de = buildPackTeaser(pack, 'de')
    expect(de).toEqual({
      packId: 'category-pizza',
      slug: 'pizza',
      name: 'Pizza',
      spectrum: pack.spectrum.de,
      description: pack.description.de,
      art: '/pics/booster/booster_pizza.webp',
    })
    expect('priceLabel' in de).toBe(false)
    expect(buildPackTeaser(pack, 'en').description).toBe(pack.description.en)
  })
})
