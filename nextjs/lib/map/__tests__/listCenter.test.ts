import { describe, expect, it } from 'vitest';
import {
  isRowReturnFlight,
  listFollowsMove,
  ROW_RETURN_FLIGHT,
  sameCenter,
  type MoveEndContext,
} from '../listCenter';

/**
 * Die Liste folgt der Karte — aber erst, nachdem der Nutzer sie angefasst hat,
 * und nie während ein Detail offen ist (der Flug zum Spot ist nicht seine
 * Ansicht; der Rückflug zur Kamera eines Pin-Tipps ist es). Der Rückflug zu
 * einer Listenzeile sortiert nie neu: sonst stünde der Spot danach oben.
 */
describe('listFollowsMove', () => {
  const base: MoveEndContext = {
    userGesture: false,
    following: true,
    detailOpen: false,
    rowReturn: false,
  };

  it('folgt jeder Nutzergeste, auch bei offenem Detail', () => {
    expect(listFollowsMove({ ...base, userGesture: true, following: false })).toBe(true);
    expect(listFollowsMove({ ...base, userGesture: true, detailOpen: true })).toBe(true);
  });

  it('lässt Kameraflüge vor der ersten Geste die kuratierte Reihenfolge stehen', () => {
    expect(listFollowsMove({ ...base, following: false })).toBe(false);
  });

  it('nimmt Kameraflüge mit, sobald die Liste folgt — außer ins Detail hinein', () => {
    expect(listFollowsMove(base)).toBe(true);
    expect(listFollowsMove({ ...base, detailOpen: true })).toBe(false);
  });

  it('sortiert beim Schließen zurück zur Zeile nicht um den Spot neu', () => {
    expect(listFollowsMove({ ...base, rowReturn: true })).toBe(false);
    expect(listFollowsMove({ ...base, rowReturn: true, userGesture: true })).toBe(true);
  });
});

describe('isRowReturnFlight', () => {
  it('erkennt den Rückflug an seinen Event-Daten', () => {
    expect(isRowReturnFlight({ type: 'moveend', ...ROW_RETURN_FLIGHT })).toBe(true);
    expect(isRowReturnFlight({ type: 'moveend' })).toBe(false);
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
