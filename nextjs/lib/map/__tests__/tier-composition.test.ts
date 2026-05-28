import { describe, it, expect } from 'vitest'
import {
  composeAnonRestaurants,
  composeSignedRestaurants,
  composeRevealedMustEats,
  TIER_TARGETS,
} from '@/lib/map/tier-composition'
import type { MapRestaurant, MapMustEat } from '@/lib/types'

// Helpers — minimal fixture builders
function mkRestaurant(id: string, opts: Partial<MapRestaurant> = {}): MapRestaurant {
  return {
    _id: id,
    name: `R-${id}`,
    slug: id.toLowerCase(),
    tierAnon: false,
    tierSigned: false,
    ...opts,
  } as MapRestaurant
}

function mkMustEat(id: string, restaurantId: string, opts: Partial<MapMustEat> = {}): MapMustEat {
  return {
    _id: id,
    dish: `Dish ${id}`,
    revealedForAnon: false,
    restaurant: { _id: restaurantId, name: `R-${restaurantId}`, slug: restaurantId.toLowerCase() },
    ...opts,
  } as MapMustEat
}

describe('TIER_TARGETS', () => {
  it('exports the locked-in numbers from the spec', () => {
    expect(TIER_TARGETS.ANON).toBe(20)
    expect(TIER_TARGETS.SIGNED).toBe(20)
    expect(TIER_TARGETS.REVEALED).toBe(10)
  })
})

describe('composeAnonRestaurants', () => {
  it('returns ALL flagged when count >= TARGET_ANON (no truncation)', () => {
    const all = Array.from({ length: 30 }, (_, i) =>
      mkRestaurant(`r${i}`, { tierAnon: i < 25 })
    )
    const mustEatCount = new Map(all.map((r) => [r._id, 1]))
    const result = composeAnonRestaurants(all, mustEatCount)
    expect(result.length).toBe(25)
    expect(result.every((r) => r.tierAnon)).toBe(true)
  })

  it('tops up to TARGET_ANON when flagged count < target', () => {
    // 10 flagged, 30 total all with must-eats — should return exactly TARGET_ANON
    const all = Array.from({ length: 30 }, (_, i) =>
      mkRestaurant(`r${i}`, { tierAnon: i < 10 })
    )
    const mustEatCount = new Map(all.map((r) => [r._id, 1]))
    const result = composeAnonRestaurants(all, mustEatCount)
    expect(result.length).toBe(TIER_TARGETS.ANON)
    // First 10 are flagged
    expect(result.slice(0, 10).every((r) => r.tierAnon)).toBe(true)
    // Remaining are fallback
    expect(result.slice(10).every((r) => !r.tierAnon)).toBe(true)
  })

  it('fallback picks by must-eat count desc, then _id asc as tiebreak', () => {
    // 0 flagged. 5 total. Must-eat counts: r0=5, r1=3, r2=3, r3=1, r4=0.
    // r4 ineligible (no must-eats). Expected order in fallback: r0, r1, r2, r3.
    const all = [
      mkRestaurant('r0'),
      mkRestaurant('r1'),
      mkRestaurant('r2'),
      mkRestaurant('r3'),
      mkRestaurant('r4'),
    ]
    const mustEatCount = new Map([['r0', 5], ['r1', 3], ['r2', 3], ['r3', 1], ['r4', 0]])
    const result = composeAnonRestaurants(all, mustEatCount)
    expect(result.map((r) => r._id)).toEqual(['r0', 'r1', 'r2', 'r3'])
  })

  it('fallback excludes restaurants without must-eats (spec rule)', () => {
    const all = [
      mkRestaurant('r0', { tierAnon: true }),
      mkRestaurant('r1'), // no must-eats
      mkRestaurant('r2'),
    ]
    const mustEatCount = new Map([['r0', 1], ['r1', 0], ['r2', 2]])
    const result = composeAnonRestaurants(all, mustEatCount)
    // r1 should be excluded (no must-eats)
    expect(result.map((r) => r._id)).toEqual(['r0', 'r2'])
  })

  it('returns fewer than target if pool is exhausted', () => {
    // 0 flagged, only 3 restaurants with must-eats
    const all = [
      mkRestaurant('r0'),
      mkRestaurant('r1'),
      mkRestaurant('r2'),
    ]
    const mustEatCount = new Map([['r0', 1], ['r1', 1], ['r2', 1]])
    const result = composeAnonRestaurants(all, mustEatCount)
    expect(result.length).toBe(3)
  })
})

describe('composeSignedRestaurants', () => {
  it('returns flagged when >= TARGET_SIGNED, excluding anon-set ids', () => {
    const all = Array.from({ length: 30 }, (_, i) =>
      mkRestaurant(`r${i}`, { tierSigned: i < 22 })
    )
    const anonIds = new Set(all.slice(0, 3).map((r) => r._id))
    const result = composeSignedRestaurants(all, anonIds, new Map(all.map((r) => [r._id, 1])))
    // 22 flagged minus 3 that overlap with anon = 19, BUT 19 < TARGET (20), so fallback kicks in.
    // Wait — re-check spec: signed-tier should be DISJOINT from anon. So 22 flagged - 3 overlap = 19 candidates.
    // Since 19 < 20, fallback fills with non-anon, non-flagged candidates.
    expect(result.length).toBe(TIER_TARGETS.SIGNED)
    // No overlap with anon set
    expect(result.every((r) => !anonIds.has(r._id))).toBe(true)
  })

  it('tops up to TARGET_SIGNED excluding anon set + flagged', () => {
    const all = Array.from({ length: 30 }, (_, i) =>
      mkRestaurant(`r${i}`, { tierSigned: i >= 5 && i < 10 })  // r5..r9 flagged
    )
    const anonIds = new Set(all.slice(0, 5).map((r) => r._id))  // r0..r4 are anon
    const result = composeSignedRestaurants(all, anonIds, new Map(all.map((r) => [r._id, 1])))
    expect(result.length).toBe(TIER_TARGETS.SIGNED)
    expect(result.every((r) => !anonIds.has(r._id))).toBe(true)
  })

  it('signed-tier fallback does NOT require must-eats (looser than anon)', () => {
    const all = [
      mkRestaurant('r0'),
      mkRestaurant('r1'),
      mkRestaurant('r2'),
    ]
    const mustEatCount = new Map([['r0', 0], ['r1', 0], ['r2', 0]])
    const result = composeSignedRestaurants(all, new Set(), mustEatCount)
    // All 3 included even with zero must-eats
    expect(result.length).toBe(3)
  })
})

describe('composeRevealedMustEats', () => {
  it('returns flagged when >= TARGET_REVEALED (capped at target)', () => {
    const allMustEats = Array.from({ length: 15 }, (_, i) =>
      mkMustEat(`m${i}`, 'r0', { revealedForAnon: i < 12 })
    )
    const result = composeRevealedMustEats(allMustEats, new Set(['r0']))
    // 12 flagged but TARGET is 10 — should cap at 10
    expect(result.size).toBe(TIER_TARGETS.REVEALED)
  })

  it('tops up to TARGET_REVEALED among anon-restaurant must-eats only', () => {
    const anonIds = new Set(['r0', 'r1'])
    const allMustEats = [
      ...Array.from({ length: 5 }, (_, i) => mkMustEat(`f${i}`, 'r0', { revealedForAnon: true })),
      ...Array.from({ length: 20 }, (_, i) => mkMustEat(`u${i}`, 'r1')),
      ...Array.from({ length: 10 }, (_, i) => mkMustEat(`x${i}`, 'r2')),
    ]
    const result = composeRevealedMustEats(allMustEats, anonIds)
    expect(result.size).toBe(TIER_TARGETS.REVEALED)

    // All revealed must-eats are on anon restaurants
    for (const m of allMustEats) {
      if (result.has(m._id)) {
        expect(anonIds.has(m.restaurant._id)).toBe(true)
      }
    }
  })

  it('returns fewer than target when pool exhausted', () => {
    const allMustEats = Array.from({ length: 4 }, (_, i) =>
      mkMustEat(`m${i}`, 'r0', { revealedForAnon: true })
    )
    const result = composeRevealedMustEats(allMustEats, new Set(['r0']))
    expect(result.size).toBe(4)
  })
})
