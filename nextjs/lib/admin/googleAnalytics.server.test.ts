import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  getCredentials: vi.fn(),
}));

vi.mock('google-auth-library', () => ({
  GoogleAuth: class {
    getClient() {
      return Promise.resolve({ request: mocks.request });
    }
    getCredentials() {
      return mocks.getCredentials();
    }
  },
}));

import { loadGa, loadGaRealtime, resetGaCache } from './googleAnalytics.server';

const RANGE = { start: '2026-09-26', end: '2026-09-27', days: 2 };

function rows(list: { date?: string; users: number }[]) {
  return {
    data: {
      rows: list.map((r) => ({
        ...(r.date ? { dimensionValues: [{ value: r.date }] } : {}),
        metricValues: [{ value: String(r.users) }],
      })),
    },
  };
}

/** Die Abfrage ohne Dimension ist die Summe, die mit `date` die Tage. */
function respond(total: number, days: { date: string; users: number }[]) {
  mocks.request.mockImplementation(({ data }: { data: { dimensions?: unknown } }) =>
    Promise.resolve(data.dimensions ? rows(days) : rows([{ users: total }]))
  );
}

describe('loadGa', () => {
  beforeEach(() => {
    resetGaCache();
    mocks.request.mockReset();
    mocks.getCredentials.mockReset().mockResolvedValue({ client_email: 'sa@example.iam' });
  });

  it('liefert die Summe getrennt von den Tagen — Nutzer sind nicht additiv', async () => {
    respond(40, [
      { date: '20260926', users: 25 },
      { date: '20260927', users: 28 },
    ]);

    const result = await loadGa(RANGE);

    expect(result).toEqual({
      ok: true,
      users: 40,
      days: [
        { day: '2026-09-26', users: 25 },
        { day: '2026-09-27', users: 28 },
      ],
    });
    const call = mocks.request.mock.calls[0][0] as { url: string; data: { dateRanges: unknown } };
    expect(call.url).toBe(
      'https://analyticsdata.googleapis.com/v1beta/properties/529928450:runReport'
    );
    expect(call.data.dateRanges).toEqual([{ startDate: '2026-09-26', endDate: '2026-09-27' }]);
  });

  it('hält ein Ergebnis im Cache, einen Fehler nicht', async () => {
    mocks.request.mockRejectedValueOnce(
      Object.assign(new Error('boom'), { response: { status: 500 } })
    );
    expect((await loadGa(RANGE)).ok).toBe(false);

    respond(1, []);
    expect((await loadGa(RANGE)).ok).toBe(true);
    const calls = mocks.request.mock.calls.length;
    await loadGa(RANGE);
    expect(mocks.request.mock.calls.length).toBe(calls);
  });

  it('nennt bei 403 das Konto, das in GA freizuschalten ist', async () => {
    mocks.request.mockRejectedValue(
      Object.assign(new Error('forbidden'), { response: { status: 403 } })
    );

    expect(await loadGa(RANGE)).toMatchObject({
      ok: false,
      reason: 'no-access',
      identity: 'sa@example.iam',
    });
  });
});

describe('loadGaRealtime', () => {
  beforeEach(() => {
    resetGaCache();
    mocks.request.mockReset();
  });

  it('fragt den Echtzeitbericht', async () => {
    mocks.request.mockResolvedValue(rows([{ users: 3 }]));

    expect(await loadGaRealtime()).toBe(3);
    expect(mocks.request.mock.calls[0][0].url).toMatch(/:runRealtimeReport$/);
  });

  it('meldet 0, wenn gerade niemand da ist — GA liefert dann keine Zeile', async () => {
    mocks.request.mockResolvedValue({ data: {} });
    expect(await loadGaRealtime()).toBe(0);
  });

  it('gibt null zurück, wenn GA nicht antwortet', async () => {
    mocks.request.mockRejectedValue(new Error('down'));
    expect(await loadGaRealtime()).toBeNull();
  });
});
