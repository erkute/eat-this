import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getPublicMustEatIds = vi.fn()
vi.mock('@/lib/map/server-initial-map-data', () => ({
  getPublicMustEatIds: () => getPublicMustEatIds(),
}))

const getPrivateMustEatContent = vi.fn()
vi.mock('@/lib/must-eat/private-store', () => ({
  getPrivateMustEatContent: (id: string) => getPrivateMustEatContent(id),
}))

const download = vi.fn()
const getMetadata = vi.fn()
const file = vi.fn(() => ({ download, getMetadata }))
vi.mock('@/lib/firebase/admin', () => ({
  getAdminStorage: () => ({ bucket: () => ({ file }) }),
}))

const { readPremiumSessionUid } = vi.hoisted(() => ({
  readPremiumSessionUid: vi.fn(),
}))
vi.mock('@/lib/must-eat/premium-session', () => ({
  premiumSessionCookieName: () => 'premium_session',
  readPremiumSessionUid: () => readPremiumSessionUid(),
}))

import { GET } from '@/app/api/must-eat-image/[id]/route'
import {
  createPremiumAccessToken,
  premiumAccessCookieName,
} from '@/lib/must-eat/premium-access'

function request(cookie?: string): NextRequest {
  return new NextRequest('https://example.com/api/must-eat-image/m1', {
    headers: cookie ? { cookie } : undefined,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('PREMIUM_ACCESS_SIGNING_KEY', 'test-signing-key-with-enough-entropy')
  getPublicMustEatIds.mockResolvedValue(new Set())
  readPremiumSessionUid.mockResolvedValue(null)
  getPrivateMustEatContent.mockResolvedValue({
    imageObjectPath: 'premium/must-eats/m1/hash.webp',
    imageContentType: 'image/webp',
  })
  download.mockResolvedValue([Buffer.from('private-image')])
  getMetadata.mockResolvedValue([{ contentType: 'image/webp', etag: 'etag-1' }])
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('/api/must-eat-image/[id]', () => {
  it('denies an anonymous request for a premium image before touching Storage', async () => {
    const response = await GET(request(), { params: Promise.resolve({ id: 'm1' }) })

    expect(response.status).toBe(403)
    expect(getPrivateMustEatContent).not.toHaveBeenCalled()
    expect(file).not.toHaveBeenCalled()
  })

  it('serves an explicitly public demo image through the app proxy', async () => {
    getPublicMustEatIds.mockResolvedValueOnce(new Set(['m1']))
    const response = await GET(request(), { params: Promise.resolve({ id: 'm1' }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/webp')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(file).toHaveBeenCalledWith('premium/must-eats/m1/hash.webp')
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('private-image')
  })

  it('accepts a valid HttpOnly capability and rejects a tampered one', async () => {
    readPremiumSessionUid.mockResolvedValue('user-1')
    const token = createPremiumAccessToken(['m1'], 'user-1')
    const cookieName = premiumAccessCookieName()
    const allowed = await GET(request(`${cookieName}=${token}`), {
      params: Promise.resolve({ id: 'm1' }),
    })
    expect(allowed.status).toBe(200)

    readPremiumSessionUid.mockResolvedValueOnce('user-2')
    const wrongIdentity = await GET(request(`${cookieName}=${token}`), {
      params: Promise.resolve({ id: 'm1' }),
    })
    expect(wrongIdentity.status).toBe(403)

    const denied = await GET(request(`${cookieName}=${token}x`), {
      params: Promise.resolve({ id: 'm1' }),
    })
    expect(denied.status).toBe(403)
  })
})
