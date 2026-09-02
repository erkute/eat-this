import { describe, expect, it } from 'vitest';
import type { MapMustEat } from '@/lib/types';
import { freshestMustEat } from '../freshestMustEat';

const restaurant = { _id: 'r1', name: 'EIVGI´S', slug: 'eivgis', lat: 52.5, lng: 13.4 };
const stripped: MapMustEat = { _id: 'me1', order: 3, restaurant };
const full: MapMustEat = { ...stripped, dish: 'Falafel-Teller', image: '/api/must-eat-image/me1' };

describe('freshestMustEat', () => {
  it('swaps the opened stub for the hydrated card once the signed payload is in', () => {
    // Deep-Link auf eine verdeckt ausgelieferte Karte: geöffnet wurde der
    // Stummel aus dem SSR-Anon-View, die angemeldete Payload bringt das Gericht.
    expect(freshestMustEat([full], stripped)).toBe(full);
  });

  it('keeps the very object when the payload carries the same one', () => {
    // Referenzgleich, damit ein Effekt darauf keinen weiteren Render auslöst.
    expect(freshestMustEat([full], full)).toBe(full);
  });

  it('keeps what is open when the payload does not carry the card', () => {
    // Der anonyme Stand kennt nur 25 Karten; ein Deep-Link auf eine andere
    // darf das Geöffnete nicht auf null kippen.
    expect(freshestMustEat([], full)).toBe(full);
  });
});
