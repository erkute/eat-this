import { describe, expect, it } from 'vitest';
import {
  STARTER_PACK_FACE_UP,
  placeWantedFirst,
  splitStarterPack,
  starterPackPool,
} from './starter-pack';

const POOL = Array.from({ length: 30 }, (_, i) => `m${i + 1}`);

describe('placeWantedFirst', () => {
  /* Die Anmelde-Tafel verspricht „diese ist dabei" — die Karte steht vorn,
     also in der offenen Haelfte, und die Ziehung bleibt so gross wie vorher. */
  it('legt die gewuenschte Karte an den Anfang, ohne die Ziehung zu vergroessern', () => {
    const drawn = POOL.slice(0, 20);
    const out = placeWantedFirst(drawn, POOL, 'm25');

    expect(out[0]).toBe('m25');
    expect(out).toHaveLength(20);
    expect(new Set(out).size).toBe(20);
    expect(splitStarterPack(out).faceUp[0]).toBe('m25');
  });

  it('verdoppelt eine Karte nicht, die ohnehin gezogen war', () => {
    const drawn = POOL.slice(0, 20);
    const out = placeWantedFirst(drawn, POOL, 'm15');

    expect(out[0]).toBe('m15');
    expect(out.filter((id) => id === 'm15')).toHaveLength(1);
    expect(out).toHaveLength(20);
  });

  /* Was nicht im Pool liegt — unbekannt, schon offen — bleibt aussen vor;
     das Pack wird gezogen wie immer. */
  it('ignoriert eine Karte ausserhalb des Pools und ohne Wunsch', () => {
    const drawn = POOL.slice(0, 20);
    expect(placeWantedFirst(drawn, POOL, 'nope')).toEqual(drawn);
    expect(placeWantedFirst(drawn, POOL, null)).toEqual(drawn);
  });

  it('haelt die offene Haelfte auch bei einem kleinen Stapel', () => {
    const smallPool = POOL.slice(0, 4);
    const drawn = smallPool.slice(0, 4);
    const out = placeWantedFirst(drawn, smallPool, 'm4');

    expect(out).toEqual(['m4', 'm1', 'm2', 'm3']);
    expect(splitStarterPack(out).faceUp).toHaveLength(Math.min(4, STARTER_PACK_FACE_UP));
  });
});

describe('starterPackPool', () => {
  it('nimmt nur, was das Konto noch nicht sieht', () => {
    expect(starterPackPool(['a', 'b', 'c'], new Set(['b']))).toEqual(['a', 'c']);
  });
});
