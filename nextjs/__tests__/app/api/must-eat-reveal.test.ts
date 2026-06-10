import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/map/cached-sanity', () => ({
  getCachedMapData: vi.fn(),
}))

const verifyIdToken = vi.fn()
vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken }),
}))

vi.mock('@/lib/firebase/unlockedMustEats.server', () => ({
  unlockMustEat: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/must-eat-reveal/route'
import { getCachedMapData } from '@/lib/map/cached-sanity'
import { unlockMustEat } from '@/lib/firebase/unlockedMustEats.server'

const MUST_EAT = {
  _id: 'm1',
  dish: 'Dish m1',
  image: 'https://cdn.example/m1.jpg',
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
  verifyIdToken.mockResolvedValue({ uid: 'test-uid' })
  vi.mocked(getCachedMapData).mockResolvedValue({
    restaurants: [] as never[],
    mustEats: [MUST_EAT] as never[],
    categories: [],
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

  it('persists the unlock and returns the full must-eat', async () => {
    const res = await POST(mkReq({ mustEatId: 'm1' }))
    expect(res.status).toBe(200)
    expect(unlockMustEat).toHaveBeenCalledWith('test-uid', MUST_EAT)
    const json = await res.json()
    expect(json.mustEat.dish).toBe('Dish m1')
    expect(json.mustEat.image).toBe('https://cdn.example/m1.jpg')
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
  })
})
