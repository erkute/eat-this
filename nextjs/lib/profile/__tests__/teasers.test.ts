import { describe, it, expect } from 'vitest'
import { selectTeaserOrders } from '@/lib/profile/teasers'
import type { MustEatAlbumCard } from '@/lib/types'

function mk(id: string, opts: Partial<MustEatAlbumCard> = {}): MustEatAlbumCard {
  return {
    _id: id,
    dish: `Dish ${id}`,
    restaurant: `R ${id}`,
    imageUrl: `/img/${id}.webp`,
    ...opts,
  }
}

describe('selectTeaserOrders', () => {
  it('includes curated cards with restaurantId + order that are not unlocked', () => {
    const cards = [
      mk('a', { restaurantId: 'r1', order: 1 }),
      mk('b', { restaurantId: 'r2', order: 2 }),
    ]
    expect(selectTeaserOrders(cards, new Set(), new Set(['a', 'b']))).toEqual(new Set([1, 2]))
  })

  it('excludes cards not in the curated set', () => {
    const cards = [mk('a', { restaurantId: 'r1', order: 1 })]
    expect(selectTeaserOrders(cards, new Set(), new Set())).toEqual(new Set())
  })

  it('excludes curated cards without a restaurantId', () => {
    const cards = [mk('a', { order: 1 })]
    expect(selectTeaserOrders(cards, new Set(), new Set(['a']))).toEqual(new Set())
  })

  it('excludes curated cards without a numeric order', () => {
    const cards = [mk('a', { restaurantId: 'r1' })]
    expect(selectTeaserOrders(cards, new Set(), new Set(['a']))).toEqual(new Set())
  })

  it('excludes already-unlocked cards (even if curated)', () => {
    const cards = [mk('a', { restaurantId: 'r1', order: 1 })]
    expect(selectTeaserOrders(cards, new Set(['a']), new Set(['a']))).toEqual(new Set())
  })

  it('returns an empty set for empty input', () => {
    expect(selectTeaserOrders([], new Set(), new Set())).toEqual(new Set())
  })
})
