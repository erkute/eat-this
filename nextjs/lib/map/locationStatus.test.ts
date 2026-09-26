import { describe, expect, it } from 'vitest';

import { getLocationStatus } from './locationStatus';

describe('getLocationStatus', () => {
  it('hides the layer when a location is available despite a stale denied error', () => {
    expect(
      getLocationStatus({
        locale: 'de',
        location: { lat: 52.52, lng: 13.405 },
        locationError: 'denied',
        locateLoading: false,
      })
    ).toEqual({ copy: null, isError: false, canRetry: false });
  });

  it('shows denied as an error when no location is present', () => {
    expect(
      getLocationStatus({
        locale: 'de',
        location: null,
        locationError: 'denied',
        locateLoading: false,
      })
    ).toEqual({
      copy: 'Blockiert. Im Browser erlauben.',
      isError: true,
      canRetry: false,
    });
  });

  it('allows retry for transient location errors', () => {
    expect(
      getLocationStatus({
        locale: 'de',
        location: null,
        locationError: 'timeout',
        locateLoading: false,
      })
    ).toEqual({ copy: 'Standort nicht gefunden', isError: true, canRetry: true });
  });

  /* Karte: jeder Tipp fragt neu, auch mit einem Fix auf dem Schirm. Suche
     und Fehlschlag muessen dann sichtbar sein, sonst wirkt der Knopf tot. */
  it('reports a re-locate while located when asked to', () => {
    const located = { lat: 52.52, lng: 13.405 };
    expect(
      getLocationStatus({
        locale: 'de',
        location: located,
        locationError: null,
        locateLoading: true,
        whileLocated: true,
      })
    ).toEqual({ copy: 'Standort wird gesucht', isError: false, canRetry: false });
    expect(
      getLocationStatus({
        locale: 'de',
        location: located,
        locationError: 'timeout',
        locateLoading: false,
        whileLocated: true,
      })
    ).toEqual({ copy: 'Standort nicht gefunden', isError: true, canRetry: true });
    expect(
      getLocationStatus({
        locale: 'de',
        location: located,
        locationError: null,
        locateLoading: false,
        whileLocated: true,
      })
    ).toEqual({ copy: null, isError: false, canRetry: false });
  });
});
