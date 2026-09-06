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
import { REVEALED_TARGET } from '@/lib/map/revealed-must-eats'

function mkReq(token: string | null = null): Request {
  const headers = new Headers()
  if (token) headers.set('authorization', `Bearer ${token}`)
  return new Request('https://example.com/api/map-data', { headers })
}

function mkRestaurant(id: string, opts: Partial<{ categories: { slug: string }[] }> = {}) {
  return { _id: id, name: `R-${id}`, slug: id, categories: [], ...opts }
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

const baseEnt = {
  isAdmin: false,
  hasAllBerlin: false,
  categorySlugs: new Set<string>(),
  mustEatIds: new Set<string>(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

/* Bis zum 06.09.2026 staffelte diese Route die SPOTS: 100 ohne Konto, 150 mit,
   der Rest gegen Geld. Das ist weg — sie liefert jedem den ganzen Katalog und
   entscheidet nur noch, welche KARTEN offen liegen. */
describe('/api/map-data — die Karte ist frei', () => {
  it('gibt einem anonymen Besucher jeden Spot', async () => {
    const restaurants = Array.from({ length: 200 }, (_, i) =>
      mkRestaurant(`r${String(i).padStart(3, '0')}`),
    )
    vi.mocked(getCachedMapData).mockResolvedValue({
      restaurants: restaurants as any,
      mustEats: [],
      categories: [],
    })
    vi.mocked(resolveEntitlements).mockResolvedValue(baseEnt)

    const json = await (await GET(mkReq(null))).json()

    expect(json.restaurants).toHaveLength(200)
    expect(json.totalCount).toBe(200)
    // Der Begriff selbst ist aus der Nutzlast verschwunden, nicht nur leer.
    expect('lockedRestaurants' in json).toBe(false)
  })

  it('gibt einem angemeldeten Konto denselben Katalog', async () => {
    const restaurants = Array.from({ length: 200 }, (_, i) =>
      mkRestaurant(`r${String(i).padStart(3, '0')}`),
    )
    vi.mocked(getCachedMapData).mockResolvedValue({
      restaurants: restaurants as any,
      mustEats: [],
      categories: [],
    })
    vi.mocked(resolveEntitlements).mockResolvedValue(baseEnt)

    const json = await (await GET(mkReq('valid-token'))).json()

    expect(json.restaurants).toHaveLength(200)
  })
})

describe('/api/map-data — welche Karten offen liegen', () => {
  it('deckt ohne Konto nur das Schaufenster auf', async () => {
    // Mehr Karten als das Schaufenster fasst, jede auf ihrem eigenen Spot.
    const ids = Array.from({ length: REVEALED_TARGET + 3 }, (_, i) => String(i + 1).padStart(2, '0'))
    vi.mocked(getCachedMapData).mockResolvedValue({
      restaurants: ids.map((n) => mkRestaurant(`r${n}`)) as any,
      mustEats: ids.map((n) => mkMustEat(`m${n}`, `r${n}`)) as any,
      categories: [],
    })
    vi.mocked(resolveEntitlements).mockResolvedValue(baseEnt)

    const json = await (await GET(mkReq(null))).json()

    expect(json.mustEats).toHaveLength(ids.length)
    expect(json.revealedMustEatIds).toHaveLength(REVEALED_TARGET)
  })

  it('anonymous: covered cards carry no dish/image/price/description, revealed ones stay full', async () => {
    const restaurants = [mkRestaurant('a1'), mkRestaurant('a2')]
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
    const restaurants = [mkRestaurant('a1'), mkRestaurant('a2'), mkRestaurant('a3')]
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

  /* Der Schnappschuss im Entitlement haelt fest, was es beim Kauf gab. Eine
     Karte, die spaeter dazukommt, steht nicht darin — und gehoert dem Kaeufer
     trotzdem, weil die Kategorie live aufgeloest wird. */
  it('gibt einem Kategorie-Pack auch die Karten, die es beim Kauf noch nicht gab', async () => {
    const restaurants = [
      mkRestaurant('pizza1', { categories: [{ slug: 'pizza' }] }),
      mkRestaurant('asian1', { categories: [{ slug: 'asian' }] }),
      // Fuellmaterial, damit das Schaufenster nicht ohnehin alles aufdeckt.
      ...Array.from({ length: REVEALED_TARGET }, (_, i) => mkRestaurant(`fill-${i}`)),
    ]
    // `zz-` sortiert hinter das Füllmaterial: beide Karten liegen damit
    // ausserhalb des Schaufensters, sonst wären sie ohnehin offen.
    const mustEats = [
      mkMustEat('zz-pizza-neu', 'pizza1'),
      mkMustEat('zz-asian', 'asian1'),
      ...Array.from({ length: REVEALED_TARGET }, (_, i) => mkMustEat(`me-fill-${i}`, `fill-${i}`)),
    ]
    vi.mocked(getCachedMapData).mockResolvedValue({
      restaurants: restaurants as any,
      mustEats: mustEats as any,
      categories: [],
    })
    vi.mocked(resolveEntitlements).mockResolvedValue({
      ...baseEnt,
      categorySlugs: new Set(['pizza']),
      // Bewusst leer: der Kauf-Schnappschuss kennt die Karte nicht.
      mustEatIds: new Set<string>(),
    })

    const json = await (await GET(mkReq('valid-token'))).json()

    expect(json.revealedMustEatIds).toContain('zz-pizza-neu')
    expect(json.revealedMustEatIds).not.toContain('zz-asian')
  })

  it('all-berlin: returns the full catalog with every Must-Eat face-up', async () => {
    const restaurants = [mkRestaurant('a1'), mkRestaurant('b1'), mkRestaurant('c1')]
    vi.mocked(getCachedMapData).mockResolvedValue({
      restaurants: restaurants as any,
      mustEats: [mkMustEat('m1', 'a1'), mkMustEat('m2', 'b1')] as any,
      categories: [],
    })
    vi.mocked(resolveEntitlements).mockResolvedValue({ ...baseEnt, hasAllBerlin: true })

    const json = await (await GET(mkReq('valid-token'))).json()
    expect(json.restaurants.length).toBe(3)
    expect(json.fullCatalog).toBe(true)
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
      ...baseEnt,
      isAdmin: true,
      hasAllBerlin: true,
    })

    const json = await (await GET(mkReq('admin-token'))).json()
    expect(json.restaurants.length).toBe(2)
    expect(json.fullCatalog).toBe(true)
  })

  it('anonymous: never reads the unlock collection', async () => {
    vi.mocked(getCachedMapData).mockResolvedValue({
      restaurants: [mkRestaurant('a1')] as any,
      mustEats: [] as any,
      categories: [],
    })
    vi.mocked(resolveEntitlements).mockResolvedValue(baseEnt)

    await GET(mkReq(null))
    expect(getUnlockedMustEatIds).not.toHaveBeenCalled()
  })
})
