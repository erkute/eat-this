import { describe, expect, it } from 'vitest';
import { buildLoginContinueUrl } from '../loginContinueUrl';

const origin = 'https://www.eatthisdot.com';

function at(pathname: string, search = '') {
  return { origin, pathname, search };
}

describe('buildLoginContinueUrl', () => {
  it('fuehrt auf die Seite zurueck, auf der der Login angefangen hat', () => {
    expect(buildLoginContinueUrl(at('/restaurant/vox'))).toBe(`${origin}/restaurant/vox`);
  });

  it('haelt den offenen Spot der Karte fest', () => {
    expect(buildLoginContinueUrl(at('/map', '?r=vox'))).toBe(`${origin}/map?r=vox`);
  });

  it('haengt das ausstehende Herz an', () => {
    expect(buildLoginContinueUrl(at('/map', '?r=vox'), { heartRestaurantId: 'rest-1' })).toBe(
      `${origin}/map?r=vox&heart=rest-1`
    );
  });

  /* Die Traeger-Parameter gehoeren dem Link, nicht der Seite: geerbt wuerden
     sie eine zweite Anmeldung oder ein fremdes Herz ausloesen. */
  it('raeumt e und ein geerbtes heart ab', () => {
    expect(buildLoginContinueUrl(at('/map', '?r=vox&e=alt%40example.com&heart=alt'))).toBe(
      `${origin}/map?r=vox`
    );
  });

  it('ersetzt ein geerbtes Herz durch das der aktuellen Absicht', () => {
    expect(buildLoginContinueUrl(at('/map', '?heart=alt'), { heartRestaurantId: 'rest-2' })).toBe(
      `${origin}/map?heart=rest-2`
    );
  });

  /* Die angetippte Karte des Gastes: die Tafel verspricht „diese ist dabei",
     und das Versprechen muss den Posteingang ueberleben. */
  it('haengt die angetippte Starter-Karte an', () => {
    expect(buildLoginContinueUrl(at('/map', '?me=me-1'), { starterMustEatId: 'me-1' })).toBe(
      `${origin}/map?me=me-1&starter=me-1`
    );
  });

  it('raeumt eine geerbte Starter-Karte ab', () => {
    expect(buildLoginContinueUrl(at('/map', '?starter=alt'))).toBe(`${origin}/map`);
  });

  it('behaelt den EN-Praefix der Adresse', () => {
    expect(buildLoginContinueUrl(at('/en/restaurant/vox'))).toBe(`${origin}/en/restaurant/vox`);
  });
});
