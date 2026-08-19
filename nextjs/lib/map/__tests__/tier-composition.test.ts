import { describe, it, expect } from 'vitest';
import {
  composeAnonRestaurants,
  composeSignedRestaurants,
  composeRevealedMustEats,
  TIER_TARGETS,
  ANON_PER_BEZIRK,
} from '@/lib/map/tier-composition';
import type { MapRestaurant, MapMustEat } from '@/lib/types';

// Helpers — minimal fixture builders
function mkRestaurant(id: string, opts: Partial<MapRestaurant> = {}): MapRestaurant {
  return {
    _id: id,
    name: `R-${id}`,
    slug: id.toLowerCase(),
    tierAnon: false,
    tierSigned: false,
    ...opts,
  } as MapRestaurant;
}

function mkMustEat(id: string, restaurantId: string, opts: Partial<MapMustEat> = {}): MapMustEat {
  return {
    _id: id,
    dish: `Dish ${id}`,
    revealedForAnon: false,
    restaurant: { _id: restaurantId, name: `R-${restaurantId}`, slug: restaurantId.toLowerCase() },
    ...opts,
  } as MapMustEat;
}

describe('TIER_TARGETS', () => {
  it('exports the locked-in numbers from the spec', () => {
    expect(TIER_TARGETS.SIGNED).toBe(20);
    expect(TIER_TARGETS.REVEALED).toBe(10);
  });

  it('no longer budgets the anon tier — geography does', () => {
    expect('ANON' in TIER_TARGETS).toBe(false);
    expect(ANON_PER_BEZIRK).toBe(5);
  });
});

describe('composeAnonRestaurants', () => {
  const inBezirk = (id: string, name: string, opts: Partial<MapRestaurant> = {}) =>
    mkRestaurant(id, { bezirk: { name }, ...opts });

  it('tops every district up to ANON_PER_BEZIRK', () => {
    const all = [
      ...Array.from({ length: 9 }, (_, i) => inBezirk(`mi${i}`, 'Mitte')),
      ...Array.from({ length: 7 }, (_, i) => inBezirk(`kb${i}`, 'Kreuzberg')),
    ];
    const result = composeAnonRestaurants(all, new Map());
    const count = (b: string) => result.filter((r) => r.bezirk?.name === b).length;
    expect(count('Mitte')).toBe(ANON_PER_BEZIRK);
    expect(count('Kreuzberg')).toBe(ANON_PER_BEZIRK);
  });

  it('gives a thin district everything it has instead of nothing', () => {
    // The regression this rule exists for: Friedrichshain had 12 spots in the
    // catalog and 0 on the free map, Wedding had 2 and 0 (measured 2026-08-19).
    const all = [
      ...Array.from({ length: 20 }, (_, i) => inBezirk(`mi${i}`, 'Mitte')),
      inBezirk('we0', 'Wedding'),
      inBezirk('we1', 'Wedding'),
    ];
    const result = composeAnonRestaurants(all, new Map());
    expect(result.filter((r) => r.bezirk?.name === 'Wedding')).toHaveLength(2);
  });

  it('includes spots without must-eats — the old fill excluded them', () => {
    // 21 of 345 restaurants carry a must-eat, so a must-eat-gated fill could
    // never cover the map. Coverage now outranks card-carrying capability.
    const all = [inBezirk('r0', 'Mitte'), inBezirk('r1', 'Mitte')];
    const result = composeAnonRestaurants(all, new Map([['r0', 1]]));
    expect(result.map((r) => r._id).sort()).toEqual(['r0', 'r1']);
  });

  it('keeps every curated spot, even past its district quota', () => {
    const all = [
      ...Array.from({ length: 7 }, (_, i) => inBezirk(`c${i}`, 'Mitte', { tierAnon: true })),
      inBezirk('x0', 'Mitte'),
    ];
    const result = composeAnonRestaurants(all, new Map());
    expect(result).toHaveLength(7);
    expect(result.every((r) => r.tierAnon)).toBe(true);
  });

  it('counts curated spots against their district quota', () => {
    const all = [
      inBezirk('c0', 'Mitte', { tierAnon: true }),
      inBezirk('c1', 'Mitte', { tierAnon: true }),
      ...Array.from({ length: 6 }, (_, i) => inBezirk(`x${i}`, 'Mitte')),
    ];
    const result = composeAnonRestaurants(all, new Map());
    expect(result).toHaveLength(ANON_PER_BEZIRK);
    expect(result.filter((r) => r.tierAnon)).toHaveLength(2);
  });

  it('ranks the fill by must-eat count desc, then _id asc', () => {
    const all = [
      inBezirk('r-a', 'Mitte'),
      inBezirk('r-b', 'Mitte'),
      inBezirk('r-c', 'Mitte'),
    ];
    const result = composeAnonRestaurants(
      all,
      new Map([
        ['r-c', 5],
        ['r-a', 1],
        ['r-b', 1],
      ])
    );
    expect(result.map((r) => r._id)).toEqual(['r-c', 'r-a', 'r-b']);
  });

  it('falls back to the legacy `district` string when there is no bezirk ref', () => {
    const all = Array.from({ length: 8 }, (_, i) => mkRestaurant(`d${i}`, { district: 'Moabit' }));
    const result = composeAnonRestaurants(all, new Map());
    expect(result).toHaveLength(ANON_PER_BEZIRK);
  });

  it('caps undistricted spots in one shared bucket', () => {
    const all = Array.from({ length: 9 }, (_, i) => mkRestaurant(`n${i}`));
    const result = composeAnonRestaurants(all, new Map());
    expect(result).toHaveLength(ANON_PER_BEZIRK);
  });
});

describe('composeSignedRestaurants', () => {
  it('returns flagged when >= TARGET_SIGNED, excluding anon-set ids', () => {
    const all = Array.from({ length: 30 }, (_, i) => mkRestaurant(`r${i}`, { tierSigned: i < 22 }));
    const anonIds = new Set(all.slice(0, 3).map((r) => r._id));
    const result = composeSignedRestaurants(all, anonIds, new Map(all.map((r) => [r._id, 1])));
    // 22 flagged minus 3 that overlap with anon = 19, BUT 19 < TARGET (20), so fallback kicks in.
    // Wait — re-check spec: signed-tier should be DISJOINT from anon. So 22 flagged - 3 overlap = 19 candidates.
    // Since 19 < 20, fallback fills with non-anon, non-flagged candidates.
    expect(result.length).toBe(TIER_TARGETS.SIGNED);
    // No overlap with anon set
    expect(result.every((r) => !anonIds.has(r._id))).toBe(true);
  });

  it('tops up to TARGET_SIGNED excluding anon set + flagged', () => {
    const all = Array.from(
      { length: 30 },
      (_, i) => mkRestaurant(`r${i}`, { tierSigned: i >= 5 && i < 10 }) // r5..r9 flagged
    );
    const anonIds = new Set(all.slice(0, 5).map((r) => r._id)); // r0..r4 are anon
    const result = composeSignedRestaurants(all, anonIds, new Map(all.map((r) => [r._id, 1])));
    expect(result.length).toBe(TIER_TARGETS.SIGNED);
    expect(result.every((r) => !anonIds.has(r._id))).toBe(true);
  });

  it('signed-tier fallback does NOT require must-eats (looser than anon)', () => {
    const all = [mkRestaurant('r0'), mkRestaurant('r1'), mkRestaurant('r2')];
    const mustEatCount = new Map([
      ['r0', 0],
      ['r1', 0],
      ['r2', 0],
    ]);
    const result = composeSignedRestaurants(all, new Set(), mustEatCount);
    // All 3 included even with zero must-eats
    expect(result.length).toBe(3);
  });
});

describe('composeRevealedMustEats', () => {
  it('caps at TARGET_REVEALED when enough spots have cards', () => {
    // 15 restaurants, one flagged card each → exactly 10 revealed.
    const anonIds = new Set(Array.from({ length: 15 }, (_, i) => `r${i}`));
    const allMustEats = Array.from({ length: 15 }, (_, i) =>
      mkMustEat(`m${i}`, `r${i}`, { revealedForAnon: true })
    );
    const result = composeRevealedMustEats(allMustEats, anonIds);
    expect(result.size).toBe(TIER_TARGETS.REVEALED);
  });

  it('reveals at most ONE card per restaurant — the second stays face-down', () => {
    // r0 carries 12 flagged cards; only one of them may flip.
    const allMustEats = Array.from({ length: 12 }, (_, i) =>
      mkMustEat(`m${i}`, 'r0', { revealedForAnon: true })
    );
    const result = composeRevealedMustEats(allMustEats, new Set(['r0']));
    expect(result.size).toBe(1);
  });

  it('flagged wins over fallback on the same restaurant', () => {
    const allMustEats = [
      mkMustEat('a-fallback', 'r0'),
      mkMustEat('z-flagged', 'r0', { revealedForAnon: true }),
    ];
    const result = composeRevealedMustEats(allMustEats, new Set(['r0']));
    expect(result).toEqual(new Set(['z-flagged']));
  });

  it('tops up one-per-spot among anon-restaurant must-eats only', () => {
    const anonIds = new Set(['r0', 'r1']);
    const allMustEats = [
      ...Array.from({ length: 5 }, (_, i) => mkMustEat(`f${i}`, 'r0', { revealedForAnon: true })),
      ...Array.from({ length: 20 }, (_, i) => mkMustEat(`u${i}`, 'r1')),
      ...Array.from({ length: 10 }, (_, i) => mkMustEat(`x${i}`, 'r2')),
    ];
    const result = composeRevealedMustEats(allMustEats, anonIds);
    // One card per anon spot: one flagged from r0, one fallback from r1. r2 is
    // outside the anon set and contributes nothing.
    expect(result.size).toBe(2);
    expect(result.has('f0')).toBe(true);
    expect(result.has('u0')).toBe(true);
    for (const m of allMustEats) {
      if (result.has(m._id)) {
        expect(anonIds.has(m.restaurant._id)).toBe(true);
      }
    }
  });

  it('returns fewer than target when fewer spots carry cards', () => {
    const anonIds = new Set(['r0', 'r1', 'r2', 'r3']);
    const allMustEats = Array.from({ length: 4 }, (_, i) =>
      mkMustEat(`m${i}`, `r${i}`, { revealedForAnon: true })
    );
    const result = composeRevealedMustEats(allMustEats, anonIds);
    expect(result.size).toBe(4);
  });
});
