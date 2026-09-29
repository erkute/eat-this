import { describe, it, expect } from 'vitest';
import type { MapRestaurant } from '@/lib/types';
import {
  buildSearchIndex,
  matchesSearch,
  normalizeForSearch,
  parseQuery,
  suggestSpots,
} from '../spotSearch';

const entryFor = (partial: Partial<MapRestaurant>) =>
  buildSearchIndex([{ _id: 'x', name: 'x', lat: 0, lng: 0, ...partial } as MapRestaurant], []).get('x')!;

describe('normalizeForSearch', () => {
  it('bringt alle Strassen-Schreibweisen auf eine Form', () => {
    for (const s of ['Weserstraße', 'Weserstrasse', 'Weserstr.', 'weserstr']) {
      expect(normalizeForSearch(s), s).toBe('weserstr');
    }
  });
});

describe('matchesSearch, Tippfehler-Durchgang', () => {
  const pizza = entryFor({ name: 'Standard Serious Pizza' });
  const hit = (q: string) => matchesSearch(pizza, parseQuery(q), true);

  it('verzeiht je Wort einen Buchstaben: ersetzt, fehlend, zu viel, vertauscht', () => {
    expect(hit('seroius')).toBe(true);
    expect(hit('piza')).toBe(true);
    expect(hit('pizzza')).toBe(true);
    expect(hit('pzizza')).toBe(true);
  });

  it('verzeiht keine zwei', () => {
    expect(hit('pazzo')).toBe(false);
    expect(hit('pasta')).toBe(false);
  });

  it('ist ohne den Rückfall exakt', () => {
    expect(matchesSearch(pizza, parseQuery('piza'))).toBe(false);
  });
});

describe('suggestSpots', () => {
  const spots = [
    { _id: 'a', name: 'Standard Serious Pizza', cuisineType: 'Italian' },
    { _id: 'b', name: 'Zola', cuisineType: 'Italian', bezirk: { name: 'Kreuzberg' } },
    { _id: 'c', name: 'Pizza Nostra', cuisineType: 'Italian' },
    { _id: 'd', name: 'Bonanza Coffee', cuisineType: 'Coffee' },
  ].map((r) => ({ lat: 0, lng: 0, ...r }) as MapRestaurant);
  const index = buildSearchIndex(spots, []);
  const ids = (q: string, opts?: Parameters<typeof suggestSpots>[3]) =>
    suggestSpots(spots, index, q, opts).map((r) => r._id);

  it('schlägt nichts vor, solange nichts getippt ist', () => {
    expect(ids('')).toEqual([]);
    expect(ids('   ')).toEqual([]);
  });

  it('stellt Namen, die mit dem Getippten anfangen, vor Treffer in anderen Feldern', () => {
    /* „pizza": beide Pizza-Namen vorn, nach Namen sortiert. */
    expect(ids('pizza')).toEqual(['c', 'a']);
    /* „kreuzberg" trifft nur den Bezirk. */
    expect(ids('kreuzberg')).toEqual(['b']);
  });

  it('fällt auf Tippfehler zurück, wenn exakt nichts passt', () => {
    expect(ids('bonanaza')).toEqual(['d']);
  });

  it('begrenzt die Zahl und hält sich an den Filter des Aufrufers', () => {
    expect(ids('italienisch', { limit: 2 })).toHaveLength(2);
    expect(ids('pizza', { keep: (r) => r._id !== 'c' })).toEqual(['a']);
  });
});

describe('Alltagswörter, die so an keinem Spot stehen', () => {
  const finds = (query: string, spot: Partial<MapRestaurant>) =>
    matchesSearch(entryFor(spot), parseQuery(query));

  it.each([
    ['Nudeln', { cuisineType: 'Italian' }],
    ['nudel', { cuisineType: 'Japanese / Ramen' }],
    ['noodles', { cuisineType: 'Italian' }],
    ['Pho', { cuisineType: 'Vietnamese' }],
    ['asiatisch', { cuisineType: 'Korean' }],
    ['asiatisch', { cuisineType: 'Thai' }],
    ['Currywurst', { cuisineType: 'German / Fast Food' }],
    ['Schnitzel', { cuisineType: 'Austrian' }],
    ['Falafel', { cuisineType: 'Israeli' }],
    ['Hummus', { cuisineType: 'Middle Eastern' }],
    ['Dumplings', { cuisineType: 'Chinese' }],
    ['Kuchen', { cuisineType: 'Bakery' }],
    ['Torte', { cuisineType: 'Desserts' }],
    ['Fleisch', { cuisineType: 'Steakhouse' }],
    ['Eiscafé', { cuisineType: 'Ice Cream' }],
    ['Mittagessen', { categories: [{ name: 'Lunch', nameEn: 'Lunch', slug: 'lunch' }] }],
    ['Abendessen', { categories: [{ name: 'Dinner', nameEn: 'Dinner', slug: 'dinner' }] }],
  ] as [string, Partial<MapRestaurant>][])('„%s" findet %o', (query, spot) => {
    expect(finds(query, spot)).toBe(true);
  });

  it('bleibt schmal: Nudeln holen keine Bäckerei, Asiatisch kein Italienisch', () => {
    expect(finds('nudeln', { cuisineType: 'Bakery' })).toBe(false);
    expect(finds('nudeln', { cuisineType: 'Italian / Pizza' })).toBe(false);
    expect(finds('asiatisch', { cuisineType: 'Italian' })).toBe(false);
  });
});
