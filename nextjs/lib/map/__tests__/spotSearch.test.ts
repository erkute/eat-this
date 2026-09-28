import { describe, it, expect } from 'vitest';
import type { MapRestaurant } from '@/lib/types';
import { buildSearchIndex, matchesSearch, normalizeForSearch, parseQuery } from '../spotSearch';

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
