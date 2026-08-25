import { describe, it, expect } from 'vitest';
import { bezirkCategoryLinks, categoryDistrictLinks } from './crossLinks';
import type { RestaurantCard } from '../types';

function r(partial: Partial<RestaurantCard>): RestaurantCard {
  return { _id: Math.random().toString(36), name: 'x', slug: 'x', ...partial };
}

describe('categoryDistrictLinks', () => {
  it('returns distinct districts ranked by frequency, using the bezirk slug', () => {
    const restaurants = [
      r({ bezirk: { name: 'Mitte', slug: 'mitte' } }),
      r({ bezirk: { name: 'Mitte', slug: 'mitte' } }),
      r({ bezirk: { name: 'Neukölln', slug: 'neukoelln' } }),
    ];
    const links = categoryDistrictLinks(restaurants);
    expect(links.map((l) => l.slug)).toEqual(['mitte', 'neukoelln']);
    expect(links[0]).toEqual({ slug: 'mitte', label: 'Mitte', count: 2 });
  });

  it('skips restaurants without a bezirk slug', () => {
    const restaurants = [
      r({ district: 'Mitte' }), // district name but no bezirk ref → not linkable
      r({ bezirk: { name: 'Pankow', slug: 'pankow' } }),
    ];
    const links = categoryDistrictLinks(restaurants);
    expect(links.map((l) => l.slug)).toEqual(['pankow']);
  });
});

describe('bezirkCategoryLinks', () => {
  const lunch = { slug: 'lunch', name: 'Lunch', nameEn: 'Lunch' };
  const coffee = { slug: 'coffee', name: 'Kaffee', nameEn: 'Coffee' };

  it('ranks categories by frequency across the district', () => {
    const restaurants = [
      r({ categories: [lunch, coffee] }),
      r({ categories: [lunch] }),
      r({ categories: [lunch] }),
    ];
    const links = bezirkCategoryLinks(restaurants, 'de');
    expect(links.map((l) => l.slug)).toEqual(['lunch', 'coffee']);
    expect(links[0].count).toBe(3);
  });

  it('labels in the page locale but dedupes on the slug', () => {
    const restaurants = [r({ categories: [coffee] }), r({ categories: [coffee] })];
    expect(bezirkCategoryLinks(restaurants, 'de')[0].label).toBe('Kaffee');
    expect(bezirkCategoryLinks(restaurants, 'en')[0].label).toBe('Coffee');
    expect(bezirkCategoryLinks(restaurants, 'en')).toHaveLength(1);
  });

  it('survives restaurants without categories and entries without a slug', () => {
    const restaurants = [
      r({}),
      r({ categories: [] }),
      r({ categories: [{ slug: '', name: 'Kaputt' }] }),
      r({ categories: [lunch] }),
    ];
    expect(bezirkCategoryLinks(restaurants, 'de').map((l) => l.slug)).toEqual(['lunch']);
  });

  it('caps the row at the requested limit', () => {
    const restaurants = [
      r({
        categories: [lunch, coffee, { slug: 'pizza', name: 'Pizza' }],
      }),
    ];
    expect(bezirkCategoryLinks(restaurants, 'de', 2)).toHaveLength(2);
  });
});
