import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  doc: vi.fn((path: string) => ({ path })),
  transactionGet: vi.fn(),
  transactionSet: vi.fn(),
  transactionDelete: vi.fn(),
  runTransaction: vi.fn(),
  checkRateLimit: vi.fn(),
  serverTimestamp: vi.fn(() => 'server-timestamp'),
  increment: vi.fn((value: number) => ({ increment: value })),
}))

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: mocks.serverTimestamp,
    increment: mocks.increment,
  },
}))

vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken: mocks.verifyIdToken }),
  getAdminFirestore: () => ({
    doc: mocks.doc,
    runTransaction: mocks.runTransaction,
  }),
}))

vi.mock('@/lib/buddy/rateLimit', () => ({
  checkRateLimit: (...args: unknown[]) => mocks.checkRateLimit(...args),
}))

vi.mock('@/lib/map/cached-sanity', () => ({
  getCachedMapData: vi.fn(),
}))

import { POST } from '@/app/api/heart/route'
import { getCachedMapData } from '@/lib/map/cached-sanity'

const RESTAURANT = {
  _id: 'r1',
  name: 'Sanity Spot',
  slug: 'sanity-spot',
  photo: 'https://cdn.example/sanity-spot.jpg',
  district: 'Fallback Bezirk',
  bezirk: { name: 'Kreuzberg', slug: 'kreuzberg' },
}

function mkReq(body: unknown, token: string | null = 'valid-token'): Request {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (token) headers.set('authorization', `Bearer ${token}`)
  return new Request('https://www.eatthisdot.com/api/heart', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.verifyIdToken.mockResolvedValue({ uid: 'test-uid' })
  mocks.checkRateLimit.mockResolvedValue({
    allowed: true,
    state: { minuteStart: 0, minuteCount: 1, dayStart: 0, dayCount: 1 },
  })
  vi.mocked(getCachedMapData).mockResolvedValue({
    restaurants: [RESTAURANT] as never[],
    mustEats: [] as never[],
    categories: [],
  })
  mocks.transactionGet.mockResolvedValue({ exists: false })
  mocks.runTransaction.mockImplementation(async (fn) =>
    fn({
      get: mocks.transactionGet,
      set: mocks.transactionSet,
      delete: mocks.transactionDelete,
    }),
  )
})

describe('/api/heart', () => {
  it('rejects anonymous callers', async () => {
    const res = await POST(mkReq({ restaurantId: 'r1', action: 'add' }, null))
    expect(res.status).toBe(401)
    expect(getCachedMapData).not.toHaveBeenCalled()
    expect(mocks.runTransaction).not.toHaveBeenCalled()
  })

  it('rejects invalid tokens', async () => {
    mocks.verifyIdToken.mockRejectedValue(new Error('expired'))
    const res = await POST(mkReq({ restaurantId: 'r1', action: 'add' }))
    expect(res.status).toBe(401)
    expect(getCachedMapData).not.toHaveBeenCalled()
    expect(mocks.runTransaction).not.toHaveBeenCalled()
  })

  it('rejects invalid input', async () => {
    const res = await POST(mkReq({ restaurantId: 'r1', action: 'toggle' }))
    expect(res.status).toBe(400)
    expect(getCachedMapData).not.toHaveBeenCalled()
    expect(mocks.runTransaction).not.toHaveBeenCalled()
  })

  it('404s unknown restaurant IDs before any write', async () => {
    vi.mocked(getCachedMapData).mockResolvedValueOnce({
      restaurants: [] as never[],
      mustEats: [] as never[],
      categories: [],
    })
    const res = await POST(mkReq({ restaurantId: 'unknown', action: 'add' }))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'unknown_restaurant' })
    expect(mocks.runTransaction).not.toHaveBeenCalled()
  })

  it('adds a favorite with canonical Sanity metadata', async () => {
    const res = await POST(mkReq({
      restaurantId: 'r1',
      action: 'add',
      name: 'Client Spoof',
      slug: 'client-spoof',
      photo: 'https://evil.example/spoof.jpg',
      district: 'Wrong District',
    }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ hearted: true })
    expect(mocks.doc).toHaveBeenCalledWith('users/test-uid/favorites/r1')
    expect(mocks.doc).toHaveBeenCalledWith('restaurants/r1')
    expect(mocks.transactionSet).toHaveBeenCalledWith(
      { path: 'users/test-uid/favorites/r1' },
      {
        name: 'Sanity Spot',
        slug: 'sanity-spot',
        photo: 'https://cdn.example/sanity-spot.jpg',
        district: 'Kreuzberg',
        savedAt: 'server-timestamp',
      },
    )
    expect(mocks.transactionSet).toHaveBeenCalledWith(
      { path: 'restaurants/r1' },
      {
        heartCount: { increment: 1 },
        heartCountUpdatedAt: 'server-timestamp',
      },
      { merge: true },
    )
  })

  it('does not double-count an already hearted restaurant', async () => {
    mocks.transactionGet.mockResolvedValueOnce({ exists: true })
    const res = await POST(mkReq({ restaurantId: 'r1', action: 'add' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ hearted: true })
    expect(mocks.transactionSet).not.toHaveBeenCalled()
  })

  it('removes an existing favorite and decrements the count', async () => {
    mocks.transactionGet.mockResolvedValueOnce({ exists: true })
    const res = await POST(mkReq({ restaurantId: 'r1', action: 'remove' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ hearted: false })
    expect(mocks.transactionDelete).toHaveBeenCalledWith({ path: 'users/test-uid/favorites/r1' })
    expect(mocks.transactionSet).toHaveBeenCalledWith(
      { path: 'restaurants/r1' },
      {
        heartCount: { increment: -1 },
        heartCountUpdatedAt: 'server-timestamp',
      },
      { merge: true },
    )
  })

  it('rate-limits before loading map data or writing', async () => {
    mocks.checkRateLimit.mockResolvedValueOnce({
      allowed: false,
      reason: 'per_day',
      state: { minuteStart: 0, minuteCount: 1, dayStart: 0, dayCount: 301 },
    })
    const res = await POST(mkReq({ restaurantId: 'r1', action: 'add' }))
    expect(res.status).toBe(429)
    expect(getCachedMapData).not.toHaveBeenCalled()
    expect(mocks.runTransaction).not.toHaveBeenCalled()
  })
})
