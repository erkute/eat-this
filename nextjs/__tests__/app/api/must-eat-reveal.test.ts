import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/map/cached-sanity', () => ({
  getCachedMapData: vi.fn(),
}))

const verifyIdToken = vi.fn()
vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken }),
}))

vi.mock('@/lib/firebase/unlockedMustEats.server', () => ({
  getUnlockedMustEatIds: vi.fn().mockResolvedValue(new Set<string>()),
  unlockMustEat: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/must-eat/private-store', () => ({
  hydrateAuthorizedMustEats: vi.fn(async (mustEats: Record<string, unknown>[]) =>
    mustEats.map((mustEat) => ({
      ...mustEat,
      dish: 'Dish m1',
      image: '/api/must-eat-image/m1',
    }))),
}))

vi.mock('@/lib/must-eat/premium-access', () => ({
  setPremiumAccessCookie: vi.fn(),
}))

vi.mock('@/lib/firebase/entitlements', () => ({
  resolveEntitlements: vi.fn(),
}))

vi.mock('@/lib/map/free-surface', () => ({
  getFreeSurfaceData: vi.fn(),
}))

vi.mock('@/lib/map/visible-restaurants.server', () => ({
  composeVisibleRestaurants: vi.fn(),
}))

const checkRateLimit = vi.fn()
vi.mock('@/lib/buddy/rateLimit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}))

import { POST } from '@/app/api/must-eat-reveal/route'
import { getCachedMapData } from '@/lib/map/cached-sanity'
import { unlockMustEat } from '@/lib/firebase/unlockedMustEats.server'
import { resolveEntitlements } from '@/lib/firebase/entitlements'
import { getFreeSurfaceData } from '@/lib/map/free-surface'
import { composeVisibleRestaurants } from '@/lib/map/visible-restaurants.server'

const MUST_EAT = {
  _id: 'm1',
  restaurant: { _id: 'r1', name: 'R1', slug: 'r1' },
}

function mkReq(body: unknown, token: string | null = 'valid-token'): Request {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (token) headers.set('authorization', `Bearer ${token}`)
  return new Request('https://example.com/api/must-eat-reveal', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  verifyIdToken.mockResolvedValue({ uid: 'test-uid', email: 'test@example.com', email_verified: true })
  checkRateLimit.mockResolvedValue({ allowed: true, state: { minuteStart: 0, minuteCount: 1, dayStart: 0, dayCount: 1 } })
  vi.mocked(getCachedMapData).mockResolvedValue({
    restaurants: [] as never[],
    mustEats: [MUST_EAT] as never[],
    categories: [],
  })
  vi.mocked(resolveEntitlements).mockResolvedValue({
    isAdmin: false,
    hasAllBerlin: false,
    categorySlugs: new Set(),
    restaurantIds: new Set(),
    mustEatIds: new Set(),
  })
  vi.mocked(getFreeSurfaceData).mockResolvedValue({
    restaurantIds: new Set(),
    newOnMap: [],
  })
  vi.mocked(composeVisibleRestaurants).mockResolvedValue({
    restaurants: [{ _id: 'r1' }] as never[],
    lockedRestaurants: [],
    mustEats: [MUST_EAT] as never[],
    revealedMustEatIds: new Set(),
  })
})

describe('/api/must-eat-reveal', () => {
  it('rejects anonymous callers', async () => {
    const res = await POST(mkReq({ mustEatId: 'm1' }, null))
    expect(res.status).toBe(401)
    expect(unlockMustEat).not.toHaveBeenCalled()
  })

  it('rejects invalid tokens', async () => {
    verifyIdToken.mockRejectedValue(new Error('expired'))
    const res = await POST(mkReq({ mustEatId: 'm1' }))
    expect(res.status).toBe(401)
    expect(unlockMustEat).not.toHaveBeenCalled()
  })

  it('rejects a missing mustEatId', async () => {
    const res = await POST(mkReq({}))
    expect(res.status).toBe(400)
  })

  it('404s on an unknown must-eat', async () => {
    const res = await POST(mkReq({ mustEatId: 'nope' }))
    expect(res.status).toBe(404)
    expect(unlockMustEat).not.toHaveBeenCalled()
  })

  it('403s when the must-eat belongs to a restaurant outside the user visible set', async () => {
    vi.mocked(composeVisibleRestaurants).mockResolvedValueOnce({
      restaurants: [{ _id: 'other-restaurant' }] as never[],
      lockedRestaurants: [{ _id: 'r1' }] as never[],
      mustEats: [],
      revealedMustEatIds: new Set(),
    })

    const res = await POST(mkReq({ mustEatId: 'm1' }))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'must-eat not available' })
    expect(unlockMustEat).not.toHaveBeenCalled()
  })

  it('persists the unlock and returns the full must-eat', async () => {
    const res = await POST(mkReq({ mustEatId: 'm1' }))
    expect(res.status).toBe(200)
    expect(unlockMustEat).toHaveBeenCalledWith('test-uid', MUST_EAT)
    const json = await res.json()
    expect(json.mustEat.dish).toBe('Dish m1')
    expect(json.mustEat.image).toBe('/api/must-eat-image/m1')
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('429s when the per-uid rate limit trips, before any unlock work', async () => {
    checkRateLimit.mockResolvedValueOnce({ allowed: false, reason: 'per_day', state: { minuteStart: 0, minuteCount: 1, dayStart: 0, dayCount: 81 } })
    const res = await POST(mkReq({ mustEatId: 'm1' }))
    expect(res.status).toBe(429)
    expect(resolveEntitlements).not.toHaveBeenCalled()
    expect(unlockMustEat).not.toHaveBeenCalled()
  })

  it('keys the rate limit by uid', async () => {
    await POST(mkReq({ mustEatId: 'm1' }))
    expect(checkRateLimit).toHaveBeenCalledWith('reveal:test-uid', expect.objectContaining({ perMinute: expect.any(Number), perDay: expect.any(Number) }))
  })
})
