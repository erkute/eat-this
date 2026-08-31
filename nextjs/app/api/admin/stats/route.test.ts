import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  where: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken: mocks.verifyIdToken }),
  getAdminFirestore: () => ({
    collection: () => ({
      where: (field: unknown, op: string, value: string) => ({
        get: () => mocks.where(op, value),
      }),
    }),
  }),
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldPath: { documentId: () => '__name__' },
}));

vi.mock('@/lib/analytics/visitorHash', () => ({
  berlinDay: () => '2026-08-31',
}));

import { GET } from './route';

function request(headers: Record<string, string> = {}, query = '') {
  return new Request(`https://www.eatthisdot.com/api/admin/stats${query}`, { headers });
}

function snapshot(docs: { id: string; data: Record<string, unknown> }[]) {
  return { docs: docs.map((d) => ({ id: d.id, data: () => d.data })) };
}

/** Der Tag, ab dem die Route gefiltert hat. */
function windowStart(): string {
  return mocks.where.mock.calls.at(-1)?.[1] as string;
}

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    mocks.verifyIdToken.mockReset();
    mocks.where.mockReset().mockResolvedValue(snapshot([]));
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
    expect(body.totals).toEqual({ pageviews: 150, visitors: 30, days: 2 });
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

  it('fragt einen Datumsbereich ab, nicht die letzten N Dokumente', async () => {
    // Ein `limit(N)` griffe an Tagen ohne Aufrufe weiter zurück als gedacht,
    // weil der Zähler dann gar kein Dokument anlegt.
    mocks.verifyIdToken.mockResolvedValue({ uid: 'u1', admin: true });

    await GET(request({ authorization: 'Bearer abc' }, '?days=7'));

    expect(mocks.where).toHaveBeenLastCalledWith('>=', '2026-08-25');
  });

  it('deckelt den days-Parameter und fällt bei Unsinn auf 30 zurück', async () => {
    mocks.verifyIdToken.mockResolvedValue({ uid: 'u1', admin: true });

    await GET(request({ authorization: 'Bearer abc' }, '?days=99999'));
    expect(windowStart()).toBe('2025-09-01'); // 365 Tage

    await GET(request({ authorization: 'Bearer abc' }, '?days=schwurbel'));
    expect(windowStart()).toBe('2026-08-02'); // 30 Tage
  });
});
