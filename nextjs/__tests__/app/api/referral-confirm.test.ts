import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- mocks (vars must be `mock`-prefixed to satisfy vi.mock hoisting) ---
const mockVerifyIdToken = vi.fn();
const mockGetUser = vi.fn();
const mockTransactionGet = vi.fn();
const mockTransactionSet = vi.fn();
const mockRunTransaction = vi.fn();
const mockDoc = vi.fn((path: string) => ({ path }));

vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken: mockVerifyIdToken, getUser: mockGetUser }),
  getAdminFirestore: () => ({
    doc: mockDoc,
    collection: () => ({
      doc: () => ({
        collection: () => ({
          path: 'referralBonuses',
          doc: (id: string) => ({ id }),
        }),
      }),
    }),
    runTransaction: mockRunTransaction,
  }),
}));

vi.mock('@/lib/map/cached-sanity', () => ({ getCachedMapData: vi.fn() }));
vi.mock('@/lib/firebase/entitlements', () => ({ resolveEntitlements: vi.fn() }));
vi.mock('@/lib/firebase/unlockedMustEats.server', () => ({
  getUnlockedMustEatIds: vi.fn().mockResolvedValue(new Set<string>()),
}));
vi.mock('@/lib/map/visible-restaurants.server', () => ({ composeAccountSurface: vi.fn() }));

import { POST } from '@/app/api/referral/confirm/route';
import { getCachedMapData } from '@/lib/map/cached-sanity';
import { resolveEntitlements } from '@/lib/firebase/entitlements';
import { composeAccountSurface } from '@/lib/map/visible-restaurants.server';
import { ACCOUNT_FRESHNESS_MS, MAX_REFERRALS_PER_INVITER } from '@/lib/referral/constants';

const INVITER = 'i'.repeat(28);
const FRIEND = 'f'.repeat(28);

function mkReq(cookieUid: string | null, idToken: string | null = 'tok'): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (cookieUid) headers.cookie = `${'pending_referrer'}=${cookieUid}`;
  return new NextRequest('https://www.eatthisdot.com/api/referral/confirm', {
    method: 'POST',
    headers,
    body: JSON.stringify(idToken ? { idToken } : {}),
  });
}

/* Der Stapel für die Happy-Path-Tests: eine Karte liegt öffentlich offen
   ('me-public'), eine ist noch zu holen ('me-free'). Damit ist der Pool auf
   beiden Seiten genau ['me-free'] — verschenkt wird nur, was der Beschenkte
   noch nicht hat. */
const HAPPY_PATH_MUST_EATS = [
  { _id: 'me-public', dish: 'Schaufenster', restaurant: { _id: 'a1' } },
  { _id: 'me-free', dish: 'Zu holen', restaurant: { _id: 'a2' } },
];

const HAPPY_PATH_RESTAURANTS = [
  { _id: 'a1', categories: [] },
  { _id: 'a2', categories: [] },
];

const EMPTY_ENT = {
  isAdmin: false,
  hasAllBerlin: false,
  categorySlugs: new Set<string>(),
  mustEatIds: new Set<string>(),
};

/** Was für dieses Konto offen liegt — die einzige Quelle, aus der die Route
 *  den Pool ableitet. */
function surfaceWith(faceUpIds: string[]) {
  return {
    restaurants: HAPPY_PATH_RESTAURANTS as any,
    mustEats: HAPPY_PATH_MUST_EATS as any,
    faceUpIds: new Set(faceUpIds),
    fullCatalog: false,
  };
}

function primeHappyPath() {
  vi.mocked(getCachedMapData).mockResolvedValue({
    restaurants: HAPPY_PATH_RESTAURANTS as any,
    mustEats: HAPPY_PATH_MUST_EATS as any,
    categories: [] as any,
  });
  vi.mocked(resolveEntitlements).mockResolvedValue(EMPTY_ENT);
  vi.mocked(composeAccountSurface).mockResolvedValue(surfaceWith(['me-public']) as any);
  mockVerifyIdToken.mockResolvedValue({ uid: FRIEND });
  mockGetUser.mockImplementation(async (uid: string) =>
    uid === FRIEND
      ? { email: 'friend@x.com', metadata: { creationTime: new Date().toISOString() } }
      : { email: 'inviter@x.com', metadata: { creationTime: new Date().toISOString() } }
  );
  mockTransactionGet.mockResolvedValue({ exists: false, data: () => undefined, docs: [] });
  mockRunTransaction.mockImplementation(async (fn) =>
    fn({ get: mockTransactionGet, set: mockTransactionSet })
  );
}

/** Der Einladende hat schon so viele Karten für Einladungen bekommen. */
function primeInviterCounter(awardedCount: number) {
  mockTransactionGet.mockImplementation(async (ref: { path?: string }) =>
    ref.path?.endsWith('/referralStats/inviter')
      ? { exists: true, data: () => ({ awardedCount }) }
      : { exists: false, data: () => undefined, docs: [] }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('/api/referral/confirm', () => {
  it('no cookie → 200, no backend calls', async () => {
    const res = await POST(mkReq(null));
    expect(res.status).toBe(200);
    expect(getCachedMapData).not.toHaveBeenCalled();
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it('happy path → writes friend + inviter docs, clears cookie', async () => {
    primeHappyPath();
    const res = await POST(mkReq(INVITER));
    expect(res.status).toBe(200);
    expect(mockTransactionSet).toHaveBeenCalledTimes(3);
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    expect(res.cookies.get('pending_referrer')?.value).toBe('');
  });

  it('first award starts the inviter counter at 1', async () => {
    primeHappyPath();
    await POST(mkReq(INVITER));
    expect(mockTransactionSet.mock.calls[2][0]).toEqual({
      path: `users/${INVITER}/referralStats/inviter`,
    });
    expect(mockTransactionSet.mock.calls[2][1]).toMatchObject({ awardedCount: 1 });
  });

  it('self-referral (same uid) → no write, clears cookie', async () => {
    primeHappyPath();
    mockVerifyIdToken.mockResolvedValue({ uid: INVITER });
    const res = await POST(mkReq(INVITER));
    expect(res.status).toBe(200);
    expect(mockTransactionSet).not.toHaveBeenCalled();
    expect(res.cookies.get('pending_referrer')?.value).toBe('');
  });

  // Alter aus der Konstante ableiten, nicht als Literal: das Fenster ist ein
  // Produktwert und wurde schon einmal verschoben. Ein hartes "60 Minuten" stand danach genau
  // auf der Grenze und behauptete das Gegenteil von dem, was es prueft.
  function agedFriend(ms: number) {
    mockGetUser.mockImplementation(async (uid: string) =>
      uid === FRIEND
        ? {
            email: 'friend@x.com',
            metadata: { creationTime: new Date(Date.now() - ms).toISOString() },
          }
        : { email: 'inviter@x.com', metadata: { creationTime: new Date().toISOString() } }
    );
  }

  it('not a new account → no write, clears cookie', async () => {
    primeHappyPath();
    agedFriend(ACCOUNT_FRESHNESS_MS + 60_000);
    const res = await POST(mkReq(INVITER));
    expect(mockTransactionSet).not.toHaveBeenCalled();
    expect(res.cookies.get('pending_referrer')?.value).toBe('');
  });

  // Ein Confirm, der etwas spaeter kommt als die Kontoerstellung, darf die
  // Einladung nicht verlieren — genau daran starb sie frueher still.
  it('account still inside the window → both sides written', async () => {
    primeHappyPath();
    agedFriend(ACCOUNT_FRESHNESS_MS - 60_000);
    const res = await POST(mkReq(INVITER));
    expect(res.status).toBe(200);
    expect(mockTransactionSet).toHaveBeenCalled();
  });

  it('idempotent repeat (friend already invited-by) → no write, clears cookie', async () => {
    primeHappyPath();
    mockTransactionGet.mockResolvedValue({ exists: true });
    const res = await POST(mkReq(INVITER));
    expect(mockTransactionSet).not.toHaveBeenCalled();
    expect(res.cookies.get('pending_referrer')?.value).toBe('');
  });

  it('all-berlin inviter (empty inviterPool) → relationship saved without bonus', async () => {
    primeHappyPath();
    vi.mocked(resolveEntitlements).mockResolvedValue({ ...EMPTY_ENT, hasAllBerlin: true });
    // Erster Aufruf ist der Einladende: ihm liegt schon alles offen.
    vi.mocked(composeAccountSurface)
      .mockResolvedValueOnce(surfaceWith(['me-public', 'me-free']) as any)
      .mockResolvedValueOnce(surfaceWith(['me-public']) as any);
    const res = await POST(mkReq(INVITER));
    expect(res.status).toBe(200);
    expect(mockTransactionSet).toHaveBeenCalledTimes(2);
    expect(mockTransactionSet.mock.calls[1][1]).toMatchObject({
      source: 'invited',
      mustEatIds: [],
    });
  });

  it('sanity outage → 503, no write, KEEPS cookie for retry', async () => {
    primeHappyPath();
    vi.mocked(getCachedMapData).mockRejectedValue(new Error('sanity down'));
    const res = await POST(mkReq(INVITER));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, completed: false });
    expect(mockRunTransaction).not.toHaveBeenCalled();
    expect(res.cookies.get('pending_referrer')).toBeUndefined();
  });

  /* Eine Einladung bringt KARTEN, nicht Spots — die Karte ist frei. Und sie
     bringt nur, was noch nicht offen liegt: eine Schaufensterkarte zu
     verschenken wäre ein Geschenk, das der Beschenkte längst hat. */
  it('schenkt eine Karte, und zwar eine, die noch nicht offen liegt', async () => {
    primeHappyPath();

    const res = await POST(mkReq(INVITER));
    expect(res.status).toBe(200);
    expect(mockTransactionSet).toHaveBeenCalledTimes(3);

    // First transaction.set call is always the friend doc (source: 'invited-by')
    const friendDoc = mockTransactionSet.mock.calls[0][1] as {
      mustEatIds: string[];
      source: string;
    };
    expect(friendDoc.source).toBe('invited-by');
    expect(friendDoc.mustEatIds).toEqual(['me-free']);

    const inviterDoc = mockTransactionSet.mock.calls[1][1] as {
      mustEatIds: string[];
      source: string;
    };
    expect(inviterDoc.source).toBe('invited');
    expect(inviterDoc.mustEatIds).toEqual(['me-free']);
  });

  it('self-referral by email (different uid, same email) → no write, clears cookie', async () => {
    primeHappyPath();
    mockGetUser.mockImplementation(async () => ({
      email: 'same@x.com',
      metadata: { creationTime: new Date().toISOString() },
    }));
    const res = await POST(mkReq(INVITER));
    expect(mockTransactionSet).not.toHaveBeenCalled();
    expect(res.cookies.get('pending_referrer')?.value).toBe('');
  });

  it('inviter deleted (getUser throws for inviter) → no write, clears cookie', async () => {
    primeHappyPath();
    mockGetUser.mockImplementation(async (uid: string) => {
      if (uid === INVITER)
        throw Object.assign(new Error('user not found'), { code: 'auth/user-not-found' });
      return { email: 'friend@x.com', metadata: { creationTime: new Date().toISOString() } };
    });
    const res = await POST(mkReq(INVITER));
    expect(mockTransactionSet).not.toHaveBeenCalled();
    expect(res.cookies.get('pending_referrer')?.value).toBe('');
  });

  it('inviter at farming cap → friend doc still written, relationship saved without bonus', async () => {
    primeHappyPath();
    primeInviterCounter(MAX_REFERRALS_PER_INVITER);
    const res = await POST(mkReq(INVITER));
    expect(res.status).toBe(200);
    expect(mockTransactionSet).toHaveBeenCalledTimes(2);
    expect(mockTransactionSet.mock.calls[1][1]).toMatchObject({
      source: 'invited',
      mustEatIds: [],
    });
    expect(mockTransactionSet.mock.calls[0][1]).toMatchObject({ source: 'invited-by' });
    expect(res.cookies.get('pending_referrer')?.value).toBe('');
  });

  it('inviter one below cap → both docs written', async () => {
    primeHappyPath();
    primeInviterCounter(MAX_REFERRALS_PER_INVITER - 1);
    const res = await POST(mkReq(INVITER));
    expect(res.status).toBe(200);
    expect(mockTransactionSet).toHaveBeenCalledTimes(3);
    expect(mockTransactionSet.mock.calls[2][0]).toEqual({
      path: `users/${INVITER}/referralStats/inviter`,
    });
    expect(mockTransactionSet.mock.calls[2][1]).toMatchObject({
      awardedCount: MAX_REFERRALS_PER_INVITER,
    });
  });
});

it('reselects the inviter card after a transaction retry sees another award', async () => {
  primeHappyPath();
  mockRunTransaction.mockImplementation(async (fn) => {
    await fn({ get: mockTransactionGet, set: mockTransactionSet });
    mockTransactionSet.mockClear();
    mockTransactionGet.mockImplementation(async (ref) =>
      ref.path === 'referralBonuses'
        ? { docs: [{ data: () => ({ mustEatIds: ['me-free'] }) }] }
        : { exists: false, data: () => undefined }
    );
    await fn({ get: mockTransactionGet, set: mockTransactionSet });
  });
  await POST(mkReq(INVITER));
  expect(mockTransactionSet).toHaveBeenCalledTimes(2);
  expect(mockTransactionSet.mock.calls[1][1]).toMatchObject({ source: 'invited', mustEatIds: [] });
});

it('keeps the invitation retryable when inviter lookup fails temporarily', async () => {
  primeHappyPath();
  mockGetUser.mockImplementation(async (uid) => {
    if (uid === INVITER) throw new Error('service unavailable');
    return { email: 'friend@x.com', metadata: { creationTime: new Date().toISOString() } };
  });
  const res = await POST(mkReq(INVITER));
  expect(res.status).toBe(503);
  expect(res.cookies.get('pending_referrer')).toBeUndefined();
});
