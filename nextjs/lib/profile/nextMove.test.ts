import { describe, expect, it } from 'vitest';
import type { MapMustEat } from '@/lib/types';
import { OUT_OF_TOWN_M, pickNextMove } from './nextMove';

/* Kottbusser Tor als Nullpunkt; die Spots liegen als Grad-Offsets drumherum,
   damit die Entfernungen ohne Kopfrechnen ordinal stimmen. */
const HERE = { lat: 52.4993, lng: 13.4181 };

function mustEat(
  id: string,
  district: string,
  opts: { lat?: number; lng?: number; faceUp?: boolean; order?: number } = {}
): MapMustEat {
  const base: MapMustEat = {
    _id: id,
    order: opts.order,
    restaurant: {
      _id: `r-${id}`,
      name: `Spot ${id}`,
      slug: `spot-${id}`,
      lat: opts.lat ?? HERE.lat,
      lng: opts.lng ?? HERE.lng,
      district,
    },
  };
  /* Eine aufgedeckte Karte traegt Bild und Gericht — genau daran erkennt
     `isAlbumMustEatCollected` sie, auch ohne Eintrag im faceUp-Set. */
  return opts.faceUp ? { ...base, dish: `Dish ${id}`, image: `/img/${id}` } : base;
}

const districtOf = (m: MapMustEat) => m.restaurant.district ?? 'Berlin';

function pick(mustEats: MapMustEat[], location: { lat: number; lng: number } | null = null) {
  return pickNextMove({ mustEats, faceUpIds: new Set<string>(), districtOf, location });
}

describe('pickNextMove', () => {
  it('bleibt still, wenn nichts mehr verdeckt ist', () => {
    expect(pick([mustEat('a', 'Mitte', { faceUp: true })])).toBeNull();
    expect(pick([])).toBeNull();
  });

  it('zaehlt eine Karte als offen, sobald das Deck sie so zeigt', () => {
    // Dasselbe Praedikat wie die Sammlung: ein Bild macht die Karte offen,
    // auch wenn sie in keinem faceUp-Set steht.
    const move = pickNextMove({
      mustEats: [mustEat('a', 'Mitte'), mustEat('b', 'Mitte')],
      faceUpIds: new Set(['a']),
      districtOf,
      location: null,
    });

    expect(move?.covered).toBe(1);
    expect(move?.target._id).toBe('b');
  });

  it('nimmt mit Standort den naechsten Spot und den Bezirk, in dem er liegt', () => {
    const move = pick(
      [
        // ~0.01 Grad Breite ≈ 1,1 km; ~0.05 ≈ 5,5 km.
        mustEat('fern', 'Wedding', { lat: HERE.lat + 0.05 }),
        mustEat('nah', 'Kreuzberg', { lat: HERE.lat + 0.001 }),
        mustEat('mittel', 'Wedding', { lat: HERE.lat + 0.04 }),
      ],
      HERE
    );

    expect(move?.target._id).toBe('nah');
    expect(move?.district).toBe('Kreuzberg');
    expect(move?.meters).toBeGreaterThan(0);
    expect(move?.meters).toBeLessThan(200);
  });

  /* Ein voller Bezirk am anderen Ende der Stadt ist kein naechster Zug —
     die Zahl neben dem Bezirksnamen muss die dortigen Karten zaehlen, nicht
     die groesste Gruppe der Sammlung. */
  it('zaehlt die verdeckten Karten des gewaehlten Bezirks, nicht die groesste Gruppe', () => {
    const move = pick(
      [
        mustEat('nah', 'Kreuzberg', { lat: HERE.lat + 0.001 }),
        mustEat('nah2', 'Kreuzberg', { lat: HERE.lat + 0.002 }),
        mustEat('w1', 'Wedding', { lat: HERE.lat + 0.05 }),
        mustEat('w2', 'Wedding', { lat: HERE.lat + 0.051 }),
        mustEat('w3', 'Wedding', { lat: HERE.lat + 0.052 }),
      ],
      HERE
    );

    expect(move?.district).toBe('Kreuzberg');
    expect(move?.covered).toBe(2);
  });

  it('waehlt ohne Standort den Bezirk mit den meisten verdeckten Karten', () => {
    const move = pick([
      mustEat('a', 'Mitte'),
      mustEat('b', 'Kreuzberg'),
      mustEat('c', 'Kreuzberg'),
    ]);

    expect(move?.district).toBe('Kreuzberg');
    expect(move?.covered).toBe(2);
    expect(move?.meters).toBeNull();
  });

  /* Sonst nennt dieselbe Sammlung bei jedem Aufruf einen anderen Bezirk —
     die Reihenfolge der Karten entscheidet sonst den Gleichstand. */
  it('entscheidet den Gleichstand ueber den Namen, nicht ueber die Reihenfolge', () => {
    const forwards = pick([mustEat('a', 'Wedding'), mustEat('b', 'Kreuzberg')]);
    const backwards = pick([mustEat('b', 'Kreuzberg'), mustEat('a', 'Wedding')]);

    expect(forwards?.district).toBe('Kreuzberg');
    expect(backwards?.district).toBe('Kreuzberg');
  });

  it('nimmt im gewaehlten Bezirk die vorderste Kartennummer', () => {
    const move = pick([
      mustEat('spaet', 'Mitte', { order: 9 }),
      mustEat('frueh', 'Mitte', { order: 2 }),
    ]);

    expect(move?.target._id).toBe('frueh');
  });

  /* „Das naechste 584 km von hier" ist keine Auskunft, sondern eine Absage. */
  it('verschweigt die Entfernung, wenn der Nutzer nicht in der Stadt steht', () => {
    const faraway = { lat: HERE.lat + 5, lng: HERE.lng };
    const move = pick(
      [mustEat('a', 'Mitte'), mustEat('b', 'Kreuzberg'), mustEat('c', 'Kreuzberg')],
      faraway
    );

    expect(move?.meters).toBeNull();
    // und faellt auf dieselbe Wahl zurueck wie ganz ohne Standort
    expect(move?.district).toBe('Kreuzberg');
    expect(move?.covered).toBe(2);
  });

  it('haelt den Schwellwert bei 30 km', () => {
    expect(OUT_OF_TOWN_M).toBe(30_000);
    // 0.2 Grad Breite ≈ 22 km — drin.
    const inside = pick([mustEat('a', 'Mitte', { lat: HERE.lat + 0.2 })], HERE);
    expect(inside?.meters).not.toBeNull();
    // 0.4 Grad ≈ 44 km — draussen.
    const outside = pick([mustEat('a', 'Mitte', { lat: HERE.lat + 0.4 })], HERE);
    expect(outside?.meters).toBeNull();
  });

  /* Ein Spot ohne Koordinaten ergibt NaN. Er darf nicht als „0 m" gewinnen. */
  it('laesst einen Spot ohne Koordinaten nicht den naechsten spielen', () => {
    const broken = mustEat('kaputt', 'Mitte');
    broken.restaurant.lat = Number.NaN;
    broken.restaurant.lng = Number.NaN;

    const move = pick([broken, mustEat('echt', 'Kreuzberg', { lat: HERE.lat + 0.001 })], HERE);

    expect(move?.target._id).toBe('echt');
  });
});
