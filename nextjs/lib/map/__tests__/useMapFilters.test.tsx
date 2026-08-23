// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MapRestaurant } from '@/lib/types';
import { useMapFilters } from '../useMapFilters';

/**
 * The picker counts. Before them both lists were built from the whole
 * catalogue with nothing said about what any row would return: a Bezirk
 * holding five spots still offered every cuisine in Berlin, and eighteen of
 * those rows were guaranteed zeroes you only discovered by tapping.
 *
 * What has to hold: each row is counted against the OTHER chips, and its own
 * chip is lifted while counting — otherwise picking "Neukölln" would make
 * every district but Neukölln read 0 and the picker would be useless for
 * switching.
 */

let nextId = 0;
function spot(partial: Partial<MapRestaurant>): MapRestaurant {
  nextId += 1;
  return {
    _id: `r${nextId}`,
    _createdAt: '2026-01-01',
    name: `Spot ${nextId}`,
    slug: `spot-${nextId}`,
    isClosed: false,
    lat: 52.5,
    lng: 13.4,
    mustEatCount: 0,
    ...partial,
  } as MapRestaurant;
}

const ROWS: MapRestaurant[] = [
  spot({
    bezirk: { name: 'Mitte' },
    cuisineType: 'Italian',
    categories: [{ name: 'Pizza', slug: 'pizza' }],
  }),
  spot({
    bezirk: { name: 'Mitte' },
    cuisineType: 'Italian',
    categories: [{ name: 'Dinner', slug: 'dinner' }],
  }),
  spot({
    bezirk: { name: 'Mitte' },
    cuisineType: 'Thai',
    categories: [{ name: 'Dinner', slug: 'dinner' }],
  }),
  spot({
    bezirk: { name: 'Neukölln' },
    cuisineType: 'Thai',
    categories: [{ name: 'Pizza', slug: 'pizza' }],
  }),
  spot({
    bezirk: { name: 'Wedding' },
    cuisineType: 'Peruvian',
    categories: [{ name: 'Dinner', slug: 'dinner' }],
  }),
] as MapRestaurant[];

function mount() {
  return renderHook(() => useMapFilters({ restaurants: ROWS, location: null }));
}

describe('useMapFilters option counts', () => {
  it('counts every row of an untouched picker', () => {
    const { result } = mount();
    const { byValue, withoutDimension } = result.current.optionCounts;

    expect(byValue.bezirk.get('Mitte')).toBe(3);
    expect(byValue.bezirk.get('Neukölln')).toBe(1);
    expect(byValue.cuisine.get('Italian')).toBe(2);
    expect(byValue.category.get('dinner')).toBe(3);
    expect(withoutDimension.bezirk).toBe(5);
  });

  it('narrows the other pickers once a chip is set', () => {
    const { result } = mount();
    act(() => result.current.setBezirk('Mitte'));

    const { byValue, withoutDimension } = result.current.optionCounts;
    // Mitte holds two Italians and one Thai, and no Peruvian at all — the row
    // that used to look identical to the rest.
    expect(byValue.cuisine.get('Italian')).toBe(2);
    expect(byValue.cuisine.get('Thai')).toBe(1);
    expect(byValue.cuisine.get('Peruvian')).toBeUndefined();
    expect(withoutDimension.cuisine).toBe(3);
  });

  it('lifts a pickers own chip so it can still be switched', () => {
    const { result } = mount();
    act(() => result.current.setBezirk('Mitte'));

    // Counted with the Bezirk chip lifted: every district keeps its own total,
    // or the Bezirk picker would read 3 / 0 / 0 and offer no way out of Mitte.
    const { byValue, withoutDimension } = result.current.optionCounts;
    expect(byValue.bezirk.get('Mitte')).toBe(3);
    expect(byValue.bezirk.get('Neukölln')).toBe(1);
    expect(byValue.bezirk.get('Wedding')).toBe(1);
    expect(withoutDimension.bezirk).toBe(5);
  });

  it('combines the remaining chips', () => {
    const { result } = mount();
    act(() => result.current.setBezirk('Mitte'));
    act(() => result.current.setCategory('dinner'));

    // Mitte + dinner = the Italian one and the Thai one.
    const { byValue } = result.current.optionCounts;
    expect(byValue.cuisine.get('Italian')).toBe(1);
    expect(byValue.cuisine.get('Thai')).toBe(1);
  });

  it('ignores the search box, which overrides the chips rather than narrowing them', () => {
    const { result } = mount();
    act(() => result.current.setSearch('zzz-nothing-matches'));

    // The list is empty under that query, but the counts describe what the
    // chips give once it is cleared — which is what the paused chip rail says.
    expect(result.current.displayedRestaurants).toHaveLength(0);
    expect(result.current.optionCounts.byValue.bezirk.get('Mitte')).toBe(3);
  });
});
