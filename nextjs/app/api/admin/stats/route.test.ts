import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  where: vi.fn(),
  listUsers: vi.fn(),
  collectionGroup: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken: mocks.verifyIdToken, listUsers: mocks.listUsers }),
  getAdminFirestore: () => ({
    collection: () => ({
      where: (field: unknown, op: string, value: string) => ({
        get: () => mocks.where(op, value),
      }),
    }),
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

vi.mock('@/lib/analytics/visitorHash', () => ({
  // Ohne Argument „heute"; mit Datum der Kalendertag des Datums — so liest
  // die Route auch Anlage- und Kaufzeitpunkte damit.
  berlinDay: (now?: Date) => (now ? now.toISOString().slice(0, 10) : '2026-08-31'),
}));

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

/** Der Tag, ab dem die Route gefiltert hat. */
function windowStart(): string {
  return mocks.where.mock.calls.at(-1)?.[1] as string;
}

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    mocks.verifyIdToken.mockReset();
    mocks.where.mockReset().mockResolvedValue(snapshot([]));
    mocks.listUsers.mockReset().mockResolvedValue({ users: [], pageToken: undefined });
    mocks.collectionGroup.mockReset().mockResolvedValue(snapshot([]));
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
    // Der Kern von isAdminToken: die blanke E-Mail-Behauptung reicht nicht,
    // sonst könnte sich ein Konto mit beliebiger Adresse hierher schreiben.
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
    mocks.where.mockResolvedValue(
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
  });

  it('nimmt den Tag aus der Dokument-ID, nicht aus dem Feld', async () => {
    // Geschnitten wird über die ID; trüge die Beschriftung ein abweichendes
    // Feld, liefe der Verlauf gegen sein eigenes Fenster.
    mocks.verifyIdToken.mockResolvedValue({ uid: 'u1', admin: true });
    mocks.where.mockResolvedValue(
      snapshot([{ id: '2026-08-28', data: { day: '1999-01-01', pageviews: 5 } }])
    );

    const body = await (await GET(request({ authorization: 'Bearer abc' }))).json();

    expect(body.days[0].day).toBe('2026-08-28');
  });

  it('holt doppelt so weit zurück wie angefragt — für den Vorperiodenvergleich', async () => {
    // Ein `limit(N)` griffe an Tagen ohne Aufrufe weiter zurück als gedacht,
    // weil der Zähler dann gar kein Dokument anlegt. Und die erste Hälfte des
    // Bereichs ist die Periode, gegen die verglichen wird.
    mocks.verifyIdToken.mockResolvedValue({ uid: 'u1', admin: true });

    await GET(request({ authorization: 'Bearer abc' }, '?days=7'));

    // 14 Tage zurück: 7 für das Fenster, 7 für den Vergleich davor.
    expect(mocks.where).toHaveBeenLastCalledWith('>=', '2026-08-18');
  });

  it('teilt die Dokumente in Zeitraum und Vorperiode', async () => {
    mocks.verifyIdToken.mockResolvedValue({ uid: 'u1', admin: true });
    mocks.where.mockResolvedValue(
      snapshot([
        { id: '2026-08-20', data: { visitors: 10 } }, // vor dem Fenster
        { id: '2026-08-30', data: { visitors: 40 } }, // im Fenster (ab 25.08.)
      ])
    );

    const body = await (await GET(request({ authorization: 'Bearer abc' }, '?days=7'))).json();

    expect(body.totals.visitors).toBe(40);
    // Je Tag gerechnet — hier trägt jede Periode genau einen Tag.
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
    expect(windowStart()).toBe('2024-09-01'); // 2 × 365 Tage

    await GET(request({ authorization: 'Bearer abc' }, '?days=schwurbel'));
    expect(windowStart()).toBe('2026-07-03'); // 2 × 30 Tage
  });

  it('zählt Konten aus Firebase Auth — ohne das Admin-Konto, mit Käufen und Favoriten', async () => {
    // `users/` traegt 56 Dokumente, davon die meisten Seed-Daten; Auth kennt
    // die echten Konten. Und der Betreiber waere sonst jeden Tag das eine
    // aktive Konto.
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
      if (name === 'favorites') {
        return snapshot([{ id: 'f1', data: {}, uid: 'uid-a@example.com' }]);
      }
      if (name === 'entitlements') {
        return snapshot([
          { id: 'e1', data: { purchasedAt: ts('2026-08-30T12:00:00Z'), stripeSessionId: 'cs_1' } },
          { id: 'e2', data: { purchasedAt: ts('2026-08-30T12:00:00Z'), source: 'signup' } },
        ]);
      }
      return snapshot([
        { id: 'c1', data: { createdAt: ts('2026-08-30T12:00:00Z'), status: 'open' } },
      ]);
    });

    const res = await GET(request({ authorization: 'Bearer abc' }, '?days=7'));
    const body = await res.json();

    expect(body.accounts).toEqual({
      total: 2,
      newInWindow: 1,
      activeInWindow: 1,
      active: { day: 0, week: 1, month: 1 },
      google: 1,
      email: 1,
      withFavorites: 1,
      purchases: { total: 1, inWindow: 1 },
      checkouts: { inWindow: 1, open: 1 },
    });
  });
});
