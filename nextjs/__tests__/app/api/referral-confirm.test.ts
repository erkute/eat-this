import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- mocks (vars must be `mock`-prefixed to satisfy vi.mock hoisting) ---
const mockVerifyIdToken     = vi.fn()
const mockGetUser           = vi.fn()
const mockTransactionGet    = vi.fn()
const mockTransactionSet    = vi.fn()
const mockRunTransaction    = vi.fn()

vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken: mockVerifyIdToken, getUser: mockGetUser }),
  getAdminFirestore: () => ({
    collection: () => ({
      doc: () => ({
        collection: () => ({
          doc: (id: string) => ({ id }),
        }),
      }),
    }),
    runTransaction: mockRunTransaction,
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

// Catalog for happy-path tests: 1 anon-tier restaurant ('a-anon', tierAnon +
// must-eat), 20 plain restaurants ('b01'–'b20') that fill the signed-tier
// fallback, plus 1 remainder restaurant ('z-plain') that escapes both tiers.
// friendPool = inviterPool = ['z-plain'] — both non-empty → batch.set called
// twice (friend doc + inviter doc).
const SIGNED_FILL_RESTAURANTS = Array.from({ length: 20 }, (_, i) => ({
  _id: `b${String(i + 1).padStart(2, '0')}`,
  categories: [],
}))

const HAPPY_PATH_RESTAURANTS = [
  { _id: 'a-anon', tierAnon: true, categories: [] },
  ...SIGNED_FILL_RESTAURANTS,
  { _id: 'z-plain', categories: [] },
]

const HAPPY_PATH_MUST_EATS = [
  { _id: 'me-a', dish: 'Test dish', restaurant: { _id: 'a-anon' } },
]

function primeHappyPath() {
  vi.mocked(getCachedMapData).mockResolvedValue({
    restaurants: HAPPY_PATH_RESTAURANTS as any,
    mustEats: HAPPY_PATH_MUST_EATS as any,
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
  mockTransactionGet.mockResolvedValue({ exists: false })
  mockRunTransaction.mockImplementation(async (fn) =>
    fn({ get: mockTransactionGet, set: mockTransactionSet }),
  )
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
    expect(mockTransactionSet).toHaveBeenCalledTimes(2)
    expect(mockRunTransaction).toHaveBeenCalledTimes(1)
    expect(res.cookies.get('pending_referrer')?.value).toBe('')
  })

  it('self-referral (same uid) → no write, clears cookie', async () => {
    primeHappyPath()
    mockVerifyIdToken.mockResolvedValue({ uid: INVITER })
    const res = await POST(mkReq(INVITER))
    expect(res.status).toBe(200)
    expect(mockTransactionSet).not.toHaveBeenCalled()
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
    expect(mockTransactionSet).not.toHaveBeenCalled()
    expect(res.cookies.get('pending_referrer')?.value).toBe('')
  })

  it('idempotent repeat (friend already invited-by) → no write, clears cookie', async () => {
    primeHappyPath()
    mockTransactionGet.mockResolvedValue({ exists: true })
    const res = await POST(mkReq(INVITER))
    expect(mockTransactionSet).not.toHaveBeenCalled()
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
    expect(mockTransactionSet).toHaveBeenCalledTimes(1)
  })

  it('sanity outage → 200, no write, KEEPS cookie for retry', async () => {
    primeHappyPath()
    vi.mocked(getCachedMapData).mockRejectedValue(new Error('sanity down'))
    const res = await POST(mkReq(INVITER))
    expect(res.status).toBe(200)
    expect(mockRunTransaction).not.toHaveBeenCalled()
    expect(res.cookies.get('pending_referrer')).toBeUndefined()
  })

  it('friend bonus excludes anon-tier spots (pool is net-new only)', async () => {
    // Catalog: 'a-anon' has tierAnon=true + 1 must-eat → lands in anonSet.
    // 'b01'–'b20' are plain with no flags/must-eats → fill signedSet fallback
    // (sorted by _id ASC, all have 0 must-eats, 20 fill the SIGNED target).
    // 'z-plain' has no flags/must-eats and _id sorts after all b-prefixed ids →
    // escapes both tiers → friendPool = ['z-plain'].
    vi.mocked(getCachedMapData).mockResolvedValue({
      restaurants: HAPPY_PATH_RESTAURANTS as any,
      mustEats: HAPPY_PATH_MUST_EATS as any,
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
    mockTransactionGet.mockResolvedValue({ exists: false })
    mockRunTransaction.mockImplementation(async (fn) =>
      fn({ get: mockTransactionGet, set: mockTransactionSet }),
    )

    const res = await POST(mkReq(INVITER))
    expect(res.status).toBe(200)
    expect(mockTransactionSet).toHaveBeenCalledTimes(2)

    // First transaction.set call is always the friend doc (source: 'invited-by')
    const friendDoc = mockTransactionSet.mock.calls[0][1] as { restaurantIds: string[]; source: string }
    expect(friendDoc.source).toBe('invited-by')
    // friendPool must NOT contain the anon-tier restaurant
    expect(friendDoc.restaurantIds).not.toContain('a-anon')
    // friendPool must contain only the one remainder spot
    expect(friendDoc.restaurantIds).toEqual(['z-plain'])
  })

  it('self-referral by email (different uid, same email) → no write, clears cookie', async () => {
    primeHappyPath()
    mockGetUser.mockImplementation(async () => ({
      email: 'same@x.com',
      metadata: { creationTime: new Date().toISOString() },
    }))
    const res = await POST(mkReq(INVITER))
    expect(mockTransactionSet).not.toHaveBeenCalled()
    expect(res.cookies.get('pending_referrer')?.value).toBe('')
  })

  it('inviter deleted (getUser throws for inviter) → no write, clears cookie', async () => {
    primeHappyPath()
    mockGetUser.mockImplementation(async (uid: string) => {
      if (uid === INVITER) throw new Error('user not found')
      return { email: 'friend@x.com', metadata: { creationTime: new Date().toISOString() } }
    })
    const res = await POST(mkReq(INVITER))
    expect(mockTransactionSet).not.toHaveBeenCalled()
    expect(res.cookies.get('pending_referrer')?.value).toBe('')
  })
})
