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

/* Behind the paywall: one more Peruvian in Wedding and two Italians in Mitte.
   None of them are in ROWS — that is the point, they are what the free set
   cannot show. */
const LOCKED: MapRestaurant[] = [
  spot({
    bezirk: { name: 'Wedding' },
    cuisineType: 'Peruvian',
    categories: [{ name: 'Dinner', slug: 'dinner' }],
  }),
  spot({
    bezirk: { name: 'Mitte' },
    cuisineType: 'Italian',
    categories: [{ name: 'Pizza', slug: 'pizza' }],
  }),
  spot({
    bezirk: { name: 'Mitte' },
    cuisineType: 'Italian',
    categories: [{ name: 'Pizza', slug: 'pizza' }],
  }),
] as MapRestaurant[];

function mount() {
  return renderHook(() =>
    useMapFilters({ restaurants: ROWS, lockedRestaurants: LOCKED, location: null })
  );
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

/**
 * The same counts over the paywalled set. Without them a picker row reading 0
 * hid two different things — "there is nothing" and "everything there is sits
 * in a pack" — and both led to the same dead list.
 */
describe('useMapFilters locked option counts', () => {
  it('counts the locked set separately, never mixed into the free number', () => {
    const { result } = mount();
    const { byValue, lockedByValue } = result.current.optionCounts;

    // Free Italians stay 2 — the two locked ones must not inflate the number
    // the list is about to render.
    expect(byValue.cuisine.get('Italian')).toBe(2);
    expect(lockedByValue.cuisine.get('Italian')).toBe(2);
  });

  it('tells an offer from a dead end once a chip narrows the free set to nothing', () => {
    const { result } = mount();
    act(() => result.current.setBezirk('Mitte'));

    const { byValue, lockedByValue } = result.current.optionCounts;
    // Peruvian: no free spot in Mitte and no locked one either — nothing at
    // all, which is the only case the picker refuses to open.
    expect(byValue.cuisine.get('Peruvian')).toBeUndefined();
    expect(lockedByValue.cuisine.get('Peruvian')).toBeUndefined();
    // Wedding, on the other hand, holds a locked Peruvian.
    act(() => result.current.setBezirk('Wedding'));
    expect(result.current.optionCounts.byValue.cuisine.get('Peruvian')).toBe(1);
  });

  it('lifts the picker own chip on the locked side too', () => {
    const { result } = mount();
    act(() => result.current.setBezirk('Neukölln'));

    // Same rule as the free counts: the Bezirk picker keeps every district's
    // own locked total, or it could not offer a way out of Neukölln.
    const { lockedByValue, lockedWithoutDimension } = result.current.optionCounts;
    expect(lockedByValue.bezirk.get('Mitte')).toBe(2);
    expect(lockedByValue.bezirk.get('Wedding')).toBe(1);
    expect(lockedWithoutDimension.bezirk).toBe(3);
  });

  it('is empty for someone who owns the whole map', () => {
    // allBerlin users get no locked set at all — every row is then either a
    // real hit or a real dead end.
    const { result } = renderHook(() => useMapFilters({ restaurants: ROWS, location: null }));
    expect(result.current.optionCounts.lockedByValue.cuisine.size).toBe(0);
    expect(result.current.optionCounts.lockedWithoutDimension.cuisine).toBe(0);
  });
});
