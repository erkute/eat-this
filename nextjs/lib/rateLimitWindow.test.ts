// nextjs/lib/rateLimitWindow.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ runTransaction: vi.fn() }));

vi.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: () => ({
    collection: () => ({ doc: () => ({}) }),
    runTransaction: mocks.runTransaction,
  }),
}));

vi.mock('firebase-admin/firestore', () => ({
  Timestamp: { fromMillis: (ms: number) => ({ __ts: ms }) },
}));

import { checkWindowedRateLimit, evaluateRateLimit } from './rateLimitWindow';

const LIMITS = { perMinute: 10, perDay: 100 };

describe('evaluateRateLimit', () => {
  it('allows and increments a fresh session', () => {
    const r = evaluateRateLimit(1_000_000, null, LIMITS);
    expect(r.allowed).toBe(true);
    expect(r.state.minuteCount).toBe(1);
    expect(r.state.dayCount).toBe(1);
  });

  it('resets the minute window after 60s', () => {
    const prev = { minuteStart: 0, minuteCount: 10, dayStart: 0, dayCount: 10 };
    const r = evaluateRateLimit(61_000, prev, LIMITS);
    expect(r.allowed).toBe(true);
    expect(r.state.minuteCount).toBe(1);
    expect(r.state.dayCount).toBe(11);
  });

  it('blocks when the minute limit is reached within the window', () => {
    const prev = { minuteStart: 0, minuteCount: 10, dayStart: 0, dayCount: 10 };
    const r = evaluateRateLimit(30_000, prev, LIMITS);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('per_minute');
  });

  it('blocks when the daily limit is reached even if the minute is fresh', () => {
    const prev = { minuteStart: 0, minuteCount: 0, dayStart: 0, dayCount: 100 };
    const r = evaluateRateLimit(120_000, prev, LIMITS);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('per_day');
  });
});

/* Die Fehlerpolitik gab es bis 08.09.2026 nicht: eine Firestore-Stoerung flog
 * ungefangen durch den Aufrufer hindurch. Aus einem Beacon, das 204 antworten
 * sollte, wurde ein 500 und ueber `onRequestError` ein Vorfall in Sentry. */
describe('checkWindowedRateLimit unter Firestore-Ausfall', () => {
  beforeEach(() => {
    mocks.runTransaction.mockReset().mockRejectedValue(new Error('UNAVAILABLE'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('laesst mit `allow` durch, statt zu werfen', async () => {
    const decision = await checkWindowedRateLimit('k', LIMITS, 'allow');
    expect(decision.allowed).toBe(true);
  });

  it('sperrt mit `deny` und benennt den Grund', async () => {
    const decision = await checkWindowedRateLimit('k', LIMITS, 'deny');
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('unavailable');
  });

  it('schreibt den Schluessel nicht ins Log — er ist ein Besucher-Hash', async () => {
    await checkWindowedRateLimit('an-ip:0123456789abcdef', LIMITS, 'allow');
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).not.toContain('0123456789abcdef');
  });

  it('entscheidet im Normalfall anhand der Transaktion', async () => {
    mocks.runTransaction.mockReset().mockResolvedValue({ allowed: false, reason: 'per_day' });
    const decision = await checkWindowedRateLimit('k', LIMITS, 'deny');
    expect(decision.reason).toBe('per_day');
  });
});
