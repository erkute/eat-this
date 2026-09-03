import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  getCredentials: vi.fn(),
  construct: vi.fn(),
}));

vi.mock('google-auth-library', () => ({
  GoogleAuth: class {
    constructor(options: unknown) {
      mocks.construct(options);
    }
    getClient() {
      return Promise.resolve({ request: mocks.request });
    }
    getCredentials() {
      return mocks.getCredentials();
    }
  },
}));

import { loadSearch, resetSearchCache } from './searchConsole.server';

function rows(keys: string[]) {
  return {
    data: {
      rows: keys.map((key) => ({ keys: [key], clicks: 1, impressions: 10, ctr: 0.1, position: 5 })),
    },
  };
}

describe('loadSearch', () => {
  beforeEach(() => {
    resetSearchCache();
    mocks.request.mockReset();
    mocks.getCredentials.mockReset().mockResolvedValue({ client_email: 'sa@example.iam' });
    mocks.construct.mockReset();
    delete process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    delete process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  });

  afterEach(() => {
    delete process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    delete process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  });

  it('fragt Zeitraum, Vorperiode, Anfragen und Seiten ab und fasst sie zusammen', async () => {
    mocks.request.mockImplementation(({ data }: { data: { dimensions: string[]; startDate: string } }) => {
      if (data.dimensions[0] === 'date') return Promise.resolve(rows([data.startDate]));
      if (data.dimensions[0] === 'query') return Promise.resolve(rows(['best lunch berlin']));
      return Promise.resolve(rows(['https://www.eatthisdot.com/map']));
    });

    const result = await loadSearch(7, '2026-09-03');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.range).toEqual({ start: '2026-08-28', end: '2026-09-03', days: 7 });
    expect(result.data.queries[0].key).toBe('best lunch berlin');
    expect(result.data.pages[0].key).toBe('/map');
    expect(result.data.before?.clicks).toBe(1);

    const calls = mocks.request.mock.calls.map(([options]) => options.data);
    expect(calls.map((c) => c.dimensions[0])).toEqual(['date', 'date', 'query', 'page']);
    // Vorperiode: die 7 Tage direkt davor, ohne Ueberlappung.
    expect(calls[1]).toMatchObject({ startDate: '2026-08-21', endDate: '2026-08-27' });
    expect(calls[0].dataState).toBe('all');
  });

  it('meldet bei 403 den fehlenden Zugang samt Dienstkonto', async () => {
    mocks.request.mockRejectedValue(
      Object.assign(new Error('The caller does not have permission'), { response: { status: 403 } })
    );

    const result = await loadSearch(7, '2026-09-03');

    expect(result).toEqual({
      ok: false,
      reason: 'no-access',
      identity: 'sa@example.iam',
      message: 'The caller does not have permission',
    });
  });

  it('haelt Zahlen eine Stunde, Fehler nicht', async () => {
    mocks.request.mockRejectedValueOnce(Object.assign(new Error('boom'), { response: { status: 500 } }));
    const failed = await loadSearch(7, '2026-09-03');
    expect(failed.ok).toBe(false);

    mocks.request.mockResolvedValue(rows(['x']));
    const first = await loadSearch(7, '2026-09-03');
    const second = await loadSearch(7, '2026-09-03');

    expect(first.ok).toBe(true);
    expect(second).toBe(first);
    // 4 parallele Abfragen des gescheiterten Laufs + 4 des gelungenen; der
    // zweite Aufruf kam aus dem Cache und fragte nichts mehr.
    expect(mocks.request).toHaveBeenCalledTimes(8);
  });

  it('nimmt lokal das explizite Dienstkonto, sonst die Standard-Anmeldung', async () => {
    mocks.request.mockResolvedValue(rows(['x']));
    await loadSearch(7, '2026-09-03');
    expect(mocks.construct.mock.calls[0][0]).not.toHaveProperty('credentials');

    resetSearchCache();
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL = 'local@example.iam';
    process.env.FIREBASE_ADMIN_PRIVATE_KEY = 'line1\\nline2';
    await loadSearch(7, '2026-09-03');
    expect(mocks.construct.mock.calls[1][0]).toMatchObject({
      credentials: { client_email: 'local@example.iam', private_key: 'line1\nline2' },
    });
  });
});
