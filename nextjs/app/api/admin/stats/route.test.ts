import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  where: vi.fn(),
  get: vi.fn(),
  listUsers: vi.fn(),
  collectionGroup: vi.fn(),
  mapData: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken: mocks.verifyIdToken, listUsers: mocks.listUsers }),
  getAdminFirestore: () => ({
    collection: () => {
      // Zwei Bereichsfilter auf der Dokument-ID, dann `get`.
      const query = {
        where: (field: unknown, op: string, value: string) => {
          mocks.where(op, value);
          return query;
        },
        get: () => mocks.get(),
      };
      return query;
    },
    collectionGroup: (name: string) => ({
      get: () => mocks.collectionGroup(name),
      select: () => ({ get: () => mocks.collectionGroup(name) }),
    }),
  }),
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldPath: { documentId: () => '__name__' },
}));

vi.mock('@/lib/admin/searchConsole.server', () => ({
  loadSearch: () =>
    Promise.resolve({ ok: false, reason: 'no-access', identity: 'sa@test', message: '403' }),
}));

vi.mock('@/lib/map/cached-sanity', () => ({
  getCachedMapData: () => mocks.mapData(),
}));

vi.mock('@/lib/analytics/visitorHash', () => ({
  // Ohne Argument „heute"; mit Datum der Kalendertag des Datums — so liest
  // die Route auch Anlage- und Kaufzeitpunkte damit.
  berlinDay: (now?: Date) => (now ? now.toISOString().slice(0, 10) : '2026-08-31'),
}));

import { parseRange } from '@/lib/admin/stats.server';
import { GET } from './route';

function request(headers: Record<string, string> = {}, query = '') {
  return new Request(`https://www.eatthisdot.com/api/admin/stats${query}`, { headers });
}

function snapshot(docs: { id: string; data: Record<string, unknown>; uid?: string }[]) {
  return {
    docs: docs.map((d) => ({
      id: d.id,
      data: () => d.data,
      ref: { parent: { parent: { id: d.uid ?? 'u0' } } },
    })),
  };
}

/** Ein Auth-Konto, wie listUsers es liefert — nur die Felder, die die Route liest. */
function authUser(email: string, created: string, refreshed: string, provider = 'password') {
  return {
    uid: `uid-${email}`,
    email,
    metadata: { creationTime: created, lastRefreshTime: refreshed, lastSignInTime: created },
    providerData: [{ providerId: provider }],
  };
}

/** Firestore-Timestamp-Attrappe: die Route ruft nur `toDate()`. */
function ts(iso: string) {
  return { toDate: () => new Date(iso) };
}

/** Die Grenzen, mit denen die Route gefiltert hat. */
function bounds(): { from: string; to: string } {
  const calls = mocks.where.mock.calls.slice(-2);
  return { from: calls[0]?.[1] as string, to: calls[1]?.[1] as string };
}

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    mocks.verifyIdToken.mockReset();
    mocks.where.mockReset();
    mocks.get.mockReset().mockResolvedValue(snapshot([]));
    mocks.listUsers.mockReset().mockResolvedValue({ users: [], pageToken: undefined });
    mocks.collectionGroup.mockReset().mockResolvedValue(snapshot([]));
    mocks.mapData.mockReset().mockResolvedValue({ restaurants: [], mustEats: [], categories: [] });
    delete process.env.ADMIN_EMAILS;
  });

  afterEach(() => {
    delete process.env.ADMIN_EMAILS;
  });

  it('weist Aufrufe ohne Token ab', async () => {
    const res = await GET(request());

    expect(res.status).toBe(401);
    expect(mocks.where).not.toHaveBeenCalled();
  });

  it('weist ein ungültiges Token ab', async () => {
    mocks.verifyIdToken.mockRejectedValue(new Error('expired'));

    const res = await GET(request({ authorization: 'Bearer abc' }));

    expect(res.status).toBe(401);
    expect(mocks.where).not.toHaveBeenCalled();
  });

  it('antwortet einem angemeldeten Nicht-Admin mit 404', async () => {
    mocks.verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'gast@example.com' });

    const res = await GET(request({ authorization: 'Bearer abc' }));

    expect(res.status).toBe(404);
    expect(mocks.where).not.toHaveBeenCalled();
  });

  it('verweigert eine ADMIN_EMAILS-Adresse ohne verifizierte Mail', async () => {
    process.env.ADMIN_EMAILS = 'chef@eatthisdot.com';
    mocks.verifyIdToken.mockResolvedValue({
      uid: 'u1',
      email: 'chef@eatthisdot.com',
      email_verified: false,
    });

    const res = await GET(request({ authorization: 'Bearer abc' }));

    expect(res.status).toBe(404);
  });

  it('lässt eine verifizierte ADMIN_EMAILS-Adresse durch', async () => {
    process.env.ADMIN_EMAILS = 'chef@eatthisdot.com';
    mocks.verifyIdToken.mockResolvedValue({
      uid: 'u1',
      email: 'chef@eatthisdot.com',
      email_verified: true,
    });

    const res = await GET(request({ authorization: 'Bearer abc' }));

    expect(res.status).toBe(200);
  });

  it('liefert dem Admin-Claim die Auswertung und cacht sie nicht', async () => {
    mocks.verifyIdToken.mockResolvedValue({ uid: 'u1', admin: true });
    mocks.get.mockResolvedValue(
      snapshot([
        { id: '2026-08-28', data: { pageviews: 50, visitors: 10, paths: { '/': 30 } } },
        { id: '2026-08-27', data: { pageviews: 100, visitors: 20, paths: { '/': 60 } } },
      ])
    );

    const res = await GET(request({ authorization: 'Bearer abc' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(body.totals).toEqual({ pageviews: 150, visitors: 30, days: 2, closedDays: 2 });
    expect(body.days.map((d: { day: string }) => d.day)).toEqual(['2026-08-27', '2026-08-28']);
    expect(body.range).toEqual({
      start: '2026-08-02',
      end: '2026-08-31',
      days: 30,
      today: '2026-08-31',
      includesToday: false,
    });
    expect(body.funnel.stages.map((s: { key: string }) => s.key)).toEqual([
      'free',
      'account',
      'onsite',
      'packs',
    ]);
  });

  it('nimmt den Tag aus der Dokument-ID, nicht aus dem Feld', async () => {
    mocks.verifyIdToken.mockResolvedValue({ uid: 'u1', admin: true });
    mocks.get.mockResolvedValue(
      snapshot([{ id: '2026-08-28', data: { day: '1999-01-01', pageviews: 5 } }])
    );

    const body = await (await GET(request({ authorization: 'Bearer abc' }))).json();

    expect(body.days[0].day).toBe('2026-08-28');
  });

  it('holt doppelt so weit zurück wie angefragt — für den Vorperiodenvergleich', async () => {
    mocks.verifyIdToken.mockResolvedValue({ uid: 'u1', admin: true });

    await GET(request({ authorization: 'Bearer abc' }, '?days=7'));

    // 14 Tage zurück: 7 für das Fenster, 7 für den Vergleich davor — bis heute.
    expect(bounds()).toEqual({ from: '2026-08-18', to: '2026-08-31' });
  });

  it('teilt die Dokumente in Zeitraum und Vorperiode', async () => {
    mocks.verifyIdToken.mockResolvedValue({ uid: 'u1', admin: true });
    mocks.get.mockResolvedValue(
      snapshot([
        { id: '2026-08-20', data: { visitors: 10 } }, // vor dem Fenster
        { id: '2026-08-30', data: { visitors: 40 } }, // im Fenster (ab 25.08.)
      ])
    );

    const body = await (await GET(request({ authorization: 'Bearer abc' }, '?days=7'))).json();

    expect(body.totals.visitors).toBe(40);
    expect(body.period).toEqual({
      visitors: { now: 40, before: 10, change: 3 },
      pageviews: { now: 0, before: 0, change: null },
      days: 1,
      daysNow: 1,
    });
  });

  it('deckelt den days-Parameter und fällt bei Unsinn auf 30 zurück', async () => {
    mocks.verifyIdToken.mockResolvedValue({ uid: 'u1', admin: true });

    await GET(request({ authorization: 'Bearer abc' }, '?days=99999'));
    expect(bounds().from).toBe('2024-09-01'); // 2 × 365 Tage

    await GET(request({ authorization: 'Bearer abc' }, '?days=schwurbel'));
    expect(bounds().from).toBe('2026-07-03'); // 2 × 30 Tage
  });

  it('nimmt ein eigenes Fenster über from und to — und schneidet die Vorperiode davor', async () => {
    mocks.verifyIdToken.mockResolvedValue({ uid: 'u1', admin: true });
    mocks.get.mockResolvedValue(
      snapshot([
        { id: '2026-08-10', data: { visitors: 3 } }, // Vorperiode
        { id: '2026-08-20', data: { visitors: 7 } }, // im Fenster
        { id: '2026-08-31', data: { visitors: 99 } }, // nach dem Fenster — kommt vom Mock, nicht von Firestore
      ])
    );

    const body = await (
      await GET(request({ authorization: 'Bearer abc' }, '?from=2026-08-15&to=2026-08-21'))
    ).json();

    expect(bounds()).toEqual({ from: '2026-08-08', to: '2026-08-21' });
    expect(body.range).toMatchObject({ start: '2026-08-15', end: '2026-08-21', days: 7 });
    expect(body.totals.visitors).toBe(106);
    expect(body.period?.visitors.before).toBe(3);
  });

  it('zählt Konten aus Firebase Auth — ohne das Admin-Konto, mit Karten, Käufen und Favoriten', async () => {
    process.env.ADMIN_EMAILS = 'chef@eatthisdot.com';
    mocks.verifyIdToken.mockResolvedValue({ uid: 'u1', admin: true });
    mocks.listUsers.mockResolvedValue({
      users: [
        authUser('chef@eatthisdot.com', '2026-07-01T10:00:00Z', '2026-08-31T10:00:00Z'),
        authUser('a@example.com', '2026-08-29T10:00:00Z', '2026-08-30T10:00:00Z', 'google.com'),
        authUser('b@example.com', '2026-07-01T10:00:00Z', '2026-07-02T10:00:00Z'),
      ],
      pageToken: undefined,
    });
    mocks.collectionGroup.mockImplementation((name: string) => {
      const a = 'uid-a@example.com';
      const b = 'uid-b@example.com';
      if (name === 'favorites') return snapshot([{ id: 'f1', data: {}, uid: a }]);
      // Der Betreiber und ein Seed-Dokument ohne Konto: beide stehen in den
      // Unter-Sammlungen, keins darf in Umsatz, Karten oder Einladungen.
      const chef = 'uid-chef@eatthisdot.com';
      const orphan = 'uid-seed-2026-05';
      if (name === 'entitlements') {
        return snapshot([
          {
            id: 'category-pizza',
            data: {
              purchasedAt: ts('2026-08-30T12:00:00Z'),
              stripeSessionId: 'cs_1',
              type: 'category',
            },
            uid: a,
          },
          {
            id: 'starter',
            data: { purchasedAt: ts('2026-08-30T12:00:00Z'), source: 'signup', type: 'starter' },
            uid: a,
          },
          {
            id: 'all-berlin',
            data: {
              purchasedAt: ts('2026-08-30T12:00:00Z'),
              stripeSessionId: 'cs_test',
              type: 'all',
            },
            uid: chef,
          },
          {
            id: 'starter',
            data: { purchasedAt: ts('2026-08-30T12:00:00Z'), source: 'signup', type: 'starter' },
            uid: orphan,
          },
        ]);
      }
      if (name === 'unlockedMustEats') {
        return snapshot([
          { id: 'm1', data: { unlockedAt: ts('2026-08-30T12:00:00Z') }, uid: b },
          { id: 'm2', data: { unlockedAt: ts('2026-07-30T12:00:00Z') }, uid: b },
          { id: 'm3', data: { unlockedAt: ts('2026-08-30T12:00:00Z') }, uid: chef },
        ]);
      }
      if (name === 'referralBonuses') {
        return snapshot([
          {
            id: 'invited-by',
            data: { createdAt: ts('2026-08-29T12:00:00Z'), source: 'invited-by' },
            uid: a,
          },
          {
            id: 'invited-x',
            data: { createdAt: ts('2026-08-29T12:00:00Z'), source: 'invited' },
            uid: b,
          },
          {
            id: 'invited-by',
            data: { createdAt: ts('2026-08-29T12:00:00Z'), source: 'invited-by' },
            uid: orphan,
          },
        ]);
      }
      return snapshot([
        {
          id: 'category-pizza',
          data: { createdAt: ts('2026-08-30T12:00:00Z'), status: 'open' },
          uid: a,
        },
        {
          id: 'all-berlin',
          data: { createdAt: ts('2026-08-30T12:00:00Z'), status: 'completed' },
          uid: chef,
        },
      ]);
    });

    const res = await GET(request({ authorization: 'Bearer abc' }, '?days=7'));
    const body = await res.json();

    expect(body.accounts).toMatchObject({
      total: 2,
      newInWindow: 1,
      activeInWindow: 1,
      active: { day: 0, week: 1, month: 1 },
      google: 1,
      email: 1,
      withFavorites: 1,
      starterPacks: { total: 1, inWindow: 1 },
      reveals: { total: 2, inWindow: 1 },
      referrals: { total: 1, inWindow: 1 },
      purchases: {
        total: 1,
        inWindow: 1,
        byPack: [{ packId: 'category-pizza', name: 'Pizza', count: 1, revenueCents: 299 }],
      },
      revenue: { totalCents: 299, inWindowCents: 299 },
      checkouts: { inWindow: 1, open: 1, completed: 0 },
      people: { accounts: 2, withStarterPack: 1, withReveal: 1, withReferral: 1, buyers: 1 },
    });
  });

  it('liefert den Katalog aus Sanity — und null, wenn Sanity nicht antwortet', async () => {
    mocks.verifyIdToken.mockResolvedValue({ uid: 'u1', admin: true });
    mocks.mapData.mockResolvedValue({
      restaurants: [{ _id: 'r1', categories: [{ slug: 'pizza', name: 'Pizza' }] }],
      mustEats: [{ _id: 'm1', restaurant: { _id: 'r1' }, revealedForAnon: true }],
      categories: [{ slug: 'pizza', name: 'Pizza' }],
    });

    let body = await (await GET(request({ authorization: 'Bearer abc' }))).json();
    expect(body.deck).toMatchObject({ cards: 1, publicCards: 1, spots: 1 });
    expect(body.deck.byCategory[0]).toMatchObject({ slug: 'pizza', cards: 1, sellable: true });

    mocks.mapData.mockRejectedValue(new Error('sanity down'));
    body = await (await GET(request({ authorization: 'Bearer abc' }))).json();
    expect(body.deck).toBeNull();
    expect(body.totals).toBeDefined();
  });
});

describe('parseRange', () => {
  const today = '2026-08-31';
  const params = (query: string) => new URLSearchParams(query);

  it('nimmt from/to, kappt die Zukunft auf heute und begrenzt auf ein Jahr', () => {
    expect(parseRange(params('from=2026-08-01&to=2026-08-10'), today)).toEqual({
      start: '2026-08-01',
      end: '2026-08-10',
      days: 10,
    });
    expect(parseRange(params('from=2026-08-25&to=2026-09-30'), today)).toEqual({
      start: '2026-08-25',
      end: '2026-08-31',
      days: 7,
    });
    expect(parseRange(params('from=2020-01-01&to=2026-08-31'), today).days).toBe(365);
  });

  it('fällt bei kaputten oder verdrehten Daten auf days zurück', () => {
    expect(parseRange(params('from=2026-08-20&to=2026-08-10&days=7'), today)).toEqual({
      start: '2026-08-25',
      end: '2026-08-31',
      days: 7,
    });
    expect(parseRange(params('from=gestern&to=heute'), today).days).toBe(30);
  });
});
