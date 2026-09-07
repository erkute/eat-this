import { describe, it, expect } from 'vitest';
import { computeReferralPools, sampleN } from '@/lib/referral/pools';

describe('computeReferralPools', () => {
  const allMustEatIds = ['m1', 'm2', 'm3', 'm4', 'm5'];

  /* Verschenkt wird nur, was der Beschenkte noch nicht offen hat. Eine Karte
     aus dem öffentlichen Schaufenster ist kein Geschenk — sie liegt für jeden
     offen, auch ohne Konto. */
  it('leaves out what is already face up for the friend', () => {
    const { friendPool } = computeReferralPools({
      allMustEatIds,
      inviterFaceUpIds: new Set(['m3']),
      friendFaceUpIds: new Set(['m1', 'm2']),
    });
    expect([...friendPool].sort()).toEqual(['m3', 'm4', 'm5']);
  });

  it("leaves out the inviter's own cards — bought, earned or public", () => {
    const { inviterPool } = computeReferralPools({
      allMustEatIds,
      inviterFaceUpIds: new Set(['m1', 'm2', 'm3']),
      friendFaceUpIds: new Set(['m1']),
    });
    expect([...inviterPool].sort()).toEqual(['m4', 'm5']);
  });

  // All-Berlin: jede Karte offen, also nichts mehr zu verschenken. Der
  // Eingeladene bekommt seine trotzdem — die Route belohnt beide getrennt.
  it('hands an all-Berlin inviter an empty pool', () => {
    const { inviterPool } = computeReferralPools({
      allMustEatIds,
      inviterFaceUpIds: new Set(allMustEatIds),
      friendFaceUpIds: new Set(),
    });
    expect(inviterPool).toEqual([]);
  });
});

describe('sampleN', () => {
  it('returns at most n items', () => {
    expect(sampleN(['a', 'b', 'c'], 2)).toHaveLength(2);
  });
  it('returns the whole pool when smaller than n', () => {
    expect(sampleN(['a', 'b'], 5).sort()).toEqual(['a', 'b']);
  });
  it('empty pool → []', () => {
    expect(sampleN([], 5)).toEqual([]);
  });
  it('returns only pool items, no duplicates', () => {
    const pool = ['a', 'b', 'c', 'd', 'e'];
    const out = sampleN(pool, 3);
    expect(new Set(out).size).toBe(out.length);
    out.forEach((x) => expect(pool).toContain(x));
  });
});
