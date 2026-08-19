import { describe, it, expect } from 'vitest';
import { packContentsQuery, restaurantsByCategoryQuery } from '../queries';
import { mapRestaurantsQuery } from '../map/queries';
import { isRestaurantVisible } from '../firebase/entitlements';

/**
 * "52 Spots · 6 Must Eats" is a promise about what lands on the map after
 * paying. It holds only while `packContentsQuery` counts the same population
 * the map renders (`isOpen != false`) under the same rule that unlocks it
 * (`isRestaurantVisible`: any category on the restaurant matches). Either side
 * drifting turns the number on the pack card into a lie a buyer can check.
 */
describe('packContentsQuery', () => {
  it('counts the same population the map renders', () => {
    for (const q of [mapRestaurantsQuery, restaurantsByCategoryQuery, packContentsQuery]) {
      expect(q).toContain('isOpen != false');
    }
  });

  it('scopes Must Eats by their restaurant, which is what makes them visible', () => {
    expect(packContentsQuery).toContain('restaurantRef->isOpen != false');
  });

  it('matches a category against every category on the restaurant', () => {
    expect(packContentsQuery).toContain('^.slug.current in categories[]->slug.current');

    // The GROQ above mirrors this: one shared category is enough.
    const ent = {
      isAdmin: false,
      hasAllBerlin: false,
      restaurantIds: new Set<string>(),
      categorySlugs: new Set(['breakfast']),
    } as Parameters<typeof isRestaurantVisible>[1];
    const twoCategories = { _id: 'r1', categories: [{ slug: 'lunch' }, { slug: 'breakfast' }] };
    expect(isRestaurantVisible(twoCategories, ent)).toBe(true);
  });
});
