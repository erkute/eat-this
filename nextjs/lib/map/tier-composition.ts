// nextjs/lib/map/tier-composition.ts
//
// Pure module that composes tier sets from the Sanity-curated flags
// (`tierAnon`, `tierSigned`, `revealedForAnon`) with deterministic
// fallback fill when curation is incomplete.
//
// Consumer: nextjs/app/api/map-data/route.ts

import type { MapRestaurant, MapMustEat } from '@/lib/types';

export const TIER_TARGETS = {
  SIGNED: 20,
  REVEALED: 10,
} as const;

// The free map guarantees this many spots per district, or every spot the
// district has when it has fewer. Measured 2026-08-19: the old flat budget of
// 20 left 8 of 17 districts with zero free spots and put a third of them in
// Schöneberg, because no rule in the composition knew about geography. At 5
// the catalog yields 62 free spots — the range chosen for "the free map has to
// stand on its own".
export const ANON_PER_BEZIRK = 5;

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
 *  which caps how many undistricted spots the free map can accumulate. */
function bezirkKey(r: MapRestaurant): string {
  return r.bezirk?.name ?? r.district ?? '';
}

// Anon tier: every curated spot, then a fill that tops each district up to
// ANON_PER_BEZIRK.
//
// The flag IS the editorial decision, so a `tierAnon` spot is always on the free
// map — it is counted against its district's quota but never displaced by the
// fill, and a district curated past the quota keeps all of them.
//
// The fill used to be "the spots with the most must-eats, up to a flat 20".
// That had no notion of where a spot is, which is how 8 of 17 districts ended
// up with nothing free. It was also throttled by must-eat scarcity: 21 of 345
// restaurants carry one, so the budget could never be spent on coverage.
//
// Ranking inside a district stays must-eat count then `_id`. There is no
// quality signal to rank by — the enriched importer fills photo, tip and
// description for every spot, so 343 of 345 are indistinguishable to this code
// (measured 2026-08-19). The `_id` order is therefore arbitrary but STABLE,
// which matters more: a returning user must not lose spots they saw last week.
// Curation is what replaces an arbitrary pick — every new `tierAnon` flag
// pushes one out of its district's quota.
export function composeAnonRestaurants(
  all: MapRestaurant[],
  mustEatCount: Map<string, number>
): MapRestaurant[] {
  const curated = all.filter((r) => r.tierAnon);
  const taken = new Set(curated.map((r) => r._id));
  const used = new Map<string, number>();
  for (const r of curated) {
    const key = bezirkKey(r);
    used.set(key, (used.get(key) ?? 0) + 1);
  }

  const fill: MapRestaurant[] = [];
  for (const r of [...all].sort(byMustEatCountDesc(mustEatCount))) {
    if (taken.has(r._id)) continue;
    const key = bezirkKey(r);
    const n = used.get(key) ?? 0;
    if (n >= ANON_PER_BEZIRK) continue;
    used.set(key, n + 1);
    fill.push(r);
  }
  return [...curated, ...fill];
}

// Signed tier: flagged set (minus anon overlap) + fallback excluding anon
// AND already-flagged. NO must-eat constraint — signed-tier can include
// restaurants without must-eats.
export function composeSignedRestaurants(
  all: MapRestaurant[],
  anonIds: Set<string>,
  mustEatCount: Map<string, number>
): MapRestaurant[] {
  const flagged = all.filter((r) => r.tierSigned && !anonIds.has(r._id));
  if (flagged.length >= TIER_TARGETS.SIGNED) {
    return flagged;
  }
  const flaggedIds = new Set(flagged.map((r) => r._id));
  const fallbackPool = all
    .filter((r) => !anonIds.has(r._id) && !flaggedIds.has(r._id))
    .sort(byMustEatCountDesc(mustEatCount));
  const fillCount = TIER_TARGETS.SIGNED - flagged.length;
  return [...flagged, ...fallbackPool.slice(0, fillCount)];
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
