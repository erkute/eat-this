import { describe, it, expect } from 'vitest';
import { computeReferralPools, sampleN } from '@/lib/referral/pools';

describe('computeReferralPools', () => {
  const allMustEatIds = ['m1', 'm2', 'm3', 'm4', 'm5'];
  const nobody = { faceUpIds: new Set<string>(), coveredIds: new Set<string>() };

  /* Verschenkt wird nur, was der Beschenkte noch nicht offen hat. Eine Karte
     aus dem öffentlichen Schaufenster ist kein Geschenk — sie liegt für jeden
     offen, auch ohne Konto. */
  it('leaves out what is already face up for the friend', () => {
    const { friendPool } = computeReferralPools({
      allMustEatIds,
      inviter: { faceUpIds: new Set(['m3']), coveredIds: new Set() },
      friend: { faceUpIds: new Set(['m1', 'm2']), coveredIds: new Set() },
    });
    expect([...friendPool].sort()).toEqual(['m3', 'm4', 'm5']);
  });

  it("leaves out the inviter's own cards — bought, earned or public", () => {
    const { inviterPool } = computeReferralPools({
      allMustEatIds,
      inviter: { faceUpIds: new Set(['m1', 'm2', 'm3']), coveredIds: new Set() },
      friend: { faceUpIds: new Set(['m1']), coveredIds: new Set() },
    });
    expect([...inviterPool].sort()).toEqual(['m4', 'm5']);
  });

  /* Der Fehler, den diese Datei bis zum 08.09.2026 mitgetragen hat: eine
     verdeckte Karte liegt bereits im Deck. Sie zu verschenken macht das Album
     nicht größer, es dreht sich nur still eine Karte um — und der Anlass,
     dort hinzugehen, ist weg. */
  it('leaves out the covered cards the friend already holds', () => {
    const { friendPool } = computeReferralPools({
      allMustEatIds,
      inviter: nobody,
      friend: { faceUpIds: new Set(['m1']), coveredIds: new Set(['m2', 'm3']) },
    });
    expect([...friendPool].sort()).toEqual(['m4', 'm5']);
  });

  it('leaves out the covered cards the inviter already holds', () => {
    const { inviterPool } = computeReferralPools({
      allMustEatIds,
      inviter: { faceUpIds: new Set(['m4']), coveredIds: new Set(['m5']) },
      friend: nobody,
    });
    expect([...inviterPool].sort()).toEqual(['m1', 'm2', 'm3']);
  });

  /* Der heutige Stapel: 5 Schaufenster + 20 Starter Pack decken ihn ganz ab.
     Dann gibt es nichts zu verschenken — und die Route vergibt auch nichts,
     statt eine Karte umzudrehen, die der Beschenkte längst hat. */
  it('hands a freshly packed friend an empty pool rather than his own covered cards', () => {
    const { friendPool } = computeReferralPools({
      allMustEatIds,
      inviter: nobody,
      friend: {
        faceUpIds: new Set(['m1', 'm2']),
        coveredIds: new Set(['m3', 'm4', 'm5']),
      },
    });
    expect(friendPool).toEqual([]);
  });

  // All-Berlin: jede Karte offen, also nichts mehr zu verschenken. Der
  // Eingeladene bekommt seine trotzdem — die Route belohnt beide getrennt.
  it('hands an all-Berlin inviter an empty pool', () => {
    const { inviterPool } = computeReferralPools({
      allMustEatIds,
      inviter: { faceUpIds: new Set(allMustEatIds), coveredIds: new Set() },
      friend: nobody,
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
