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
  it('includes flagged cards with restaurantId + order that are not unlocked', () => {
    const cards = [
      mk('a', { revealedForAnon: true, restaurantId: 'r1', order: 1 }),
      mk('b', { revealedForAnon: true, restaurantId: 'r2', order: 2 }),
    ]
    expect(selectTeaserOrders(cards, new Set())).toEqual(new Set([1, 2]))
  })

  it('excludes cards not flagged revealedForAnon', () => {
    const cards = [mk('a', { revealedForAnon: false, restaurantId: 'r1', order: 1 })]
    expect(selectTeaserOrders(cards, new Set())).toEqual(new Set())
  })

  it('excludes flagged cards without a restaurantId', () => {
    const cards = [mk('a', { revealedForAnon: true, order: 1 })]
    expect(selectTeaserOrders(cards, new Set())).toEqual(new Set())
  })

  it('excludes flagged cards without a numeric order', () => {
    const cards = [mk('a', { revealedForAnon: true, restaurantId: 'r1' })]
    expect(selectTeaserOrders(cards, new Set())).toEqual(new Set())
  })

  it('excludes already-unlocked cards', () => {
    const cards = [mk('a', { revealedForAnon: true, restaurantId: 'r1', order: 1 })]
    expect(selectTeaserOrders(cards, new Set(['a']))).toEqual(new Set())
  })

  it('returns an empty set for empty input', () => {
    expect(selectTeaserOrders([], new Set())).toEqual(new Set())
  })
})
