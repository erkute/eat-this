import { describe, expect, it } from 'vitest';
import type { MapRestaurant } from '@/lib/types';
import {
  buildMapFilterIndex,
  isDefaultFilterState,
  MAP_FILTER_DEFAULTS,
  resolveMapFilterState,
  writeMapFilterParams,
} from '../mapFilterParams';

const rows: MapRestaurant[] = [
  {
    _id: 'r1',
    _createdAt: '2026-01-01T00:00:00Z',
    name: 'Slice Society',
    slug: 'slice-society',
    isClosed: false,
    lat: 52.52,
    lng: 13.405,
    bezirk: { name: 'Mitte', slug: 'mitte' },
    cuisineType: 'Italian',
    priceRange: { currency: 'EUR', min: 20, max: 30 },
    categories: [{ name: 'Pizza', slug: 'pizza' }],
    mustEatCount: 1,
  },
  {
    _id: 'r2',
    _createdAt: '2026-01-01T00:00:00Z',
    name: 'Nameless',
    slug: 'nameless',
    isClosed: false,
    lat: 52.49,
    lng: 13.42,
    // No slug — the district cannot round-trip through the URL.
    bezirk: { name: 'Friedenau' },
    cuisineType: 'German / Fast Food',
    mustEatCount: 0,
  },
] as MapRestaurant[];

const index = buildMapFilterIndex([rows]);

function urlFor(state: Parameters<typeof writeMapFilterParams>[1], existing = '') {
  const params = new URLSearchParams(existing);
  writeMapFilterParams(params, state, index);
  return params.toString();
}

describe('resolveMapFilterState', () => {
  it('returns the complete state, not just the params that are present', () => {
    expect(resolveMapFilterState('?cat=pizza', index)).toEqual({
      ...MAP_FILTER_DEFAULTS,
      category: 'pizza',
    });
  });

  it('resolves slugs case-insensitively and drops ones nothing matches', () => {
    expect(resolveMapFilterState('?bezirk=MITTE', index).bezirk).toBe('Mitte');
    expect(resolveMapFilterState('?bezirk=lichtenberg', index).bezirk).toBeNull();
    expect(resolveMapFilterState('?cat=nope', index).category).toBe('All');
    expect(resolveMapFilterState('?price=20', index).price).toBe('20');
    // Eine Stufe, die es nicht gibt, fällt weg statt durchzurutschen.
    expect(resolveMapFilterState('?price=teuer', index).price).toBeNull();
  });

  it('reads q verbatim and open only as 1', () => {
    expect(resolveMapFilterState('?q=Ramen%20Bar', index).search).toBe('Ramen Bar');
    expect(resolveMapFilterState('?open=1', index).openOnly).toBe(true);
    expect(resolveMapFilterState('?open=true', index).openOnly).toBe(false);
  });
});

describe('writeMapFilterParams', () => {
  it('round-trips every filter through the URL', () => {
    const state = {
      category: 'pizza',
      bezirk: 'Mitte',
      price: '20',
      search: 'Ramen',
      openOnly: true,
    };
    expect(resolveMapFilterState(`?${urlFor(state)}`, index)).toEqual(state);
  });

  it('omits defaults so the clean /map URL stays the shareable one', () => {
    expect(urlFor(MAP_FILTER_DEFAULTS)).toBe('');
  });

  it('leaves ?r= alone and clears filters it no longer holds', () => {
    const qs = urlFor(MAP_FILTER_DEFAULTS, 'r=slice-society&cat=pizza&q=ramen');
    expect(qs).toBe('r=slice-society');
  });

  it('drops a district with no slug rather than writing a link that loses it', () => {
    expect(urlFor({ ...MAP_FILTER_DEFAULTS, bezirk: 'Friedenau' })).toBe('');
  });
});

describe('isDefaultFilterState', () => {
  it('separates an untouched map from every single active filter', () => {
    expect(isDefaultFilterState(MAP_FILTER_DEFAULTS)).toBe(true);
    expect(isDefaultFilterState({ ...MAP_FILTER_DEFAULTS, openOnly: true })).toBe(false);
    expect(isDefaultFilterState({ ...MAP_FILTER_DEFAULTS, search: 'x' })).toBe(false);
    expect(isDefaultFilterState({ ...MAP_FILTER_DEFAULTS, category: 'pizza' })).toBe(false);
  });
});
