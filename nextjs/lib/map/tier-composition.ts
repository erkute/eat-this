// nextjs/lib/map/tier-composition.ts
//
// Pure module that composes tier sets from the Sanity-curated flags
// (`tierAnon`, `tierSigned`, `revealedForAnon`) with deterministic
// fallback fill when curation is incomplete.
//
// Consumers: nextjs/app/api/map-data/route.ts,
//            nextjs/lib/map/server-initial-map-data.ts

import type { MapRestaurant, MapMustEat } from '@/lib/types';

// The ladder, in whole-map terms (user decision, 2026-08-23):
//
//   no account   → ANON spots
//   signed in    → SIGNED spots   (cumulative, NOT additional)
//   pack         → the whole catalog
//
// SIGNED is the running total, so composeSignedRestaurants returns the
// difference and the caller unions both sets. Stating the tier as a total is
// what keeps the two rungs from drifting apart when the catalog grows.
export const TIER_TARGETS = {
  ANON: 100,
  SIGNED: 150,
  REVEALED: 10,
} as const;

// Stable sort: must-eat count DESC, then _id ASC as tiebreak.
function byMustEatCountDesc(
  mustEatCount: Map<string, number>
): (a: MapRestaurant, b: MapRestaurant) => number {
  return (a, b) => {
    const ac = mustEatCount.get(a._id) ?? 0;
    const bc = mustEatCount.get(b._id) ?? 0;
    if (ac !== bc) return bc - ac;
    return a._id.localeCompare(b._id);
  };
}

/** District a spot counts towards. Spots without one share the empty bucket,
 *  which keeps undistricted spots from monopolising a round. */
function bezirkKey(r: MapRestaurant): string {
  return r.bezirk?.name ?? r.district ?? '';
}

/**
 * Spend `budget` spots across the districts, one spot per district per round.
 *
 * A flat "best N" budget is the bug this exists to prevent: five districts
 * hold 269 of 344 spots, so taking N off the top hands them everything and
 * leaves the rest of the city empty (measured 2026-08-19: 8 of 17 districts
 * had zero free spots under a flat budget of 20).
 *
 * Round-robin gives the same coverage a per-district quota gave, but hits the
 * target exactly — which is what lets the number be stated in UI copy. A
 * district runs dry and simply drops out; the leftovers of the final, partial
 * round go to the biggest districts, because that is where the spots are.
 *
 * `seeded` carries per-district counts that already exist (the curated spots).
 * A district seeded with 4 skips rounds 1-4 rather than stacking four more on
 * top — curation shifts WHICH spots a district contributes, never how many.
 */
function fillAcrossBezirke(
  pool: MapRestaurant[],
  budget: number,
  mustEatCount: Map<string, number>,
  seeded: Map<string, number> = new Map()
): MapRestaurant[] {
  if (budget <= 0) return [];

  const queues = new Map<string, MapRestaurant[]>();
  for (const r of [...pool].sort(byMustEatCountDesc(mustEatCount))) {
    const key = bezirkKey(r);
    const queue = queues.get(key);
    if (queue) queue.push(r);
    else queues.set(key, [r]);
  }

  // Fixed order, biggest district first: it decides who gets the extra spot
  // when the budget runs out mid-round. Name as tiebreak keeps it stable.
  const order = [...queues.keys()].sort((a, b) => {
    const sizeDiff = (queues.get(b)?.length ?? 0) - (queues.get(a)?.length ?? 0);
    return sizeDiff !== 0 ? sizeDiff : a.localeCompare(b);
  });

  const taken = new Map(seeded);
  const out: MapRestaurant[] = [];
  // A district contributes nothing until the round passes its seeded count, so
  // the last useful round is bounded by the deepest queue PLUS the largest
  // seed — not by the pool size alone. Bounding on the pool alone silently
  // truncated small catalogs: the seeded rounds burned through the budget of
  // rounds without taking anything, and spots that had queued up never came.
  const maxSeeded = seeded.size > 0 ? Math.max(...seeded.values()) : 0;
  const lastRound = pool.length + maxSeeded;
  for (let round = 1; out.length < budget && round <= lastRound; round++) {
    for (const key of order) {
      if (out.length >= budget) break;
      if ((taken.get(key) ?? 0) >= round) continue;
      const next = queues.get(key)?.shift();
      if (!next) continue;
      out.push(next);
      taken.set(key, (taken.get(key) ?? 0) + 1);
    }
  }
  return out;
}

/**
 * Anon tier: every curated spot, then a round-robin fill up to TIER_TARGETS.ANON.
 *
 * The flag IS the editorial decision, so a `tierAnon` spot is always on the
 * free map — it is counted against its district's share but never displaced,
 * and a catalog curated past the budget keeps all of them.
 *
 * Ranking inside a district is must-eat count then `_id`. There is no quality
 * signal to rank by — the enriched importer fills photo, tip and description
 * for every spot, so the vast majority are indistinguishable to this code
 * (measured 2026-08-19). The `_id` order is therefore arbitrary but STABLE,
 * which matters more: a returning user must not lose spots they saw last week.
 * Curation is what replaces an arbitrary pick.
 */
export function composeAnonRestaurants(
  all: MapRestaurant[],
  mustEatCount: Map<string, number>
): MapRestaurant[] {
  const curated = all.filter((r) => r.tierAnon);
  const curatedIds = new Set(curated.map((r) => r._id));
  const seeded = new Map<string, number>();
  for (const r of curated) {
    const key = bezirkKey(r);
    seeded.set(key, (seeded.get(key) ?? 0) + 1);
  }

  const fill = fillAcrossBezirke(
    all.filter((r) => !curatedIds.has(r._id)),
    TIER_TARGETS.ANON - curated.length,
    mustEatCount,
    seeded
  );
  return [...curated, ...fill];
}

/**
 * Signed tier: the spots an account adds on top of the anon set.
 *
 * Returns the DIFFERENCE, not the total — `TIER_TARGETS.SIGNED` counts the
 * whole signed-in map, so the budget here is what is left after the anon set.
 * Same round-robin, same reason: an account has to be worth something in the
 * district the user actually lives in, not only in Mitte.
 *
 * No must-eat constraint — 28 of 344 spots carry one, so gating on them would
 * cap the tier far below its budget.
 */
export function composeSignedRestaurants(
  all: MapRestaurant[],
  anonIds: Set<string>,
  mustEatCount: Map<string, number>
): MapRestaurant[] {
  const pool = all.filter((r) => !anonIds.has(r._id));
  const flagged = pool.filter((r) => r.tierSigned);
  const flaggedIds = new Set(flagged.map((r) => r._id));
  const seeded = new Map<string, number>();
  for (const r of flagged) {
    const key = bezirkKey(r);
    seeded.set(key, (seeded.get(key) ?? 0) + 1);
  }

  const fill = fillAcrossBezirke(
    pool.filter((r) => !flaggedIds.has(r._id)),
    TIER_TARGETS.SIGNED - anonIds.size - flagged.length,
    mustEatCount,
    seeded
  );
  return [...flagged, ...fill];
}

// Revealed must-eats (anon view): up to TARGET_REVEALED total, all of
// them on restaurants in the anon set, and at most ONE card per restaurant —
// a spot with two must-eats keeps the second face-down (something left to
// discover on site). Flagged (`revealedForAnon`) first, then fallback fill
// by stable _id ordering.
export function composeRevealedMustEats(all: MapMustEat[], anonIds: Set<string>): Set<string> {
  const onAnonRestaurants = all.filter((m) => anonIds.has(m.restaurant._id));
  const out = new Set<string>();
  const usedRestaurants = new Set<string>();
  const take = (m: MapMustEat) => {
    if (out.size >= TIER_TARGETS.REVEALED) return;
    if (usedRestaurants.has(m.restaurant._id)) return;
    usedRestaurants.add(m.restaurant._id);
    out.add(m._id);
  };
  for (const m of onAnonRestaurants) if (m.revealedForAnon) take(m);
  const fallbackPool = onAnonRestaurants
    .filter((m) => !out.has(m._id))
    .sort((a, b) => a._id.localeCompare(b._id));
  for (const m of fallbackPool) take(m);
  return out;
}
