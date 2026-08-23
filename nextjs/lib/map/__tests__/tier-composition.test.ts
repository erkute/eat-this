import { describe, it, expect } from 'vitest';
import {
  composeAnonRestaurants,
  composeSignedRestaurants,
  composeRevealedMustEats,
  TIER_TARGETS,
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

const inBezirk = (id: string, name: string, opts: Partial<MapRestaurant> = {}) =>
  mkRestaurant(id, { bezirk: { name }, ...opts });

/** `sizes` → one district per entry, that many spots in it. */
function catalog(
  sizes: Record<string, number>,
  opts: (i: number) => Partial<MapRestaurant> = () => ({})
) {
  const all: MapRestaurant[] = [];
  for (const [name, n] of Object.entries(sizes)) {
    for (let i = 0; i < n; i++)
      all.push(inBezirk(`${name}-${String(i).padStart(3, '0')}`, name, opts(i)));
  }
  return all;
}

const countPerBezirk = (set: MapRestaurant[]) => {
  const m = new Map<string, number>();
  for (const r of set) m.set(r.bezirk?.name ?? '', (m.get(r.bezirk?.name ?? '') ?? 0) + 1);
  return m;
};

// Shape of the real catalog (Sanity production, 2026-08-23): five districts
// hold 269 of 344 spots. Any budget taken off the top lands entirely in them.
const BERLIN = {
  Mitte: 77,
  Kreuzberg: 59,
  Schoeneberg: 46,
  Charlottenburg: 46,
  PrenzlauerBerg: 41,
  Neukoelln: 30,
  Friedrichshain: 12,
  Steglitz: 10,
  Moabit: 7,
  Wilmersdorf: 3,
  Wedding: 2,
  Pankow: 2,
  Tiergarten: 2,
  Lichtenberg: 2,
  Koepenick: 2,
  Dahlem: 2,
  Friedenau: 1,
};

describe('TIER_TARGETS', () => {
  it('exports the ladder as whole-map totals', () => {
    expect(TIER_TARGETS.ANON).toBe(100);
    expect(TIER_TARGETS.SIGNED).toBe(150);
    expect(TIER_TARGETS.REVEALED).toBe(10);
  });

  it('states SIGNED cumulatively, so it must exceed ANON', () => {
    expect(TIER_TARGETS.SIGNED).toBeGreaterThan(TIER_TARGETS.ANON);
  });
});

describe('composeAnonRestaurants', () => {
  it('hits TIER_TARGETS.ANON exactly — the number is stated in UI copy', () => {
    const result = composeAnonRestaurants(catalog(BERLIN), new Map());
    expect(result).toHaveLength(TIER_TARGETS.ANON);
  });

  it('leaves no district empty, however small', () => {
    // The regression this rule exists for: under a flat budget, 8 of 17
    // districts had zero free spots and a third of them sat in one district
    // (measured 2026-08-19).
    const perBezirk = countPerBezirk(composeAnonRestaurants(catalog(BERLIN), new Map()));
    for (const name of Object.keys(BERLIN)) {
      expect(perBezirk.get(name) ?? 0).toBeGreaterThan(0);
    }
  });

  it('gives a thin district everything it has instead of a share', () => {
    const perBezirk = countPerBezirk(composeAnonRestaurants(catalog(BERLIN), new Map()));
    expect(perBezirk.get('Friedenau')).toBe(BERLIN.Friedenau);
    expect(perBezirk.get('Wedding')).toBe(BERLIN.Wedding);
    expect(perBezirk.get('Moabit')).toBe(BERLIN.Moabit);
  });

  it('keeps the big districts within one spot of each other', () => {
    // Round-robin: the final partial round is the only source of imbalance.
    const perBezirk = countPerBezirk(composeAnonRestaurants(catalog(BERLIN), new Map()));
    const big = ['Mitte', 'Kreuzberg', 'Schoeneberg', 'Charlottenburg', 'PrenzlauerBerg'].map(
      (n) => perBezirk.get(n) ?? 0
    );
    expect(Math.max(...big) - Math.min(...big)).toBeLessThanOrEqual(1);
  });

  it('returns the whole catalog when it is smaller than the budget', () => {
    const all = catalog({ Mitte: 9, Kreuzberg: 7 });
    expect(composeAnonRestaurants(all, new Map())).toHaveLength(16);
  });

  it('includes spots without must-eats — a must-eat-gated fill could never cover the map', () => {
    const all = [inBezirk('r0', 'Mitte'), inBezirk('r1', 'Mitte')];
    const result = composeAnonRestaurants(all, new Map([['r0', 1]]));
    expect(result.map((r) => r._id).sort()).toEqual(['r0', 'r1']);
  });

  it('keeps every curated spot, even past the budget', () => {
    const all = catalog(BERLIN, (i) => ({ tierAnon: i < 40 }));
    const curated = all.filter((r) => r.tierAnon);
    expect(curated.length).toBeGreaterThan(TIER_TARGETS.ANON);
    const result = composeAnonRestaurants(all, new Map());
    expect(result).toHaveLength(curated.length);
    expect(result.every((r) => r.tierAnon)).toBe(true);
  });

  it('counts curated spots against their district share instead of stacking on top', () => {
    // Mitte carries every flag; without the seeded skip it would get its
    // curated spots AND a full round-robin share on top.
    const all = catalog(BERLIN, () => ({})).map((r) =>
      r.bezirk?.name === 'Mitte' && r._id <= 'Mitte-005' ? { ...r, tierAnon: true } : r
    );
    const result = composeAnonRestaurants(all, new Map());
    const plain = composeAnonRestaurants(catalog(BERLIN), new Map());
    expect(countPerBezirk(result).get('Mitte')).toBe(countPerBezirk(plain).get('Mitte'));
    expect(result.filter((r) => r.tierAnon)).toHaveLength(6);
  });

  it('still returns the whole catalog when curated spots skip the early rounds', () => {
    // Regression: a district's curated spots make it sit out that many rounds.
    // With the round budget bounded by the pool alone, those skipped rounds
    // were spent for nothing and the queued spots never came — a 6-spot
    // catalog with 2 curated returned 4.
    const all = [
      inBezirk('a1', 'Mitte', { tierAnon: true }),
      inBezirk('a2', 'Mitte', { tierAnon: true }),
      inBezirk('a3', 'Mitte'),
      inBezirk('a4', 'Mitte'),
      inBezirk('b1', 'Mitte'),
      inBezirk('c1', 'Mitte'),
    ];
    const result = composeAnonRestaurants(all, new Map());
    expect(result.map((r) => r._id).sort()).toEqual(['a1', 'a2', 'a3', 'a4', 'b1', 'c1']);
  });

  it('ranks the fill by must-eat count desc, then _id asc', () => {
    const all = [inBezirk('r-a', 'Mitte'), inBezirk('r-b', 'Mitte'), inBezirk('r-c', 'Mitte')];
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
    expect(composeAnonRestaurants(all, new Map())).toHaveLength(8);
  });

  it('treats undistricted spots as one shared bucket', () => {
    // No district ref at all: they must not out-compete a real district by
    // each counting as its own bucket.
    const all = [
      ...catalog({ Mitte: 200 }),
      ...Array.from({ length: 200 }, (_, i) => mkRestaurant(`n${i}`)),
    ];
    const result = composeAnonRestaurants(all, new Map());
    const perBezirk = countPerBezirk(result);
    expect(result).toHaveLength(TIER_TARGETS.ANON);
    expect(perBezirk.get('')).toBe(TIER_TARGETS.ANON / 2);
  });
});

describe('composeSignedRestaurants', () => {
  const berlin = catalog(BERLIN);
  const anon = composeAnonRestaurants(berlin, new Map());
  const anonIds = new Set(anon.map((r) => r._id));

  it('returns the difference, so anon + signed hits TIER_TARGETS.SIGNED exactly', () => {
    const signed = composeSignedRestaurants(berlin, anonIds, new Map());
    expect(anon.length + signed.length).toBe(TIER_TARGETS.SIGNED);
    expect(signed).toHaveLength(TIER_TARGETS.SIGNED - TIER_TARGETS.ANON);
  });

  it('never re-serves a spot the anon tier already gave away', () => {
    const signed = composeSignedRestaurants(berlin, anonIds, new Map());
    expect(signed.every((r) => !anonIds.has(r._id))).toBe(true);
  });

  it('spreads across districts too — an account has to pay off outside Mitte', () => {
    const signed = composeSignedRestaurants(berlin, anonIds, new Map());
    const perBezirk = countPerBezirk(signed);
    // Every district that still had spots left contributes.
    for (const name of ['Mitte', 'Kreuzberg', 'Schoeneberg', 'Charlottenburg', 'PrenzlauerBerg']) {
      expect(perBezirk.get(name) ?? 0).toBeGreaterThan(0);
    }
  });

  it('keeps the flagged spots and counts them against the budget', () => {
    // Deep in Mitte's tail, well past what the anon tier already took.
    const flag = new Set(['Mitte-070', 'Mitte-071', 'Mitte-072']);
    const flagged = berlin.map((r) => (flag.has(r._id) ? { ...r, tierSigned: true } : r));
    const signed = composeSignedRestaurants(flagged, anonIds, new Map());
    expect(signed).toHaveLength(TIER_TARGETS.SIGNED - TIER_TARGETS.ANON);
    expect(
      signed
        .filter((r) => r.tierSigned)
        .map((r) => r._id)
        .sort()
    ).toEqual([...flag].sort());
  });

  it('stops at the catalog when it is smaller than the budget', () => {
    const all = [mkRestaurant('r0'), mkRestaurant('r1'), mkRestaurant('r2')];
    expect(composeSignedRestaurants(all, new Set(), new Map())).toHaveLength(3);
  });

  it('does not require must-eats — 28 of 344 spots carry one', () => {
    const all = catalog({ Mitte: 40 });
    const signed = composeSignedRestaurants(all, new Set(), new Map());
    expect(signed).toHaveLength(40);
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
