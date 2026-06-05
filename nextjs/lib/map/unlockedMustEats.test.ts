import { describe, it, expect } from 'vitest'
import type { MapRestaurant, MapMustEat } from '@/lib/types'
import { resolveUnlockedMustEatIds, TRIAL_UNLOCKED_COUNT } from './unlockedMustEats'

// Minimal builders — only the join keys (`_id`, `restaurant._id`) matter here.
const r = (id: string): MapRestaurant =>
  ({ _id: id, name: id, slug: id, lat: 0, lng: 0 } as unknown as MapRestaurant)

const m = (id: string, restaurantId: string): MapMustEat =>
  ({
    _id: id,
    dish: id,
    image: '',
    restaurant: { _id: restaurantId, name: restaurantId, slug: restaurantId, lat: 0, lng: 0 },
  } as unknown as MapMustEat)

describe('resolveUnlockedMustEatIds', () => {
  it('exports TRIAL_UNLOCKED_COUNT = 10', () => {
    expect(TRIAL_UNLOCKED_COUNT).toBe(10)
  })

  it('signed-in: stored ∪ revealed (ignores trial split)', () => {
    const restaurants = Array.from({ length: 20 }, (_, i) => r(`r${i}`))
    const mustEats = restaurants.map((rest, i) => m(`m${i}`, rest._id))
    const out = resolveUnlockedMustEatIds({
      uid: 'user-1',
      storedUnlockedIds: new Set(['stored-a', 'stored-b']),
      revealedMustEatIds: new Set(['revealed-x']),
      mustEats,
      restaurants,
    })
    // Exactly stored ∪ revealed — none of the trial-split must-eats leak in.
    expect(out).toEqual(new Set(['stored-a', 'stored-b', 'revealed-x']))
  })

  it('anon: must-eats of the first 10 restaurants are face-up', () => {
    const restaurants = Array.from({ length: 15 }, (_, i) => r(`r${i}`))
    // One must-eat per restaurant.
    const mustEats = restaurants.map((rest, i) => m(`m${i}`, rest._id))
    const out = resolveUnlockedMustEatIds({
      uid: null,
      storedUnlockedIds: new Set(),
      revealedMustEatIds: new Set(),
      mustEats,
      restaurants,
    })
    // First 10 restaurants' must-eats → face-up; m10..m14 stay face-down.
    const expected = new Set(Array.from({ length: TRIAL_UNLOCKED_COUNT }, (_, i) => `m${i}`))
    expect(out).toEqual(expected)
  })

  it('anon: revealed must-eats on restaurants OUTSIDE the first 10 are still face-up (spot-of-day gift)', () => {
    const restaurants = Array.from({ length: 15 }, (_, i) => r(`r${i}`))
    const mustEats = restaurants.map((rest, i) => m(`m${i}`, rest._id))
    const out = resolveUnlockedMustEatIds({
      uid: null,
      storedUnlockedIds: new Set(),
      // m12 belongs to r12 — outside the trial-10 — but is server-revealed.
      revealedMustEatIds: new Set(['m12']),
      mustEats,
      restaurants,
    })
    expect(out.has('m12')).toBe(true)
    // Trial split still present.
    expect(out.has('m0')).toBe(true)
    expect(out.has('m9')).toBe(true)
    // A non-revealed must-eat outside the trial-10 stays locked.
    expect(out.has('m13')).toBe(false)
  })

  it('anon: storedUnlockedIds are ignored (only trial split ∪ revealed apply)', () => {
    const restaurants = Array.from({ length: 12 }, (_, i) => r(`r${i}`))
    const mustEats = restaurants.map((rest, i) => m(`m${i}`, rest._id))
    const out = resolveUnlockedMustEatIds({
      uid: null,
      storedUnlockedIds: new Set(['m11']), // belongs to r11, outside trial-10
      revealedMustEatIds: new Set(),
      mustEats,
      restaurants,
    })
    expect(out.has('m11')).toBe(false)
  })

  it('anon: multiple must-eats per restaurant all flip with their restaurant', () => {
    const restaurants = Array.from({ length: 11 }, (_, i) => r(`r${i}`))
    const mustEats = [
      m('a', 'r0'),
      m('b', 'r0'),
      m('c', 'r9'),
      m('d', 'r10'), // r10 is outside trial-10
    ]
    const out = resolveUnlockedMustEatIds({
      uid: null,
      storedUnlockedIds: new Set(),
      revealedMustEatIds: new Set(),
      mustEats,
      restaurants,
    })
    expect(out).toEqual(new Set(['a', 'b', 'c']))
  })

  it('signed-in: publicFaceUpIds are unioned in (publicly face-up ⇒ face-up everywhere)', () => {
    const restaurants = Array.from({ length: 20 }, (_, i) => r(`r${i}`))
    const mustEats = restaurants.map((rest, i) => m(`m${i}`, rest._id))
    const out = resolveUnlockedMustEatIds({
      uid: 'user-1',
      storedUnlockedIds: new Set(['stored-a']),
      revealedMustEatIds: new Set(),
      mustEats,
      restaurants,
      // m3 is in the public/anon face-up set but neither stored nor revealed.
      publicFaceUpIds: new Set(['m3']),
    })
    expect(out).toEqual(new Set(['stored-a', 'm3']))
  })

  it('anon: publicFaceUpIds fold in without disturbing the trial split', () => {
    const restaurants = Array.from({ length: 15 }, (_, i) => r(`r${i}`))
    const mustEats = restaurants.map((rest, i) => m(`m${i}`, rest._id))
    const out = resolveUnlockedMustEatIds({
      uid: null,
      storedUnlockedIds: new Set(),
      revealedMustEatIds: new Set(),
      mustEats,
      restaurants,
      // m12 (outside trial-10) face-up via the public set; trial-10 unchanged.
      publicFaceUpIds: new Set(['m0', 'm12']),
    })
    expect(out.has('m12')).toBe(true)
    expect(out.has('m9')).toBe(true)
    expect(out.has('m13')).toBe(false)
  })

  it('empty inputs → empty set (signed-in)', () => {
    expect(
      resolveUnlockedMustEatIds({
        uid: 'u',
        storedUnlockedIds: new Set(),
        revealedMustEatIds: new Set(),
        mustEats: [],
        restaurants: [],
      }),
    ).toEqual(new Set())
  })

  it('empty inputs → empty set (anon)', () => {
    expect(
      resolveUnlockedMustEatIds({
        uid: null,
        storedUnlockedIds: new Set(),
        revealedMustEatIds: new Set(),
        mustEats: [],
        restaurants: [],
      }),
    ).toEqual(new Set())
  })
})
