import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- mocks (vars must be `mock`-prefixed to satisfy vi.mock hoisting) ---
const mockVerifyIdToken     = vi.fn()
const mockGetUser           = vi.fn()
const mockTransactionGet    = vi.fn()
const mockTransactionSet    = vi.fn()
const mockRunTransaction    = vi.fn()
const mockCount             = vi.fn()
const mockDoc               = vi.fn((path: string) => ({ path }))

vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken: mockVerifyIdToken, getUser: mockGetUser }),
  getAdminFirestore: () => ({
    doc: mockDoc,
    collection: () => ({
      doc: () => ({
        collection: () => ({
          doc: (id: string) => ({ id }),
          // Inviter farming-cap count: .where('source','==','invited').count().get()
          where: () => ({ count: () => ({ get: mockCount }) }),
        }),
      }),
    }),
    runTransaction: mockRunTransaction,
  }),
}))

vi.mock('@/lib/map/cached-sanity', () => ({ getCachedMapData: vi.fn() }))
vi.mock('@/lib/firebase/entitlements', () => ({ resolveEntitlements: vi.fn() }))
vi.mock('@/lib/firebase/unlockedMustEats.server', () => ({
  getUnlockedMustEatIds: vi.fn().mockResolvedValue(new Set<string>()),
}))
vi.mock('@/lib/map/visible-restaurants.server', () => ({ composeAccountSurface: vi.fn() }))

import { POST } from '@/app/api/referral/confirm/route'
import { getCachedMapData } from '@/lib/map/cached-sanity'
import { resolveEntitlements } from '@/lib/firebase/entitlements'
import { composeAccountSurface } from '@/lib/map/visible-restaurants.server'
import { ACCOUNT_FRESHNESS_MS, MAX_REFERRALS_PER_INVITER } from '@/lib/referral/constants'

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

/* Der Stapel für die Happy-Path-Tests: eine Karte liegt öffentlich offen
   ('me-public'), eine ist noch zu holen ('me-free'). Damit ist der Pool auf
   beiden Seiten genau ['me-free'] — verschenkt wird nur, was der Beschenkte
   noch nicht hat. */
const HAPPY_PATH_MUST_EATS = [
  { _id: 'me-public', dish: 'Schaufenster', restaurant: { _id: 'a1' } },
  { _id: 'me-free', dish: 'Zu holen', restaurant: { _id: 'a2' } },
]

const HAPPY_PATH_RESTAURANTS = [
  { _id: 'a1', categories: [] },
  { _id: 'a2', categories: [] },
]

const EMPTY_ENT = {
  isAdmin: false,
  hasAllBerlin: false,
  categorySlugs: new Set<string>(),
  mustEatIds: new Set<string>(),
}

/** Was für dieses Konto offen liegt — die einzige Quelle, aus der die Route
 *  den Pool ableitet. */
function surfaceWith(faceUpIds: string[]) {
  return {
    restaurants: HAPPY_PATH_RESTAURANTS as any,
    mustEats: HAPPY_PATH_MUST_EATS as any,
    faceUpIds: new Set(faceUpIds),
    fullCatalog: false,
  }
}

function primeHappyPath() {
  vi.mocked(getCachedMapData).mockResolvedValue({
    restaurants: HAPPY_PATH_RESTAURANTS as any,
    mustEats: HAPPY_PATH_MUST_EATS as any,
    categories: [] as any,
  })
  vi.mocked(resolveEntitlements).mockResolvedValue(EMPTY_ENT)
  vi.mocked(composeAccountSurface).mockResolvedValue(surfaceWith(['me-public']) as any)
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
  // Default: inviter well below the farming cap.
  mockCount.mockResolvedValue({ data: () => ({ count: 0 }) })
}

beforeEach(() => {
  vi.clearAllMocks()
  // Inviter below the farming cap unless a test overrides it. Set here (not
  // only in primeHappyPath) so the manually-primed tests get it too.
  mockCount.mockResolvedValue({ data: () => ({ count: 0 }) })
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
    expect(mockTransactionSet).toHaveBeenCalledTimes(3)
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

  // Alter aus der Konstante ableiten, nicht als Literal: das Fenster ist ein
  // Produktwert (es umschliesst das Identitaets-Formular auf /welcome) und
  // wurde schon einmal verschoben. Ein hartes "60 Minuten" stand danach genau
  // auf der Grenze und behauptete das Gegenteil von dem, was es prueft.
  function agedFriend(ms: number) {
    mockGetUser.mockImplementation(async (uid: string) =>
      uid === FRIEND
        ? { email: 'friend@x.com', metadata: { creationTime: new Date(Date.now() - ms).toISOString() } }
        : { email: 'inviter@x.com', metadata: { creationTime: new Date().toISOString() } },
    )
  }

  it('not a new account → no write, clears cookie', async () => {
    primeHappyPath()
    agedFriend(ACCOUNT_FRESHNESS_MS + 60_000)
    const res = await POST(mkReq(INVITER))
    expect(mockTransactionSet).not.toHaveBeenCalled()
    expect(res.cookies.get('pending_referrer')?.value).toBe('')
  })

  // Zwischen Kontoerstellung und Confirm liegt fuer jedes neue Konto das
  // Identitaets-Formular auf /welcome. Wer dort das Telefon weglegt, darf die
  // Einladung nicht verlieren — genau daran starb sie vorher still.
  it('account still inside the window → both sides written', async () => {
    primeHappyPath()
    agedFriend(ACCOUNT_FRESHNESS_MS - 60_000)
    const res = await POST(mkReq(INVITER))
    expect(res.status).toBe(200)
    expect(mockTransactionSet).toHaveBeenCalled()
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
    vi.mocked(resolveEntitlements).mockResolvedValue({ ...EMPTY_ENT, hasAllBerlin: true })
    // Erster Aufruf ist der Einladende: ihm liegt schon alles offen.
    vi.mocked(composeAccountSurface)
      .mockResolvedValueOnce(surfaceWith(['me-public', 'me-free']) as any)
      .mockResolvedValueOnce(surfaceWith(['me-public']) as any)
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

  /* Eine Einladung bringt KARTEN, nicht Spots — die Karte ist frei. Und sie
     bringt nur, was noch nicht offen liegt: eine Schaufensterkarte zu
     verschenken wäre ein Geschenk, das der Beschenkte längst hat. */
  it('schenkt eine Karte, und zwar eine, die noch nicht offen liegt', async () => {
    primeHappyPath()

    const res = await POST(mkReq(INVITER))
    expect(res.status).toBe(200)
    expect(mockTransactionSet).toHaveBeenCalledTimes(3)

    // First transaction.set call is always the friend doc (source: 'invited-by')
    const friendDoc = mockTransactionSet.mock.calls[0][1] as { mustEatIds: string[]; source: string }
    expect(friendDoc.source).toBe('invited-by')
    expect(friendDoc.mustEatIds).toEqual(['me-free'])

    const inviterDoc = mockTransactionSet.mock.calls[1][1] as { mustEatIds: string[]; source: string }
    expect(inviterDoc.source).toBe('invited')
    expect(inviterDoc.mustEatIds).toEqual(['me-free'])
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

  it('inviter at farming cap → friend doc still written, inviter doc withheld', async () => {
    primeHappyPath()
    // Legacy awards seed the shared counter right at the cap.
    mockCount.mockResolvedValue({ data: () => ({ count: MAX_REFERRALS_PER_INVITER }) })
    const res = await POST(mkReq(INVITER))
    expect(res.status).toBe(200)
    // The friend's welcome bonus and initial counter are written; no
    // inviter-side reward is created.
    expect(mockTransactionSet).toHaveBeenCalledTimes(2)
    const friendDoc = mockTransactionSet.mock.calls[0][1] as { source: string }
    expect(friendDoc.source).toBe('invited-by')
    expect(mockTransactionSet.mock.calls[1][1]).toMatchObject({
      awardedCount: MAX_REFERRALS_PER_INVITER,
    })
    expect(res.cookies.get('pending_referrer')?.value).toBe('')
  })

  it('inviter one below cap → both docs written', async () => {
    primeHappyPath()
    mockCount.mockResolvedValue({ data: () => ({ count: MAX_REFERRALS_PER_INVITER - 1 }) })
    const res = await POST(mkReq(INVITER))
    expect(res.status).toBe(200)
    expect(mockTransactionSet).toHaveBeenCalledTimes(3)
    expect(mockTransactionSet.mock.calls[2][0]).toEqual({
      path: `users/${INVITER}/referralStats/inviter`,
    })
    expect(mockTransactionSet.mock.calls[2][1]).toMatchObject({
      awardedCount: MAX_REFERRALS_PER_INVITER,
    })
  })

  it('uses the shared transactional counter for the cap decision', async () => {
    primeHappyPath()
    // The legacy aggregate is stale/below cap. The transaction sees the
    // serialized counter at the cap and must withhold the inviter award.
    mockCount.mockResolvedValue({ data: () => ({ count: 0 }) })
    mockTransactionGet.mockImplementation(async (ref: { path?: string }) =>
      ref.path?.endsWith('/referralStats/inviter')
        ? { exists: true, data: () => ({ awardedCount: MAX_REFERRALS_PER_INVITER }) }
        : { exists: false },
    )

    const res = await POST(mkReq(INVITER))
    expect(res.status).toBe(200)
    expect(mockTransactionSet).toHaveBeenCalledTimes(1)
    expect(mockTransactionSet.mock.calls[0][1]).toMatchObject({ source: 'invited-by' })
  })
})
