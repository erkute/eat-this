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

const RANGE = { start: '2026-08-28', end: '2026-09-03', days: 7 };
/** Neun parallele Abfragen je Lauf. */
const QUERIES_PER_LOAD = 9;

function rows(keys: string[][]) {
  return {
    data: {
      rows: keys.map((key) => ({ keys: key, clicks: 1, impressions: 10, ctr: 0.1, position: 5 })),
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

  it('fragt Zeitraum, Vorperiode, Anfragen, Seiten, Geräte, Länder und die frischen Tage ab', async () => {
    mocks.request.mockImplementation(
      ({ data }: { data: { dimensions: string[]; startDate: string; endDate: string } }) => {
        if (data.dimensions.join() === 'date,query') {
          return Promise.resolve(rows([[data.endDate, 'frisch']]));
        }
        if (data.dimensions.join() === 'date,page') return Promise.resolve(rows([]));
        if (data.dimensions[0] === 'date') return Promise.resolve(rows([[data.startDate]]));
        if (data.dimensions[0] === 'query') return Promise.resolve(rows([['best lunch berlin']]));
        if (data.dimensions[0] === 'device') return Promise.resolve(rows([['MOBILE']]));
        if (data.dimensions[0] === 'country') return Promise.resolve(rows([['deu']]));
        return Promise.resolve(rows([['https://www.eatthisdot.com/map']]));
      }
    );

    const result = await loadSearch(RANGE);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.range).toEqual(RANGE);
    expect(result.data.queries[0].key).toBe('best lunch berlin');
    expect(result.data.pages[0].key).toBe('/map');
    expect(result.data.before?.clicks).toBe(1);
    expect(result.data.devices[0].key).toBe('MOBILE');
    expect(result.data.countries[0].key).toBe('deu');
    expect(result.data.latestDay?.queries[0].key).toBe('frisch');

    const calls = mocks.request.mock.calls.map(([options]) => options.data);
    expect(calls.map((c) => c.dimensions.join())).toEqual([
      'date',
      'date',
      'query',
      'query',
      'page',
      'device',
      'country',
      'date,query',
      'date,page',
    ]);
    // Vorperiode: die 7 Tage direkt davor, ohne Ueberlappung.
    expect(calls[1]).toMatchObject({ startDate: '2026-08-21', endDate: '2026-08-27' });
    expect(calls[3]).toMatchObject({ startDate: '2026-08-21', endDate: '2026-08-27' });
    // Die frischen Tage: die letzten fuenf des Fensters, mit mehr Zeilen.
    expect(calls[7]).toMatchObject({
      startDate: '2026-08-30',
      endDate: '2026-09-03',
      rowLimit: 2000,
    });
    expect(calls[0].dataState).toBe('all');
  });

  it('meldet bei 403 den fehlenden Zugang samt Dienstkonto', async () => {
    mocks.request.mockRejectedValue(
      Object.assign(new Error('The caller does not have permission'), { response: { status: 403 } })
    );

    const result = await loadSearch(RANGE);

    expect(result).toEqual({
      ok: false,
      reason: 'no-access',
      identity: 'sa@example.iam',
      message: 'The caller does not have permission',
    });
  });

  it('haelt Zahlen eine Stunde, Fehler nicht', async () => {
    mocks.request.mockRejectedValueOnce(
      Object.assign(new Error('boom'), { response: { status: 500 } })
    );
    const failed = await loadSearch(RANGE);
    expect(failed.ok).toBe(false);

    mocks.request.mockResolvedValue(rows([['x']]));
    const first = await loadSearch(RANGE);
    const second = await loadSearch(RANGE);

    expect(first.ok).toBe(true);
    expect(second).toBe(first);
    // Der gescheiterte Lauf plus der gelungene; der zweite Aufruf kam aus dem
    // Cache und fragte nichts mehr.
    expect(mocks.request).toHaveBeenCalledTimes(QUERIES_PER_LOAD * 2);
  });

  it('cacht je Fenster, nicht je Laenge', async () => {
    mocks.request.mockResolvedValue(rows([['x']]));
    await loadSearch(RANGE);
    await loadSearch({ start: '2026-08-27', end: '2026-09-02', days: 7 });

    expect(mocks.request).toHaveBeenCalledTimes(QUERIES_PER_LOAD * 2);
  });

  it('nimmt lokal das explizite Dienstkonto, sonst die Standard-Anmeldung', async () => {
    mocks.request.mockResolvedValue(rows([['x']]));
    await loadSearch(RANGE);
    expect(mocks.construct.mock.calls[0][0]).not.toHaveProperty('credentials');

    resetSearchCache();
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL = 'local@example.iam';
    process.env.FIREBASE_ADMIN_PRIVATE_KEY = 'line1\\nline2';
    await loadSearch(RANGE);
    expect(mocks.construct.mock.calls[1][0]).toMatchObject({
      credentials: { client_email: 'local@example.iam', private_key: 'line1\nline2' },
    });
  });
});
