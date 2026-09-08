// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { rememberPendingStarterCard, takePendingStarterCard } from '../pendingStarterCard';

const STORAGE_KEY = 'eatthis_pending_starter_card';
const TTL_MS = 10 * 60 * 1000;

function setAddress(search: string) {
  window.history.replaceState(null, '', `/map${search}`);
}

function currentAddress() {
  return `${window.location.pathname}${window.location.search}`;
}

beforeEach(() => {
  sessionStorage.clear();
  setAddress('');
});

afterEach(() => {
  sessionStorage.clear();
});

describe('pendingStarterCard', () => {
  it('gibt null zurück, wenn kein Träger etwas hält', () => {
    expect(takePendingStarterCard()).toBeNull();
  });

  /* Träger 1 — Google. Das Popup bleibt im selben Dokument, der
     sessionStorage überlebt den Weg. */
  it('trägt die Karte über den sessionStorage und räumt ihn beim Abholen', () => {
    rememberPendingStarterCard('me-42');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeTruthy();

    expect(takePendingStarterCard()).toBe('me-42');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    // Einmal und nicht wieder.
    expect(takePendingStarterCard()).toBeNull();
  });

  /* Träger 2 — Magic-Link. Der Link öffnet routinemäßig in einem anderen
     Browser; dort ist der sessionStorage leer, nur die Adresse überlebt. */
  it('liest die Karte aus der Adresse und nimmt den Marker dort heraus', () => {
    setAddress('?r=sofi&starter=me-7');

    expect(takePendingStarterCard()).toBe('me-7');
    // Der Marker verlässt die Adresszeile — ein geteilter Link soll dem
    // Empfänger keine fremde Absicht unterschieben.
    expect(currentAddress()).toBe('/map?r=sofi');
  });

  it('lässt eine Adresse ohne weitere Parameter ohne Fragezeichen zurück', () => {
    setAddress('?starter=me-7');
    expect(takePendingStarterCard()).toBe('me-7');
    expect(currentAddress()).toBe('/map');
  });

  it('räumt beide Träger, auch wenn schon die Adresse trägt', () => {
    // Gleicher Browser: das Modal setzt den Marker in die Continue-URL UND
    // in den sessionStorage. Bliebe der Rest liegen, löste ein späterer
    // Aufruf ihn ein zweites Mal ein.
    rememberPendingStarterCard('me-storage');
    setAddress('?starter=me-url');

    expect(takePendingStarterCard()).toBe('me-url');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(takePendingStarterCard()).toBeNull();
  });

  it('vergisst die Karte nach zehn Minuten', () => {
    // Wer das Modal wegklickt und später über das Burger-Menü kommt, bekommt
    // sein Pack wie jeder andere — zufällig.
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: 'me-alt', at: Date.now() - TTL_MS - 1 })
    );
    expect(takePendingStarterCard()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('hält eine Karte, die knapp innerhalb der Frist liegt', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: 'me-frisch', at: Date.now() - (TTL_MS - 5_000) })
    );
    expect(takePendingStarterCard()).toBe('me-frisch');
  });

  it('verschluckt sich nicht an kaputtem Inhalt', () => {
    sessionStorage.setItem(STORAGE_KEY, '{nicht json');
    expect(takePendingStarterCard()).toBeNull();

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 42, at: Date.now() }));
    expect(takePendingStarterCard()).toBeNull();

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 'me-1' }));
    expect(takePendingStarterCard()).toBeNull();
  });
});
