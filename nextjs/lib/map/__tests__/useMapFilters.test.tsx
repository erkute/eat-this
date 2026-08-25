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
 * switching. Paywalled spots count like every other spot: they stand in the
 * list too, so a number that left them out would predict the wrong list.
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

/* Behind the paywall: one more Peruvian in Wedding, two Italians in Mitte —
   and one Georgian, a cuisine the free set does not have at all. */
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
  spot({
    bezirk: { name: 'Neukölln' },
    cuisineType: 'Georgian',
    categories: [{ name: 'Dinner', slug: 'dinner' }],
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

    // 5 free + 4 locked spots, counted as one catalogue.
    expect(byValue.bezirk.get('Mitte')).toBe(5);
    expect(byValue.bezirk.get('Neukölln')).toBe(2);
    expect(byValue.cuisine.get('Italian')).toBe(4);
    expect(byValue.category.get('dinner')).toBe(5);
    expect(withoutDimension.bezirk).toBe(9);
  });

  it('narrows the other pickers once a chip is set', () => {
    const { result } = mount();
    act(() => result.current.setBezirk('Mitte'));

    const { byValue, withoutDimension } = result.current.optionCounts;
    // Mitte holds four Italians and one Thai, and no Peruvian at all — the row
    // that used to look identical to the rest.
    expect(byValue.cuisine.get('Italian')).toBe(4);
    expect(byValue.cuisine.get('Thai')).toBe(1);
    expect(byValue.cuisine.get('Peruvian')).toBeUndefined();
    expect(withoutDimension.cuisine).toBe(5);
  });

  it('lifts a pickers own chip so it can still be switched', () => {
    const { result } = mount();
    act(() => result.current.setBezirk('Mitte'));

    // Counted with the Bezirk chip lifted: every district keeps its own total,
    // or the Bezirk picker would read 3 / 0 / 0 and offer no way out of Mitte.
    const { byValue, withoutDimension } = result.current.optionCounts;
    expect(byValue.bezirk.get('Mitte')).toBe(5);
    expect(byValue.bezirk.get('Neukölln')).toBe(2);
    expect(byValue.bezirk.get('Wedding')).toBe(2);
    expect(withoutDimension.bezirk).toBe(9);
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
    expect(result.current.optionCounts.byValue.bezirk.get('Mitte')).toBe(5);
  });
});

/**
 * The paywalled half of the catalogue. It used to be invisible up here: the
 * pickers were built and counted from the free set alone, so a cuisine only
 * locked spots carry had no row at all, and a row whose every hit was locked
 * read 0 while the map underneath showed its dots.
 */
describe('useMapFilters with the paywalled spots in', () => {
  it('offers a cuisine that only locked spots carry', () => {
    const { result } = mount();

    expect(result.current.cuisineNames).toContain('Georgian');
    expect(result.current.optionCounts.byValue.cuisine.get('Georgian')).toBe(1);
  });

  it('still knows a real zero when it sees one', () => {
    const { result } = mount();
    act(() => result.current.setBezirk('Mitte'));

    // No Georgian in Mitte, free or locked: nothing to show, so the picker
    // stops offering the row.
    expect(result.current.optionCounts.byValue.cuisine.get('Georgian')).toBeUndefined();
  });

  it('hands the list every match and the map only the free ones', () => {
    const { result } = mount();
    act(() => result.current.setCuisine('Peruvian'));

    // One free Peruvian, one locked. The list shows both; the free set behind
    // the map's own markers keeps just the one.
    expect(result.current.displayedRestaurants).toHaveLength(1);
    expect(result.current.displayedLockedRestaurants).toHaveLength(1);
    expect(result.current.listRestaurants).toHaveLength(2);
  });

  it('has nothing extra to show someone who owns the whole map', () => {
    const { result } = renderHook(() => useMapFilters({ restaurants: ROWS, location: null }));

    expect(result.current.cuisineNames).not.toContain('Georgian');
    expect(result.current.listRestaurants).toHaveLength(ROWS.length);
  });
});

/**
 * The order of the list itself. It used to have none: it inherited the order
 * the map payload was assembled in — curated spots, the round-robin district
 * fill, and then whatever the home page surfaces, appended at the end. Tapping
 * a dish on the home page therefore landed you on the very last row of 340
 * when you closed it again.
 */
describe('useMapFilters list order', () => {
  const ROW_ZOLA = spot({ name: 'Zola', mustEatCount: 0 });
  const ROW_ADANA = spot({ name: 'Adana', mustEatCount: 0 });
  const ROW_MUSTAFA = spot({ name: 'Mustafa', mustEatCount: 2 });
  const LOCKED_BUNKER = spot({ name: 'Bunker', mustEatCount: 3 });

  it('leads with the spots carrying Must Eats, then goes alphabetical', () => {
    const { result } = renderHook(() =>
      useMapFilters({
        restaurants: [ROW_ZOLA, ROW_ADANA, ROW_MUSTAFA],
        lockedRestaurants: [LOCKED_BUNKER],
        location: null,
      })
    );

    // Bunker is paywalled and still first: one list, one rule.
    expect(result.current.listRestaurants.map((r) => r.name)).toEqual([
      'Bunker',
      'Mustafa',
      'Adana',
      'Zola',
    ]);
  });

  it('does not park an appended spot at the end', () => {
    // applyFreeSurface appends whatever the home page teases to the visible
    // set. That is a build step, not a ranking, and must not reach the list.
    const appended = spot({ name: 'Gazzo', mustEatCount: 1 });
    const { result } = renderHook(() =>
      useMapFilters({
        restaurants: [ROW_ZOLA, ROW_ADANA, ROW_MUSTAFA, appended],
        location: null,
      })
    );

    expect(result.current.listRestaurants.at(-1)?.name).not.toBe('Gazzo');
    expect(result.current.listRestaurants[1].name).toBe('Gazzo');
  });

  it('lets a location outrank everything', () => {
    const near = spot({ name: 'Zola', lat: 52.5, lng: 13.4, mustEatCount: 0 });
    const far = spot({ name: 'Mustafa', lat: 52.6, lng: 13.62, mustEatCount: 9 });
    const { result } = renderHook(() =>
      useMapFilters({ restaurants: [far, near], location: { lat: 52.5, lng: 13.4 } })
    );

    // Nine Must Eats do not beat standing in front of the door.
    expect(result.current.listRestaurants.map((r) => r.name)).toEqual(['Zola', 'Mustafa']);
  });
});
