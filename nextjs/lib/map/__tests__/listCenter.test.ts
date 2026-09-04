import { describe, expect, it } from 'vitest';
import { listFollowsMove, sameCenter } from '../listCenter';

/**
 * Die Liste folgt der Karte — aber erst, nachdem der Nutzer sie angefasst hat,
 * und nie während ein Detail offen ist (der Flug zum Spot ist nicht seine
 * Ansicht; der Rückflug beim Schließen ist es).
 */
describe('listFollowsMove', () => {
  it('folgt jeder Nutzergeste, auch bei offenem Detail', () => {
    expect(listFollowsMove({ userGesture: true, following: false, detailOpen: false })).toBe(true);
    expect(listFollowsMove({ userGesture: true, following: false, detailOpen: true })).toBe(true);
  });

  it('lässt Kameraflüge vor der ersten Geste die kuratierte Reihenfolge stehen', () => {
    expect(listFollowsMove({ userGesture: false, following: false, detailOpen: false })).toBe(
      false
    );
  });

  it('nimmt Kameraflüge mit, sobald die Liste folgt — außer ins Detail hinein', () => {
    expect(listFollowsMove({ userGesture: false, following: true, detailOpen: false })).toBe(true);
    expect(listFollowsMove({ userGesture: false, following: true, detailOpen: true })).toBe(false);
  });
});

describe('sameCenter', () => {
  it('sieht Float-Rauschen als dieselbe Mitte, eine Straße weiter nicht', () => {
    const c = { lat: 52.5, lng: 13.4 };
    expect(sameCenter(null, c)).toBe(false);
    expect(sameCenter(c, { lat: 52.500001, lng: 13.399999 })).toBe(true);
    expect(sameCenter(c, { lat: 52.501, lng: 13.4 })).toBe(false);
  });
});
