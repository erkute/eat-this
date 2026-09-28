import { describe, it, expect } from 'vitest';
import type { MapRestaurant } from '@/lib/types';
import { openFirst } from '../listOrder';

const spot = (name: string, openingHours?: MapRestaurant['openingHours']) =>
  ({ _id: name, name, openingHours }) as MapRestaurant;

// Montag, 20.04.2026, 09:00 — die Stunde aus dem Audit: fast alles zu.
const MON_9AM = new Date('2026-04-20T09:00:00');

describe('openFirst', () => {
  const bakery = spot('Bäckerei', [{ days: 'Mo–Sa', hours: '07:00–18:00' }]);
  const dinner = spot('Dinner', [{ days: 'Mo–Sa', hours: '18:00–23:00' }]);
  const bar = spot('Bar', [{ days: 'So–Sa', hours: '20:00–03:00' }]);
  const unknown = spot('Ohne Zeiten');

  it('stellt Geöffnetes vor Geschlossenes und behält sonst die Reihenfolge', () => {
    const cafe = spot('Café', [{ days: 'Mo–Fr', hours: '08:00–16:00' }]);
    expect(openFirst([dinner, bakery, unknown, cafe], MON_9AM).map((r) => r.name)).toEqual([
      'Bäckerei',
      'Café',
      'Dinner',
      'Ohne Zeiten',
    ]);
  });

  it('zählt einen Spot ohne Öffnungszeiten zu den geschlossenen', () => {
    expect(openFirst([unknown, bakery], MON_9AM).map((r) => r.name)).toEqual([
      'Bäckerei',
      'Ohne Zeiten',
    ]);
  });

  it('kennt die Nachtschicht vom Vortag', () => {
    const monday1am = new Date('2026-04-20T01:00:00');
    expect(openFirst([bakery, bar], monday1am).map((r) => r.name)).toEqual(['Bar', 'Bäckerei']);
  });

  it('verändert die Eingabe nicht', () => {
    const list = [dinner, bakery];
    openFirst(list, MON_9AM);
    expect(list.map((r) => r.name)).toEqual(['Dinner', 'Bäckerei']);
  });
});
