import { describe, it, expect } from 'vitest'
import type { MapMustEat } from '@/lib/types'
import { splitMustEats, filterMustEats } from './mustEatsGallery'

function makeMustEat(id: string, name = 'Spot'): MapMustEat {
  return {
    _id: id,
    dish: `Dish ${id}`,
    image: `https://cdn/${id}.png`,
    restaurant: {
      _id: `r-${id}`,
      name,
      slug: `slug-${id}`,
      lat: 52.5,
      lng: 13.4,
    },
  }
}

describe('splitMustEats', () => {
  it('splits into open (unlocked) and locked, preserving original order', () => {
    const list = [makeMustEat('a'), makeMustEat('b'), makeMustEat('c'), makeMustEat('d')]
    const unlocked = new Set(['b', 'd'])
    const { open, locked } = splitMustEats(list, unlocked)
    expect(open.map((m) => m._id)).toEqual(['b', 'd'])
    expect(locked.map((m) => m._id)).toEqual(['a', 'c'])
  })

  it('all locked when nothing is unlocked', () => {
    const list = [makeMustEat('a'), makeMustEat('b')]
    const { open, locked } = splitMustEats(list, new Set())
    expect(open).toEqual([])
    expect(locked.map((m) => m._id)).toEqual(['a', 'b'])
  })
})

describe('filterMustEats', () => {
  const list = [makeMustEat('a'), makeMustEat('b'), makeMustEat('c')]
  const unlocked = new Set(['b'])

  it("'all' returns the full list unchanged", () => {
    expect(filterMustEats(list, unlocked, 'all')).toBe(list)
  })

  it("'open' returns only unlocked must-eats", () => {
    expect(filterMustEats(list, unlocked, 'open').map((m) => m._id)).toEqual(['b'])
  })

  it("'locked' returns only locked must-eats, preserving order", () => {
    expect(filterMustEats(list, unlocked, 'locked').map((m) => m._id)).toEqual(['a', 'c'])
  })
})
