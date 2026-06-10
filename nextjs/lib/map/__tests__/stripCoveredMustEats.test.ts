import { describe, it, expect } from 'vitest'
import { stripCoveredMustEats } from '../stripCoveredMustEats'
import type { MapMustEat } from '@/lib/types'

const me = (id: string): MapMustEat => ({
  _id: id,
  dish: `Dish ${id}`,
  description: 'secret de',
  descriptionEn: 'secret en',
  price: '12 €',
  image: `https://cdn.example/${id}.jpg`,
  order: 3,
  revealedForAnon: false,
  restaurant: { _id: `r-${id}`, name: `R ${id}`, slug: `r-${id}`, lat: 52.5, lng: 13.4 },
})

describe('stripCoveredMustEats', () => {
  it('keeps face-up cards untouched', () => {
    const input = [me('m1')]
    const out = stripCoveredMustEats(input, new Set(['m1']))
    expect(out[0]).toBe(input[0])
  })

  it('strips every paid field from covered cards', () => {
    const [covered] = stripCoveredMustEats([me('m1')], new Set())
    expect(covered).toEqual({
      _id: 'm1',
      order: 3,
      restaurant: { _id: 'r-m1', name: 'R m1', slug: 'r-m1', lat: 52.5, lng: 13.4 },
    })
    // Explicit: the paid fields must not survive in any form.
    expect(Object.keys(covered)).not.toEqual(
      expect.arrayContaining(['dish', 'image', 'description', 'descriptionEn', 'price']),
    )
  })

  it('preserves list order and length', () => {
    const out = stripCoveredMustEats([me('a'), me('b'), me('c')], new Set(['b']))
    expect(out.map((m) => m._id)).toEqual(['a', 'b', 'c'])
    expect(out[1].dish).toBe('Dish b')
    expect(out[0].dish).toBeUndefined()
  })
})
