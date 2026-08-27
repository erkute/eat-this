import { describe, expect, it } from 'vitest';
import type { MapMustEat } from '@/lib/types';
import type { InitialMapData } from './server-initial-map-data';
import { selectHomeInitialMapData, selectInitialMustEatsData } from './initial-surface-data';

/** Nine must-eats, each at its own restaurant unless `restaurantId` says so. */
function mapData(): InitialMapData {
  const mustEats = Array.from({ length: 9 }, (_, index) => ({
    _id: `must-eat-${index + 1}`,
    restaurant: { _id: `restaurant-${index + 1}` },
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

    expect(selectInitialMustEatsData(data)).toEqual({
      mustEats: data.mustEats,
      revealedMustEatIds: data.revealedMustEatIds,
    });
  });
});
