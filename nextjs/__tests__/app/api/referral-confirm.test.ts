import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- mocks (vars must be `mock`-prefixed to satisfy vi.mock hoisting) ---
const mockVerifyIdToken     = vi.fn()
const mockGetUser           = vi.fn()
const mockIdempotencyGet    = vi.fn()
const mockBatchSet          = vi.fn()
const mockBatchCommit       = vi.fn()

vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken: mockVerifyIdToken, getUser: mockGetUser }),
  getAdminFirestore: () => ({
    collection: () => ({
      doc: () => ({
        collection: () => ({
          where: () => ({ limit: () => ({ get: mockIdempotencyGet }) }),
          doc: () => ({ id: 'auto-id' }),
        }),
      }),
    }),
    batch: () => ({ set: mockBatchSet, commit: mockBatchCommit }),
  }),
}))

vi.mock('@/lib/map/cached-sanity', () => ({ getCachedMapData: vi.fn() }))
vi.mock('@/lib/firebase/entitlements', () => ({ resolveEntitlements: vi.fn() }))

import { POST } from '@/app/api/referral/confirm/route'
import { getCachedMapData } from '@/lib/map/cached-sanity'
import { resolveEntitlements } from '@/lib/firebase/entitlements'

const INVITER = 'i'.repeat(28)
const FRIEND  = 'f'.repeat(28)

function mkReq(cookieUid: string | null, idToken: string | null = 'tok'): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (cookieUid) headers.cookie = `${'pending_referrer'}=${cookieUid}`
  return new NextRequest('https://www.eatthisdot.com/api/referral/confirm', {
    method: 'POST',
    headers,
    body: JSON.stringify(idToken ? { idToken } : {}),
  })
}

function primeHappyPath() {
  vi.mocked(getCachedMapData).mockResolvedValue({
    restaurants: [
      { _id: 'r1', categories: [] }, { _id: 'r2', categories: [] },
      { _id: 'r3', categories: [] }, { _id: 'r4', categories: [] },
    ] as any,
    mustEats: [] as any,
    categories: [] as any,
  })
  vi.mocked(resolveEntitlements).mockResolvedValue({
    isAdmin: false, hasAllBerlin: false,
    categorySlugs: new Set(), restaurantIds: new Set(), mustEatIds: new Set(),
  })
  mockVerifyIdToken.mockResolvedValue({ uid: FRIEND })
  mockGetUser.mockImplementation(async (uid: string) =>
    uid === FRIEND
      ? { email: 'friend@x.com', metadata: { creationTime: new Date().toISOString() } }
      : { email: 'inviter@x.com', metadata: { creationTime: new Date().toISOString() } },
  )
  mockIdempotencyGet.mockResolvedValue({ empty: true })
  mockBatchCommit.mockResolvedValue(undefined)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('/api/referral/confirm', () => {
  it('no cookie → 200, no backend calls', async () => {
    const res = await POST(mkReq(null))
    expect(res.status).toBe(200)
    expect(getCachedMapData).not.toHaveBeenCalled()
    expect(mockVerifyIdToken).not.toHaveBeenCalled()
  })

  it('happy path → writes friend + inviter docs, clears cookie', async () => {
    primeHappyPath()
    const res = await POST(mkReq(INVITER))
    expect(res.status).toBe(200)
    expect(mockBatchSet).toHaveBeenCalledTimes(2)
    expect(mockBatchCommit).toHaveBeenCalledTimes(1)
    expect(res.cookies.get('pending_referrer')?.value).toBe('')
  })

  it('self-referral (same uid) → no write, clears cookie', async () => {
    primeHappyPath()
    mockVerifyIdToken.mockResolvedValue({ uid: INVITER })
    const res = await POST(mkReq(INVITER))
    expect(res.status).toBe(200)
    expect(mockBatchSet).not.toHaveBeenCalled()
    expect(res.cookies.get('pending_referrer')?.value).toBe('')
  })

  it('not a new account → no write, clears cookie', async () => {
    primeHappyPath()
    mockGetUser.mockImplementation(async (uid: string) =>
      uid === FRIEND
        ? { email: 'friend@x.com', metadata: { creationTime: new Date(Date.now() - 60 * 60 * 1000).toISOString() } }
        : { email: 'inviter@x.com', metadata: { creationTime: new Date().toISOString() } },
    )
    const res = await POST(mkReq(INVITER))
    expect(mockBatchSet).not.toHaveBeenCalled()
    expect(res.cookies.get('pending_referrer')?.value).toBe('')
  })

  it('idempotent repeat (friend already invited-by) → no write, clears cookie', async () => {
    primeHappyPath()
    mockIdempotencyGet.mockResolvedValue({ empty: false })
    const res = await POST(mkReq(INVITER))
    expect(mockBatchSet).not.toHaveBeenCalled()
    expect(res.cookies.get('pending_referrer')?.value).toBe('')
  })

  it('all-berlin inviter (empty inviterPool) → only friend doc written', async () => {
    primeHappyPath()
    vi.mocked(resolveEntitlements).mockResolvedValue({
      isAdmin: false, hasAllBerlin: true,
      categorySlugs: new Set(), restaurantIds: new Set(), mustEatIds: new Set(),
    })
    const res = await POST(mkReq(INVITER))
    expect(res.status).toBe(200)
    expect(mockBatchSet).toHaveBeenCalledTimes(1)
  })

  it('sanity outage → 200, no write, KEEPS cookie for retry', async () => {
    primeHappyPath()
    vi.mocked(getCachedMapData).mockRejectedValue(new Error('sanity down'))
    const res = await POST(mkReq(INVITER))
    expect(res.status).toBe(200)
    expect(mockBatchCommit).not.toHaveBeenCalled()
    expect(res.cookies.get('pending_referrer')).toBeUndefined()
  })
})
