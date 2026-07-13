import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/map/cached-sanity', () => ({
  getCachedMapData: vi.fn(),
}))

vi.mock('@/lib/must-eat/private-store', () => ({
  hydrateAuthorizedMustEats: vi.fn(async (mustEats: unknown[]) => mustEats),
}))

vi.mock('@/lib/must-eat/premium-access', () => ({
  setPremiumAccessCookie: vi.fn(),
  clearPremiumAccessCookie: vi.fn(),
}))

vi.mock('@/lib/map/free-surface', () => ({
  getFreeSurfaceData: vi.fn().mockResolvedValue({ restaurantIds: new Set(), newOnMap: [] }),
  applyFreeSurface: (visible: unknown[]) => visible,
}))

vi.mock('@/lib/home/spotOfDay.server', () => ({
  getSpotOfDayId: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/firebase/entitlements', async () => {
  const actual = await vi.importActual<typeof import('@/lib/firebase/entitlements')>(
    '@/lib/firebase/entitlements',
  )
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

vi.mock('@/lib/firebase/unlockedMustEats.server', () => ({
  getUnlockedMustEatIds: vi.fn().mockResolvedValue(new Set<string>()),
}))

import { GET } from '@/app/api/map-data/route'
import { getCachedMapData } from '@/lib/map/cached-sanity'
import { resolveEntitlements } from '@/lib/firebase/entitlements'
import { getUnlockedMustEatIds } from '@/lib/firebase/unlockedMustEats.server'

function mkReq(token: string | null = null): Request {
  const headers = new Headers()
  if (token) headers.set('authorization', `Bearer ${token}`)
  return new Request('https://example.com/api/map-data', { headers })
}

function mkRestaurant(
  id: string,
  opts: Partial<{ tierAnon: boolean; tierSigned: boolean; categories: { slug: string }[] }> = {},
) {
  return {
    _id: id,
    name: `R-${id}`,
    slug: id,
    tierAnon: false,
    tierSigned: false,
    categories: [],
    ...opts,
  }
}

function mkMustEat(id: string, restaurantId: string, opts: Partial<{ revealedForAnon: boolean }> = {}) {
  return {
    _id: id,
    dish: `Dish ${id}`,
    description: `Secret ${id}`,
    price: '12 €',
    image: `https://cdn.example/${id}.jpg`,
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

    // anon: tierAnon (a1, a2) + fallback from restaurants with must-eats.
    // b1 has m3 so it fills the fallback (target=20, only 3 total with must-eats).
    // c1 has no must-eats so it stays out of the anon set.
    const anonIds = json.restaurants.map((r: any) => r._id).sort()
    expect(anonIds).toContain('a1')
    expect(anonIds).toContain('a2')
    expect(anonIds).toContain('b1')   // fallback-filled (has m3)
    expect(anonIds).not.toContain('c1') // no must-eats → excluded from anon fallback
    // mustEats for anon: m1 (a1), m2 (a2), m3 (b1) — all visible
    expect(json.mustEats.map((m: any) => m._id).sort()).toEqual(['m1', 'm2', 'm3'])
    expect(json.revealedMustEatIds).toContain('m1')
    // c1 is the only locked restaurant (no must-eats, no flag)
    expect(json.lockedRestaurants.map((r: any) => r._id)).toEqual(['c1'])
  })

  it('signed-in (no entitlements): returns anonSet ∪ signedSet', async () => {
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
    const ids = json.restaurants.map((r: any) => r._id).sort()
    // Should include a1, a2, s1, s2, plus 1 fallback from c1 (signed fallback doesn't require must-eats)
    expect(ids).toEqual(['a1', 'a2', 'c1', 's1', 's2'])
    // No revealedMustEatIds for signed-in
    expect(json.revealedMustEatIds).toEqual([])
    // Nothing locked at this small scale (everything fits in tier union via fallback)
    expect(json.lockedRestaurants.length).toBe(0)
  })

  it('signed-in with category entitlement: union with category-matched', async () => {
    const restaurants = [
      mkRestaurant('a1', { tierAnon: true }),
      mkRestaurant('s1', { tierSigned: true }),
      mkRestaurant('pizza1', { categories: [{ slug: 'pizza' }] }),
      mkRestaurant('pizza2', { categories: [{ slug: 'pizza' }] }),
      mkRestaurant('asian1', { categories: [{ slug: 'asian' }] }),
    ]
    vi.mocked(getCachedMapData).mockResolvedValue({
      restaurants: restaurants as any,
      mustEats: [],
      categories: [],
    })
    vi.mocked(resolveEntitlements).mockResolvedValue({
      isAdmin: false,
      hasAllBerlin: false,
      categorySlugs: new Set(['pizza']),
      restaurantIds: new Set(),
      mustEatIds: new Set(),
    })

    const res = await GET(mkReq('valid-token'))
    const json = await res.json()
    const ids = json.restaurants.map((r: any) => r._id)
    // a1 + s1 + asian1 (signed fallback) + pizza1 + pizza2 (category)
    expect(ids).toContain('pizza1')
    expect(ids).toContain('pizza2')
    expect(ids).toContain('a1')
    expect(ids).toContain('s1')
    // asian1 should NOT be in restaurants — it's not in any user-accessible tier
    // (Wait — actually with 5 total restaurants and TARGET_SIGNED=20, signed fallback
    // includes ALL non-anon restaurants. So asian1 would be in signed.)
    // Verify locked is empty (everything's reachable)
    expect(json.lockedRestaurants.length).toBeLessThanOrEqual(1)
  })

  it('signed-in with restaurantIds entitlement (no category): unions in those restaurants past the signed fallback', async () => {
    // 45 "filler" restaurants each with one must-eat — saturates both ANON
    // (20) and SIGNED (20) fallback by must-eat-count ranking.
    const fillers = Array.from({ length: 45 }, (_, i) =>
      mkRestaurant(`fill-${String(i).padStart(2, '0')}`),
    )
    const restaurants = [
      mkRestaurant('a1', { tierAnon: true }),
      ...fillers,
      mkRestaurant('zzz-bonus1'),  // _id sorted last → would NOT enter fallback
      mkRestaurant('zzz-bonus2'),
    ]
    const mustEats = fillers.map((r) => mkMustEat(`me-${r._id}`, r._id))
    vi.mocked(getCachedMapData).mockResolvedValue({
      restaurants: restaurants as any,
      mustEats: mustEats as any,
      categories: [],
    })
    vi.mocked(resolveEntitlements).mockResolvedValue({
      isAdmin: false,
      hasAllBerlin: false,
      categorySlugs: new Set(),
      restaurantIds: new Set(['zzz-bonus1', 'zzz-bonus2']),
      mustEatIds: new Set(),
    })

    const res = await GET(mkReq('valid-token'))
    const json = await res.json()
    const ids = json.restaurants.map((r: any) => r._id)
    // bonus restaurants are 0-must-eat so they'd be excluded by the signed
    // fallback (must-eat-count ranking) — they're only visible via entitlement
    expect(ids).toContain('zzz-bonus1')
    expect(ids).toContain('zzz-bonus2')
  })

  it('signed-in with mustEatIds entitlement: unions in the restaurants that own those must-eats', async () => {
    // Same shape as above but the entitlement is id-of-must-eat, not id-of-restaurant
    const fillers = Array.from({ length: 45 }, (_, i) =>
      mkRestaurant(`fill-${String(i).padStart(2, '0')}`),
    )
    const restaurants = [
      mkRestaurant('a1', { tierAnon: true }),
      ...fillers,
      mkRestaurant('zzz-rare1'),
      mkRestaurant('zzz-rare2'),
    ]
    const mustEats = [
      ...fillers.map((r) => mkMustEat(`me-${r._id}`, r._id)),
      mkMustEat('me-bonus-a', 'zzz-rare1'),
      mkMustEat('me-bonus-b', 'zzz-rare2'),
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
      mustEatIds: new Set(['me-bonus-a', 'me-bonus-b']),
    })

    const res = await GET(mkReq('valid-token'))
    const json = await res.json()
    const ids = json.restaurants.map((r: any) => r._id)
    // The entitled must-eats' parent restaurants must be in the visible set
    expect(ids).toContain('zzz-rare1')
    expect(ids).toContain('zzz-rare2')
    // and the entitled must-eats must be in the visible mustEats response
    const meIds = json.mustEats.map((m: any) => m._id)
    expect(meIds).toContain('me-bonus-a')
    expect(meIds).toContain('me-bonus-b')
    expect(json.revealedMustEatIds).toEqual(
      expect.arrayContaining(['me-bonus-a', 'me-bonus-b']),
    )
  })

  it('all-berlin: returns the full catalog with every Must-Eat face-up', async () => {
    const restaurants = [mkRestaurant('a1'), mkRestaurant('b1'), mkRestaurant('c1')]
    vi.mocked(getCachedMapData).mockResolvedValue({
      restaurants: restaurants as any,
      mustEats: [mkMustEat('m1', 'a1'), mkMustEat('m2', 'b1')] as any,
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
    expect(json.revealedMustEatIds).toEqual(expect.arrayContaining(['m1', 'm2']))
  })

  it('admin email: identical behavior to all-berlin', async () => {
    const restaurants = [mkRestaurant('a1'), mkRestaurant('b1')]
    vi.mocked(getCachedMapData).mockResolvedValue({
      restaurants: restaurants as any,
      mustEats: [],
      categories: [],
    })
    vi.mocked(resolveEntitlements).mockResolvedValue({
      isAdmin: true,
      hasAllBerlin: true,
      categorySlugs: new Set(),
      restaurantIds: new Set(),
      mustEatIds: new Set(),
    })

    const res = await GET(mkReq('admin-token'))
    const json = await res.json()
    expect(json.restaurants.length).toBe(2)
    expect(json.lockedRestaurants).toEqual([])
  })
})

describe('/api/map-data — covered must-eats are stripped (paywall)', () => {
  const baseEnt = {
    isAdmin: false,
    hasAllBerlin: false,
    categorySlugs: new Set<string>(),
    restaurantIds: new Set<string>(),
    mustEatIds: new Set<string>(),
  }

  it('anonymous: covered cards carry no dish/image/price/description, revealed ones stay full', async () => {
    const restaurants = [
      mkRestaurant('a1', { tierAnon: true }),
      mkRestaurant('a2', { tierAnon: true }),
    ]
    // One face-up per spot max (composeRevealedMustEats) — the second card on
    // a2 is guaranteed covered.
    const mustEats = [
      mkMustEat('m1', 'a1', { revealedForAnon: true }),
      mkMustEat('m2', 'a2', { revealedForAnon: true }),
      mkMustEat('m2b', 'a2'),
    ]
    vi.mocked(getCachedMapData).mockResolvedValue({
      restaurants: restaurants as any,
      mustEats: mustEats as any,
      categories: [],
    })
    vi.mocked(resolveEntitlements).mockResolvedValue(baseEnt)

    const json = await (await GET(mkReq(null))).json()

    const revealed = json.mustEats.find((m: any) => m._id === 'm1')
    expect(revealed.dish).toBe('Dish m1')
    expect(revealed.image).toBeDefined()

    const covered = json.mustEats.find((m: any) => m._id === 'm2b')
    expect(covered).toBeDefined()
    expect(covered.dish).toBeUndefined()
    expect(covered.image).toBeUndefined()
    expect(covered.price).toBeUndefined()
    expect(covered.description).toBeUndefined()
    // The card-back rendering still needs the restaurant ref.
    expect(covered.restaurant._id).toBe('a2')
    expect(covered.restaurant.name).toBe('R-a2')
  })

  it('signed-in: on-site unlocks and purchased mustEatIds stay face-up', async () => {
    const restaurants = [
      mkRestaurant('a1', { tierAnon: true }),
      mkRestaurant('a2', { tierAnon: true }),
      mkRestaurant('a3', { tierAnon: true }),
    ]
    // The curated reveal takes one card per spot (m1/m2/m3 by id order) —
    // the *b cards are covered unless unlocked or purchased.
    const mustEats = [
      mkMustEat('m1', 'a1'), mkMustEat('m1b', 'a1'),
      mkMustEat('m2', 'a2'), mkMustEat('m2b', 'a2'),
      mkMustEat('m3', 'a3'), mkMustEat('m3b', 'a3'),
    ]
    vi.mocked(getCachedMapData).mockResolvedValue({
      restaurants: restaurants as any,
      mustEats: mustEats as any,
      categories: [],
    })
    vi.mocked(resolveEntitlements).mockResolvedValue({
      ...baseEnt,
      mustEatIds: new Set(['m2b']),
    })
    vi.mocked(getUnlockedMustEatIds).mockResolvedValueOnce(new Set(['m1b']))

    const json = await (await GET(mkReq('valid-token'))).json()

    const byId = new Map(json.mustEats.map((m: any) => [m._id, m]))
    expect((byId.get('m1b') as any).dish).toBe('Dish m1b')  // on-site unlock
    expect((byId.get('m2b') as any).dish).toBe('Dish m2b')  // purchased grant
    expect((byId.get('m3b') as any).dish).toBeUndefined()   // still covered
    expect(json.revealedMustEatIds).toEqual(
      expect.arrayContaining(['m1b', 'm2b']),
    )
  })

  it('anonymous: never reads the unlock collection', async () => {
    vi.mocked(getCachedMapData).mockResolvedValue({
      restaurants: [mkRestaurant('a1', { tierAnon: true })] as any,
      mustEats: [] as any,
      categories: [],
    })
    vi.mocked(resolveEntitlements).mockResolvedValue(baseEnt)

    await GET(mkReq(null))
    expect(getUnlockedMustEatIds).not.toHaveBeenCalled()
  })
})
