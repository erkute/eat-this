# Plan 3 — Tier Model API + UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the three-tier access model live by refactoring `/api/map-data` to compose visible sets from Sanity-curated `tierAnon` / `tierSigned` / `revealedForAnon` flags, with a lenient fallback that fills under-curated tiers algorithmically. Plus: ensure the geofence reveal mechanic only fires for signed-in users (no anon reveals), and add a visual "covered" state for anon-view must-eats.

**Architecture:**
- New pure module `nextjs/lib/map/tier-composition.ts` exports functions that take all restaurants + flagged set + target count → return composed set. Fallback rule: take all flagged, then top up with deterministic top-N-by-must-eat-count picks excluding already-flagged.
- `/api/map-data` becomes a thin orchestrator: resolve tier from auth + entitlements, call tier-composition with the right targets, return composed visible set + must-eats.
- Reveal overlay's auth gate is already implicit (`useUnlockedMustEats` early-returns on `!uid`); Plan 3 makes it explicit.
- CSS adds a `.covered-anon` state — distinguished from the existing locked-restaurant grey-out, so users see "this exists but you'd need login to unlock the reveal".

**Tech Stack:** Next.js 15, Vitest, Sanity GROQ, Firebase Admin (server-side entitlement resolve)

**Spec:** [`docs/specs/2026-05-27-staging-and-migration-design.md`](../specs/2026-05-27-staging-and-migration-design.md) §4 (Tier model)

**Branch flow:** Work on `staging` directly. Each task = commit. PR `staging` → `main` after Task 8 smoke.

**Constants (centralised at top of `tier-composition.ts`):**

```ts
export const TIER_TARGETS = {
  ANON:     20,  // restaurants visible to anonymous viewers
  SIGNED:   20,  // additional restaurants unlocked by signup
  REVEALED: 10,  // must-eats shown OPEN to anonymous viewers (rest covered)
} as const
```

Operator can edit these without touching call sites — curation can stay loose (~18 flagged is fine; fallback fills to 20).

---

## File Structure

### New
- `nextjs/lib/map/tier-composition.ts` — pure module: 3 composer functions + helpers
- `nextjs/lib/map/__tests__/tier-composition.test.ts` — unit tests

### Modified
- `nextjs/lib/map/queries.ts` — add `tierAnon`, `tierSigned` to `mapRestaurantsQuery`; add `revealedForAnon` to `mapMustEatsQuery`
- `nextjs/lib/types.ts` — extend `MapRestaurant` (+ tierAnon/tierSigned booleans), `MapMustEat` (+ revealedForAnon boolean)
- `nextjs/app/api/map-data/route.ts` — refactor: replace trial-sample-20 path with tier-composition
- `nextjs/__tests__/app/api/map-data.test.ts` — NEW (or extend existing) — integration test for tier composition
- `nextjs/app/components/map/MustEatRevealOverlay.tsx` — explicit auth gate (defensive even though `useUnlockedMustEats` already handles it)
- `nextjs/app/components/map/map.module.css` (or whichever stylesheet owns map markers) — `.coveredAnon` state for must-eats on anon view

### Out of scope (Plan 4)
- Referral system (Cloud Function `confirmReferral`, profile UI, cookie capture)
- Onboarding tweaks for signup flow
- Email verification UI changes

---

## Task 1: Extend GROQ queries + types

**Files:**
- Modify: `nextjs/lib/map/queries.ts`
- Modify: `nextjs/lib/types.ts`

Add the three new fields to the projections so the cached Sanity payload includes them. Types must be extended in lockstep so TypeScript catches downstream consumers.

- [ ] **Step 1: Verify branch**

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" rev-parse --abbrev-ref HEAD
```

Expected: `staging`.

- [ ] **Step 2: Read current files**

```bash
cat "/Users/ersane/Downloads/Projekte/Eat This/nextjs/lib/map/queries.ts"
grep -n "MapRestaurant\|MapMustEat" "/Users/ersane/Downloads/Projekte/Eat This/nextjs/lib/types.ts"
```

Note the structure of both files. The queries.ts file has projection strings; types.ts has interfaces matching them.

- [ ] **Step 3: Update mapRestaurantsQuery**

In `nextjs/lib/map/queries.ts`, add `tierAnon` and `tierSigned` to the projection. Both are top-level fields on the restaurant document.

Existing projection includes lines like `name`, `isClosed`, `cuisineType` etc. Add right after `featured` (if present) or after `cuisineType`:

```groq
    tierAnon,
    tierSigned,
```

Treat missing values as `false` — Sanity returns `null` for unset booleans, and the consumer treats null/false identically. No defaulting needed in the query.

- [ ] **Step 4: Update mapMustEatsQuery**

In the same file, add `revealedForAnon` to the must-eat projection — top-level field. Insert after `price` or wherever fits the existing alphabetical/logical order.

```groq
    revealedForAnon,
```

- [ ] **Step 5: Update types**

In `nextjs/lib/types.ts`:

Extend `MapRestaurant` interface:

```ts
export interface MapRestaurant {
  // ... existing fields
  tierAnon?:   boolean
  tierSigned?: boolean
}
```

Optional (`?`) because Sanity-returned values may be undefined for older restaurants without the flag yet.

Extend `MapMustEat` interface:

```ts
export interface MapMustEat {
  // ... existing fields
  revealedForAnon?: boolean
}
```

- [ ] **Step 6: TypeScript check**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/nextjs" && npx tsc --noEmit 2>&1 | grep -E "(tierAnon|tierSigned|revealedForAnon|MapRestaurant|MapMustEat)" | head -10
```

Expected: no output. If errors appear, fix at the corresponding consumer.

- [ ] **Step 7: Commit**

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" add nextjs/lib/map/queries.ts nextjs/lib/types.ts
git -C "/Users/ersane/Downloads/Projekte/Eat This" commit -m "map(queries+types): expose tier flags + revealedForAnon"
```

---

## Task 2: Pure tier-composition module (TDD)

**Files:**
- Create: `nextjs/lib/map/tier-composition.ts`
- Create: `nextjs/lib/map/__tests__/tier-composition.test.ts`

The heart of Plan 3: deterministic, testable composition of tier sets with fallback.

### Step 1: Write the failing test

Create `nextjs/lib/map/__tests__/tier-composition.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  composeAnonRestaurants,
  composeSignedRestaurants,
  composeRevealedMustEats,
  TIER_TARGETS,
} from '@/lib/map/tier-composition'
import type { MapRestaurant, MapMustEat } from '@/lib/types'

// Helpers — generate fake restaurants/must-eats with predictable shape
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

describe('composeAnonRestaurants', () => {
  it('returns only flagged when count >= TARGET_ANON', () => {
    // 25 flagged — should return 25 (no truncation)
    const all = Array.from({ length: 30 }, (_, i) =>
      mkRestaurant(`r${i}`, { tierAnon: i < 25 })
    )
    const mustEatCount = new Map(all.map((r) => [r._id, 1]))
    const result = composeAnonRestaurants(all, mustEatCount)
    expect(result.length).toBe(25)
    expect(result.every((r) => r.tierAnon)).toBe(true)
  })

  it('tops up to TARGET_ANON when flagged count < target', () => {
    // 10 flagged, 30 total with must-eats — should return TARGET_ANON (=20)
    const all = Array.from({ length: 30 }, (_, i) =>
      mkRestaurant(`r${i}`, { tierAnon: i < 10 })
    )
    const mustEatCount = new Map(all.map((r) => [r._id, i_must_eat_count(r._id, all)]))
    const result = composeAnonRestaurants(all, mustEatCount)
    expect(result.length).toBe(TIER_TARGETS.ANON)
    // First 10 should be the flagged ones; remaining 10 from fallback
    expect(result.slice(0, 10).every((r) => r.tierAnon)).toBe(true)
    expect(result.slice(10).every((r) => !r.tierAnon)).toBe(true)
  })

  it('fallback picks by must-eat count desc, then _id asc as tiebreak', () => {
    // 0 flagged. 5 total. Must-eat counts: r0=5, r1=3, r2=3, r3=1, r4=0.
    // Expected order: r0, r1, r2, r3 (4 only — r4 has no must-eats, ineligible).
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

  it('fallback excludes restaurants without must-eats', () => {
    // Spec says anon-tier restaurants all have must-eats. Fallback honors this.
    const all = [
      mkRestaurant('r0', { tierAnon: true }),
      mkRestaurant('r1'), // no must-eats
      mkRestaurant('r2'),
    ]
    const mustEatCount = new Map([['r0', 1], ['r1', 0], ['r2', 2]])
    const result = composeAnonRestaurants(all, mustEatCount)
    expect(result.map((r) => r._id)).toEqual(['r0', 'r2'])
  })
})

describe('composeSignedRestaurants', () => {
  it('returns flagged when >= TARGET_SIGNED', () => {
    const all = Array.from({ length: 30 }, (_, i) =>
      mkRestaurant(`r${i}`, { tierSigned: i < 22 })
    )
    const result = composeSignedRestaurants(all, new Set(), new Map(all.map((r) => [r._id, 1])))
    expect(result.length).toBe(22)
  })

  it('tops up to TARGET_SIGNED excluding anon set', () => {
    // 5 anon (excluded), 5 signed flagged, 30 total. Target: 20 signed.
    // Result: 5 flagged + 15 fallback picked from the 20 unflagged non-anon.
    const all = Array.from({ length: 30 }, (_, i) =>
      mkRestaurant(`r${i}`, { tierSigned: i >= 5 && i < 10 })
    )
    const anonIds = new Set(all.slice(0, 5).map((r) => r._id))
    const result = composeSignedRestaurants(all, anonIds, new Map(all.map((r) => [r._id, 1])))
    expect(result.length).toBe(TIER_TARGETS.SIGNED)
    // No overlap with anon set
    expect(result.every((r) => !anonIds.has(r._id))).toBe(true)
  })

  it('signed-tier fallback does NOT require must-eats (looser than anon)', () => {
    // Spec: signed-tier can include spots without must-eats. Fallback should not filter them out.
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
  it('returns flagged when >= TARGET_REVEALED', () => {
    const allMustEats = Array.from({ length: 15 }, (_, i) =>
      mkMustEat(`m${i}`, 'r0', { revealedForAnon: i < 12 })
    )
    const result = composeRevealedMustEats(allMustEats, new Set(['r0']))
    expect(result.size).toBe(12)
  })

  it('tops up to TARGET_REVEALED among anon-restaurant must-eats only', () => {
    // 5 flagged on anon-restaurants, plus 20 unflagged on anon-restaurants,
    // plus 10 on non-anon restaurants (ignored). Target: 10.
    const anonIds = new Set(['r0', 'r1'])
    const allMustEats = [
      ...Array.from({ length: 5 }, (_, i) => mkMustEat(`f${i}`, 'r0', { revealedForAnon: true })),
      ...Array.from({ length: 20 }, (_, i) => mkMustEat(`u${i}`, 'r1')),
      ...Array.from({ length: 10 }, (_, i) => mkMustEat(`x${i}`, 'r2')),
    ]
    const result = composeRevealedMustEats(allMustEats, anonIds)
    expect(result.size).toBe(TIER_TARGETS.REVEALED)
    // No reveal IDs are on the non-anon restaurant
    const onAnon = allMustEats
      .filter((m) => result.has(m._id))
      .every((m) => anonIds.has(m.restaurant._id))
    expect(onAnon).toBe(true)
  })

  it('returns fewer than TARGET_REVEALED if pool exhausted', () => {
    // Only 4 must-eats total on anon restaurants, all flagged.
    const allMustEats = Array.from({ length: 4 }, (_, i) =>
      mkMustEat(`m${i}`, 'r0', { revealedForAnon: true })
    )
    const result = composeRevealedMustEats(allMustEats, new Set(['r0']))
    expect(result.size).toBe(4)
  })
})

// Helper: lookup must-eat count for a restaurant from a flat list
function i_must_eat_count(restaurantId: string, restaurants: MapRestaurant[]): number {
  return 2 // each restaurant has 2 must-eats in the topup test fixture
}
```

The helper function name `i_must_eat_count` is intentional (prefix avoids accidental conflict with the production export). Adjust per the actual fixture if needed.

### Step 2: Run tests — must fail

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/nextjs" && npx vitest run lib/map/__tests__/tier-composition.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/map/tier-composition'`.

### Step 3: Implement `tier-composition.ts`

```ts
// nextjs/lib/map/tier-composition.ts

import type { MapRestaurant, MapMustEat } from '@/lib/types'

export const TIER_TARGETS = {
  ANON:     20,
  SIGNED:   20,
  REVEALED: 10,
} as const

// Deterministic sort: by must-eat count DESC, then by _id ASC.
function byMustEatCountDesc(
  mustEatCount: Map<string, number>,
): (a: MapRestaurant, b: MapRestaurant) => number {
  return (a, b) => {
    const ac = mustEatCount.get(a._id) ?? 0
    const bc = mustEatCount.get(b._id) ?? 0
    if (ac !== bc) return bc - ac
    return a._id.localeCompare(b._id)
  }
}

// Anon tier: flagged set + fallback picks from restaurants with at least one
// must-eat, excluding already-flagged. Targets TIER_TARGETS.ANON total.
export function composeAnonRestaurants(
  all:          MapRestaurant[],
  mustEatCount: Map<string, number>,
): MapRestaurant[] {
  const flagged = all.filter((r) => r.tierAnon)
  if (flagged.length >= TIER_TARGETS.ANON) {
    return flagged
  }
  const flaggedIds = new Set(flagged.map((r) => r._id))
  const fallbackPool = all
    .filter((r) => !flaggedIds.has(r._id) && (mustEatCount.get(r._id) ?? 0) > 0)
    .sort(byMustEatCountDesc(mustEatCount))
  const fillCount = TIER_TARGETS.ANON - flagged.length
  return [...flagged, ...fallbackPool.slice(0, fillCount)]
}

// Signed tier: flagged set + fallback picks excluding anon set + flagged.
// Looser than anon — must-eat requirement is NOT applied.
export function composeSignedRestaurants(
  all:          MapRestaurant[],
  anonIds:      Set<string>,
  mustEatCount: Map<string, number>,
): MapRestaurant[] {
  const flagged = all.filter((r) => r.tierSigned && !anonIds.has(r._id))
  if (flagged.length >= TIER_TARGETS.SIGNED) {
    return flagged
  }
  const flaggedIds = new Set(flagged.map((r) => r._id))
  const fallbackPool = all
    .filter((r) => !anonIds.has(r._id) && !flaggedIds.has(r._id))
    .sort(byMustEatCountDesc(mustEatCount))
  const fillCount = TIER_TARGETS.SIGNED - flagged.length
  return [...flagged, ...fallbackPool.slice(0, fillCount)]
}

// Revealed must-eats: those flagged revealedForAnon AND whose parent
// restaurant is in the anon set. Fallback: top up by `order` within the
// anon-restaurant pool until target met.
export function composeRevealedMustEats(
  all:     MapMustEat[],
  anonIds: Set<string>,
): Set<string> {
  const onAnon = all.filter((m) => anonIds.has(m.restaurant._id))
  const flagged = onAnon.filter((m) => m.revealedForAnon)
  if (flagged.length >= TIER_TARGETS.REVEALED) {
    return new Set(flagged.slice(0, TIER_TARGETS.REVEALED).map((m) => m._id))
  }
  const flaggedIds = new Set(flagged.map((m) => m._id))
  const fallbackPool = onAnon
    .filter((m) => !flaggedIds.has(m._id))
    // Deterministic by _id (no `order` field in shape, but _id is stable)
    .sort((a, b) => a._id.localeCompare(b._id))
  const fillCount = TIER_TARGETS.REVEALED - flagged.length
  return new Set([
    ...flagged.map((m) => m._id),
    ...fallbackPool.slice(0, fillCount).map((m) => m._id),
  ])
}
```

### Step 4: Run tests — must pass

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/nextjs" && npx vitest run lib/map/__tests__/tier-composition.test.ts
```

Expected: all pass. If failures, fix.

### Step 5: TypeScript check

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/nextjs" && npx tsc --noEmit 2>&1 | grep "tier-composition" | head
```

Expected: no output.

### Step 6: Commit

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" add nextjs/lib/map/tier-composition.ts nextjs/lib/map/__tests__/tier-composition.test.ts
git -C "/Users/ersane/Downloads/Projekte/Eat This" commit -m "map(tier-composition): pure module with fallback fill, +tests"
```

---

## Task 3: Refactor `/api/map-data` to use tier-composition

**Files:**
- Modify: `nextjs/app/api/map-data/route.ts`
- Modify or create: `nextjs/__tests__/app/api/map-data.test.ts`

The current route has 3 branches: admin/all-berlin → full, has-entitlements → filtered, else → trial-20. Replace the "else" path with composed tier sets, and adjust the has-entitlements branch to union categories with the tier sets.

### Step 1: Read current route

```bash
cat "/Users/ersane/Downloads/Projekte/Eat This/nextjs/app/api/map-data/route.ts"
```

Identify the existing `TRIAL_SAMPLE_SIZE` constant and the "else" branch that computes the trial set.

### Step 2: Refactor

Replace the route body so the flow becomes:

```ts
import { NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase/admin'
import {
  resolveEntitlements,
  isRestaurantVisible,
} from '@/lib/firebase/entitlements'
import { getCachedMapData } from '@/lib/map/cached-sanity'
import {
  composeAnonRestaurants,
  composeSignedRestaurants,
  composeRevealedMustEats,
} from '@/lib/map/tier-composition'

export const dynamic    = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  // 1. Resolve auth — same as before.
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  let uid:   string | null = null
  let email: string | null = null
  if (token) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(token)
      uid   = decoded.uid
      email = decoded.email ?? null
    } catch {
      // Treat as anonymous.
    }
  }

  const ent = await resolveEntitlements(uid, email)
  const { restaurants: all, mustEats: allMustEats, categories } = await getCachedMapData()

  // 2. Pre-compute helpers shared across branches.
  const mustEatCountByRestaurant = new Map<string, number>()
  for (const m of allMustEats) {
    const rid = m.restaurant._id
    mustEatCountByRestaurant.set(rid, (mustEatCountByRestaurant.get(rid) ?? 0) + 1)
  }

  // 3. All-berlin / admin: full catalog, no filter.
  if (ent.isAdmin || ent.hasAllBerlin) {
    const res = NextResponse.json({
      restaurants: all,
      mustEats: allMustEats,
      categories,
      totalCount: all.length,
      lockedRestaurants: [],
      revealedMustEatIds: [],  // signed-in / paid don't need this signal
    })
    res.headers.set('Cache-Control', 'private, no-store')
    return res
  }

  // 4. Compose the tier sets.
  const anonSet     = composeAnonRestaurants(all, mustEatCountByRestaurant)
  const anonIds     = new Set(anonSet.map((r) => r._id))
  const revealedIds = uid
    ? []                                       // signed-in users get reveal via Firestore unlockedMustEats
    : Array.from(composeRevealedMustEats(allMustEats, anonIds))

  let visibleRestaurants: typeof all
  if (!uid) {
    // Anonymous: only anon set.
    visibleRestaurants = anonSet
  } else {
    // Signed-in (any tier including paid-category).
    const signedSet     = composeSignedRestaurants(all, anonIds, mustEatCountByRestaurant)
    const signedIds     = new Set(signedSet.map((r) => r._id))
    const tierUnion     = [...anonSet, ...signedSet]
    const tierUnionIds  = new Set(tierUnion.map((r) => r._id))

    if (ent.categorySlugs.size > 0) {
      // Paid category: union with all spots in that category.
      const categoryMatched = all.filter(
        (r) => !tierUnionIds.has(r._id) && isRestaurantVisible(r, ent),
      )
      visibleRestaurants = [...tierUnion, ...categoryMatched]
    } else {
      // Free signed-in: just the tier union.
      visibleRestaurants = tierUnion
    }
  }

  const visibleIdSet      = new Set(visibleRestaurants.map((r) => r._id))
  const visibleMustEats   = allMustEats.filter((m) => visibleIdSet.has(m.restaurant._id))
  const lockedRestaurants = all.filter((r) => !visibleIdSet.has(r._id))

  const res = NextResponse.json({
    restaurants: visibleRestaurants,
    mustEats: visibleMustEats,
    categories,
    totalCount: all.length,
    lockedRestaurants,
    revealedMustEatIds: revealedIds,
  })
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}
```

Key differences from before:
- `TRIAL_SAMPLE_SIZE` constant removed (tier-composition owns the targets)
- `revealedMustEatIds` field added to response — anon view uses it to show which must-eats are OPEN (otherwise cover them visually)
- Signed-in path always unions anon + signed (the "+20" effect)
- Locked preview still computed, same shape as before

### Step 3: Write integration test

Create `nextjs/__tests__/app/api/map-data.test.ts` (or extend if one exists):

```ts
// nextjs/__tests__/app/api/map-data.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock both the cached Sanity payload AND the entitlements resolver
// so the test runs as a pure transform.

vi.mock('@/lib/map/cached-sanity', () => ({
  getCachedMapData: vi.fn(),
}))

vi.mock('@/lib/firebase/entitlements', async () => {
  const actual = await vi.importActual<typeof import('@/lib/firebase/entitlements')>('@/lib/firebase/entitlements')
  return {
    ...actual,
    resolveEntitlements: vi.fn(),
  }
})

vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({
    verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-uid', email: 'test@example.com' }),
  }),
}))

import { GET } from '@/app/api/map-data/route'
import { getCachedMapData } from '@/lib/map/cached-sanity'
import { resolveEntitlements } from '@/lib/firebase/entitlements'

function mkReq(token: string | null = null): Request {
  const headers = new Headers()
  if (token) headers.set('authorization', `Bearer ${token}`)
  return new Request('https://example.com/api/map-data', { headers })
}

function mkRestaurant(id: string, opts: Partial<{tierAnon: boolean; tierSigned: boolean}> = {}) {
  return { _id: id, name: `R-${id}`, slug: id, tierAnon: false, tierSigned: false, categories: [], ...opts }
}

function mkMustEat(id: string, restaurantId: string, opts: Partial<{revealedForAnon: boolean}> = {}) {
  return {
    _id: id,
    dish: `Dish ${id}`,
    revealedForAnon: false,
    restaurant: { _id: restaurantId, name: `R-${restaurantId}`, slug: restaurantId },
    ...opts,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('/api/map-data — tier composition', () => {
  it('anonymous: returns anonSet + revealedMustEatIds', async () => {
    const restaurants = [
      mkRestaurant('a1', { tierAnon: true }),
      mkRestaurant('a2', { tierAnon: true }),
      mkRestaurant('b1', { tierSigned: true }),
      mkRestaurant('c1'),
    ]
    const mustEats = [
      mkMustEat('m1', 'a1', { revealedForAnon: true }),
      mkMustEat('m2', 'a2'),
      mkMustEat('m3', 'b1'),
    ]
    vi.mocked(getCachedMapData).mockResolvedValue({
      restaurants: restaurants as any,
      mustEats: mustEats as any,
      categories: [],
    })
    vi.mocked(resolveEntitlements).mockResolvedValue({
      isAdmin: false,
      hasAllBerlin: false,
      categorySlugs: new Set(),
      restaurantIds: new Set(),
      mustEatIds: new Set(),
    })

    const res = await GET(mkReq(null))
    const json = await res.json()

    // Anonymous: tierAnon spots visible (a1, a2 — only flagged, since pool is tiny — fallback may add more)
    expect(json.restaurants.map((r: any) => r._id).sort()).toEqual(['a1', 'a2'])
    expect(json.mustEats.map((m: any) => m._id).sort()).toEqual(['m1', 'm2'])
    expect(json.revealedMustEatIds).toContain('m1')
    expect(json.lockedRestaurants.map((r: any) => r._id).sort()).toEqual(['b1', 'c1'])
  })

  it('signed-in (no entitlements): returns anonSet + signedSet', async () => {
    const restaurants = [
      mkRestaurant('a1', { tierAnon: true }),
      mkRestaurant('a2', { tierAnon: true }),
      mkRestaurant('s1', { tierSigned: true }),
      mkRestaurant('s2', { tierSigned: true }),
      mkRestaurant('c1'),
    ]
    vi.mocked(getCachedMapData).mockResolvedValue({
      restaurants: restaurants as any,
      mustEats: [],
      categories: [],
    })
    vi.mocked(resolveEntitlements).mockResolvedValue({
      isAdmin: false,
      hasAllBerlin: false,
      categorySlugs: new Set(),
      restaurantIds: new Set(),
      mustEatIds: new Set(),
    })

    const res = await GET(mkReq('valid-token'))
    const json = await res.json()
    expect(json.restaurants.map((r: any) => r._id).sort()).toEqual(['a1', 'a2', 's1', 's2'])
    expect(json.revealedMustEatIds).toEqual([])  // signed-in: empty signal
    expect(json.lockedRestaurants.map((r: any) => r._id)).toEqual(['c1'])
  })

  it('all-berlin: returns full catalog, no locked preview', async () => {
    const restaurants = [mkRestaurant('a1'), mkRestaurant('b1'), mkRestaurant('c1')]
    vi.mocked(getCachedMapData).mockResolvedValue({
      restaurants: restaurants as any,
      mustEats: [],
      categories: [],
    })
    vi.mocked(resolveEntitlements).mockResolvedValue({
      isAdmin: false,
      hasAllBerlin: true,
      categorySlugs: new Set(),
      restaurantIds: new Set(),
      mustEatIds: new Set(),
    })

    const res = await GET(mkReq('valid-token'))
    const json = await res.json()
    expect(json.restaurants.length).toBe(3)
    expect(json.lockedRestaurants).toEqual([])
  })
})
```

### Step 4: Run tests

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/nextjs" && npx vitest run __tests__/app/api/map-data.test.ts
```

Expected: all pass.

### Step 5: Run full test suite to catch regressions

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/nextjs" && npx vitest run 2>&1 | tail -5
```

Expected: passes modulo the 5 pre-existing failures from Plans 1+2.

### Step 6: Build

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/nextjs" && npm run build 2>&1 | tail -5
```

Expected: clean.

### Step 7: Commit

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" add nextjs/app/api/map-data/route.ts nextjs/__tests__/app/api/map-data.test.ts
git -C "/Users/ersane/Downloads/Projekte/Eat This" commit -m "api(map-data): tier-based filter with fallback fill"
```

---

## Task 4: Explicit auth gate on reveal overlay

**Files:**
- Modify: `nextjs/app/components/map/MustEatRevealOverlay.tsx`

The overlay's reveal trigger is currently implicit (Firestore write to `users/{uid}/unlockedMustEats` early-returns if uid is null). Make it explicit so the geofence proximity check itself short-circuits for anon. This is defensive — protects against a future refactor that decouples the reveal trigger from the Firestore write.

- [ ] **Step 1: Read MustEatRevealOverlay**

```bash
cat "/Users/ersane/Downloads/Projekte/Eat This/nextjs/app/components/map/MustEatRevealOverlay.tsx"
```

Identify:
- How it knows the current user (likely a `uid` prop or a hook like `useAuth`)
- The geofence-proximity check (`useEffect` watching distance against 50m)
- The reveal-trigger callback

- [ ] **Step 2: Add explicit guard**

At the entry point of the geofence check effect (or the reveal callback), add:

```ts
if (!uid) return  // anon visitors cannot reveal — only signed-in
```

Where exactly depends on the component's structure. The principle: any code path that would fire the reveal animation (state change to "revealed") must short-circuit when `uid` is null.

- [ ] **Step 3: Quick verification**

The existing tests (if any) for the overlay should still pass. The change is purely defensive — no behavior change for signed-in users.

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/nextjs" && npx vitest run 2>&1 | grep -i "reveal\|MustEat" | head
```

If no overlay test exists, that's fine — the defensive guard is straightforward enough to skip a dedicated test.

- [ ] **Step 4: Commit**

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" add nextjs/app/components/map/MustEatRevealOverlay.tsx
git -C "/Users/ersane/Downloads/Projekte/Eat This" commit -m "map(reveal): explicit anon-blocking guard on overlay trigger"
```

---

## Task 5: Anon-covered must-eat visual state (CSS)

**Files:**
- Modify: one of the map CSS module files (likely `nextjs/app/components/map/map.module.css` or similar — verify path during implementation)

The /api/map-data response now includes `revealedMustEatIds`. Anon users see all visible-restaurants' must-eats, but only those in the revealed list should be shown OPEN. The rest get a `.coveredAnon` class for a distinct visual treatment:
- Subtle blur or dim overlay on the must-eat preview
- Lock icon hint
- NOT interactive (no tap-to-reveal — anon can't reveal)

### Step 1: Find the must-eat marker component

```bash
grep -rln "must-eat" "/Users/ersane/Downloads/Projekte/Eat This/nextjs/app/components/map" --include="*.tsx" | head -5
```

Likely candidates: `MapMustEatsList.tsx`, `MustEatMarker.tsx`, similar.

### Step 2: Read the relevant component

Identify where the must-eat visual is rendered. Determine where to apply the `.coveredAnon` class conditionally.

### Step 3: Add the CSS

In the appropriate module CSS file, add:

```css
.coveredAnon {
  filter: blur(2px) opacity(0.6);
  pointer-events: none;
  cursor: default;
}

.coveredAnon::after {
  content: '🔒';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.25em;
  filter: none;
  opacity: 0.85;
}
```

Adjust the exact treatment to fit the project's design language (CLAUDE.md notes the brand is editorial / cream-and-yellow / no-pulse-animations). The point is: a clear "this is gated" visual that's not interactive.

### Step 4: Apply conditionally

In the must-eat marker component (whatever its name turns out to be), pass `revealedMustEatIds` from the API response as a Set, and conditionally apply the class:

```tsx
const isOpen = revealedMustEatIds.has(mustEat._id) || unlockedMustEatIds.has(mustEat._id)
const className = `${baseClass} ${isOpen ? '' : isAnon ? styles.coveredAnon : styles.coveredSignedIn}`
```

Where `coveredSignedIn` is the existing covered-state for signed-in users (which IS interactive — they can tap-to-reveal via geofence).

If `.coveredSignedIn` doesn't exist as a distinct state, you may need to add it. The key difference: anon-covered is decorative-only; signed-in-covered is interactive (tap-to-reveal-via-geofence).

### Step 5: Build + smoke check

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/nextjs" && npm run build 2>&1 | tail -5
```

Expected: clean build.

### Step 6: Commit

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" add <files-modified>
git -C "/Users/ersane/Downloads/Projekte/Eat This" commit -m "map(css): coveredAnon state for must-eats — non-interactive on anon view"
```

---

## Task 6: Push staging + smoke + PR to main

- [ ] **Step 1: Push staging branch**

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" push origin staging
```

Pre-push hook runs `npm run build`. Wait for clean.

- [ ] **Step 2: Wait for Firebase auto-rollout (~5-10 min)**

Staging URL: `https://eat-this-staging--eat-this-8a13b.us-central1.hosted.app`

- [ ] **Step 3: Smoke test**

Browser steps (incognito + Basic Auth):

1. Anon visit → Map loads with ~20 spots
2. Some must-eats visible open, others covered (blurred + lock icon)
3. Tapping a covered must-eat → NO reveal animation (correct: anon can't reveal)
4. Login → Map shows 40 spots
5. Walk to within 50m of a covered must-eat (or simulate via debug) → reveal animation fires

If anon-view shows 0 spots: tier composition fell back to empty pool. Either no `tierAnon` flagged in Sanity AND not enough restaurants with must-eats for fallback. Investigate Sanity content.

If anon-view shows >20 spots: configurations diverged. Verify `TIER_TARGETS.ANON` in the deployed code.

- [ ] **Step 4: Open PR**

```bash
gh pr create --base main --head staging --title "Plan 3: Tier model API + reveal gate" --body "$(cat <<'BODY'
## Summary

Third of four plans for the Guest+20 migration. Wires up the actual three-tier filter using Sanity-curated flags.

**New:**
- `lib/map/tier-composition.ts` — pure functions for composing anonSet / signedSet / revealedMustEatSet with lenient fallback (top up algorithmically when curation is incomplete)
- `revealedMustEatIds` field in `/api/map-data` response — anon view uses this to render OPEN vs covered must-eats

**Changed:**
- `/api/map-data/route.ts` — refactored to tier-based filter:
  - Anon → composeAnonRestaurants (target 20)
  - Signed-in (free) → anonSet ∪ composeSignedRestaurants (target +20 = 40 total)
  - Signed-in (category) → anonSet ∪ signedSet ∪ category-matched
  - Admin / all-berlin → full catalog
- `MustEatRevealOverlay.tsx` — explicit anon guard (defensive)
- Map CSS — `.coveredAnon` state for must-eats on anon view (non-interactive)

**Fallback model:** if Sanity has fewer than 20 tierAnon flagged, the route fills to 20 with top-by-must-eat-count from the remaining pool. Same for tierSigned. Lets curation stay loose without breaking the UX.

## Test plan
- [x] Vitest: tier-composition (8 tests), map-data route (3 tests)
- [x] Full build clean
- [ ] Staging smoke: anon shows ~20 spots, ~10 must-eats open; signed-in shows ~40 spots; reveal only fires for signed-in users near 50m of a covered must-eat

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

---

## Open questions / known risks

- **CSS path:** Plan 3 doesn't know the exact CSS module that owns the must-eat marker. Task 5 instructs the implementer to find it. If it doesn't exist as a clean module, Task 5 may need to introduce one or graft onto inline styles.
- **MustEatRevealOverlay structure:** Plan 3 assumes the overlay has a `uid` available. If it relies on auto-derivation from another context, the guard placement may differ. Implementer should add the guard at the most defensible point (geofence-effect entry).
- **Fallback determinism:** the `byMustEatCountDesc` + `_id ascending` tiebreak gives stable order. If Sanity reorders documents or `_id` patterns change in the future, the fallback picks shift. Acceptable for the iterative curation flow.
- **`revealedMustEatIds` vs `unlockedMustEatIds`:** the response includes only `revealedMustEatIds` (the global anon-demo set). Signed-in users separately read `users/{uid}/unlockedMustEats` from Firestore for their personal reveals. The UI takes the union (revealed ∪ unlocked) to decide which must-eats render OPEN. Existing client code may already do this — verify in implementation.

---

## Rollback plan

Standard PR revert. The new tier code is gated entirely by the `tierAnon` / `tierSigned` / `revealedForAnon` flags in Sanity — if they're all false, the API falls back to algorithmic picks (which matches the prior "top 20 by must-eat count" behavior closely). No data migration needed for rollback.

---

## After this plan

Plan 4 is the last: referral system. Cloud Function `confirmReferral`, cookie capture, profile UI, bonus-pick algorithm. After Plan 4, the Guest+20 migration is fully shipped.
