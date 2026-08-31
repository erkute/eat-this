import { describe, expect, it } from 'vitest';
import type { MapMustEat } from '@/lib/types';
import type { InitialMapData } from './server-initial-map-data';
import { selectHomeInitialMapData, selectMustEatsCatalog } from './initial-surface-data';

/** Nine must-eats, each at its own restaurant unless `restaurantId` says so. */
function mapData(): InitialMapData {
  const mustEats = Array.from({ length: 9 }, (_, index) => ({
    _id: `must-eat-${index + 1}`,
    restaurant: { _id: `restaurant-${index + 1}`, name: `Spot ${index + 1}` },
  })) as MapMustEat[];

  return {
    restaurants: [],
    lockedRestaurants: [],
    mustEats,
    categories: [],
    totalCount: 42,
    revealedMustEatIds: [
      'must-eat-1',
      'must-eat-2',
      'must-eat-3',
      'must-eat-4',
      'must-eat-5',
      'must-eat-6',
      'must-eat-8',
    ],
  };
}

describe('initial surface data selectors', () => {
  it('keeps both face-up and face-down Must Eats for the home teaser', () => {
    const data = mapData();
    data.lockedRestaurants = [{ _id: 'locked' }] as InitialMapData['lockedRestaurants'];
    data.categories = [{ slug: 'pizza' }] as InitialMapData['categories'];

    const selected = selectHomeInitialMapData(data);

    // Two face-up, then whatever is covered (7 and 9 here). The teaser row is
    // mostly face-down, so filtering the covered ones out left it unable to
    // show the card mechanic at all.
    expect(selected.mustEats.map(({ _id }) => _id)).toEqual([
      'must-eat-1',
      'must-eat-2',
      'must-eat-7',
      'must-eat-9',
    ]);
    expect(selected.lockedRestaurants).toEqual([]);
    expect(selected.categories).toEqual([]);
    expect(selected.restaurants).toBe(data.restaurants);
    expect(selected.revealedMustEatIds).toBe(data.revealedMustEatIds);
    expect(data.mustEats).toHaveLength(9);
  });

  it('caps the face-down cards at four', () => {
    const data = mapData();
    data.revealedMustEatIds = ['must-eat-1', 'must-eat-2'];

    const selected = selectHomeInitialMapData(data);

    expect(selected.mustEats.map(({ _id }) => _id)).toEqual([
      'must-eat-1',
      'must-eat-2',
      'must-eat-3',
      'must-eat-4',
      'must-eat-5',
      'must-eat-6',
    ]);
  });

  it('takes at most one card per restaurant', () => {
    const data = mapData();
    // Every tile shows its restaurant's name, so a second card from the same
    // place reads as a duplicate row entry.
    data.mustEats = data.mustEats.map((mustEat) => ({
      ...mustEat,
      restaurant: { ...mustEat.restaurant, _id: 'restaurant-1' },
    }));

    const selected = selectHomeInitialMapData(data);

    expect(selected.mustEats.map(({ _id }) => _id)).toEqual(['must-eat-1']);
  });

  it('keeps only catalog fields for the Must-Eats page', () => {
    const data = mapData();

    expect(selectMustEatsCatalog(data, data.mustEats).revealedMustEatIds).toBe(
      data.revealedMustEatIds
    );
    expect(Object.keys(selectMustEatsCatalog(data, data.mustEats)).sort()).toEqual([
      'mustEats',
      'revealedMustEatIds',
    ]);
  });

  it('adds the must-eats the map hides, and keeps the authorized copy of the rest', () => {
    const data = mapData();
    // The map ships a must-eat only when its spot is inside the free tier —
    // /must-eats is the complete deck, so the hidden ones have to join.
    data.mustEats = data.mustEats.slice(0, 3).map((m) => ({ ...m, dish: `Dish ${m._id}` }));
    const catalog = mapData().mustEats;

    const selected = selectMustEatsCatalog(data, catalog);

    expect(selected.mustEats).toHaveLength(9);
    // must-eat-1..3 are face-up AND in the anon payload, so they keep `dish`.
    expect(selected.mustEats.filter((m) => m.dish).map(({ _id }) => _id)).toEqual([
      'must-eat-1',
      'must-eat-2',
      'must-eat-3',
    ]);
    // 4, 5, 6 and 8 are face-up too, but only the catalog carries them.
    expect(selected.mustEats.find((m) => m._id === 'must-eat-4')?.dish).toBeUndefined();
  });

  it('strips a covered card down to its spot name', () => {
    const data = mapData();
    data.revealedMustEatIds = ['must-eat-1'];
    const catalog = data.mustEats.map((m) => ({
      ...m,
      restaurant: { ...m.restaurant, address: 'Testallee 1', photo: 'https://cdn/x.png' },
    }));

    const selected = selectMustEatsCatalog({ ...data, mustEats: catalog }, catalog);

    // The face-up card keeps everything; a covered one renders only its spot
    // name, and this page reaches spots the map leaves out entirely.
    expect(selected.mustEats[0].restaurant.address).toBe('Testallee 1');
    expect(selected.mustEats[1].restaurant.address).toBeUndefined();
    expect(selected.mustEats[1].restaurant.photo).toBeUndefined();
    expect(selected.mustEats[1].restaurant.name).toBe('Spot 2');
  });

  it('orders face-up cards first, then the covered ones by spot name', () => {
    const data = mapData();
    data.revealedMustEatIds = ['must-eat-3', 'must-eat-1'];
    const catalog = data.mustEats.map((m, index) => ({
      ...m,
      order: 100 - index,
      restaurant: { ...m.restaurant, name: `Spot ${'ihgfedcba'[index]}` },
    }));

    const selected = selectMustEatsCatalog({ ...data, mustEats: catalog }, catalog);
    const ids = selected.mustEats.map(({ _id }) => _id);

    // Face-up first, by card number (must-eat-3 has the lower `order`).
    expect(ids.slice(0, 2)).toEqual(['must-eat-3', 'must-eat-1']);
    // Then the covered ones alphabetically by spot: a=9, b=8, … skipping 3/1.
    expect(ids.slice(2)).toEqual([
      'must-eat-9',
      'must-eat-8',
      'must-eat-7',
      'must-eat-6',
      'must-eat-5',
      'must-eat-4',
      'must-eat-2',
    ]);
  });
});
