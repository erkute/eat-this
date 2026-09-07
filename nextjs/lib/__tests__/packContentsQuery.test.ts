import { describe, it, expect } from 'vitest';
import { packContentsQuery, restaurantsByCategoryQuery } from '../queries';
import { mapRestaurantsQuery, mapMustEatsQuery } from '../map/queries';
import { ownsCategoryOf } from '../firebase/entitlements';

/**
 * "52 Spots · 6 Must Eats" is a promise about what lands on the map after
 * paying. It holds only while `packContentsQuery` counts the same population
 * the map renders (`isOpen != false`) under the same rule that hands the cards
 * over (`ownsCategoryOf`: any category on the restaurant matches). Either side
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

  /* Die Kontrollzahl: Map, Album, geteiltes Deck und Pack-Zahl muessen
     dieselbe Kartenmenge meinen. Ohne den Filter hier hing Karte 022
     (Crapulix) an einem geschlossenen Lokal — das Deck zeigte 26 Plaetze,
     All Berlin versprach 25, und der Platz war vor Ort nicht einloesbar. */
  it('drops a card whose spot is closed, exactly like the pack count does', () => {
    expect(mapMustEatsQuery).toContain('restaurantRef->isOpen != false');
    expect(mapMustEatsQuery).toContain('restaurantRef->isClosed != true');
  });

  it('matches a category against every category on the restaurant', () => {
    expect(packContentsQuery).toContain('^.slug.current in categories[]->slug.current');

    // The GROQ above mirrors this: one shared category is enough.
    const ent = { categorySlugs: new Set(['breakfast']) };
    const twoCategories = { _id: 'r1', categories: [{ slug: 'lunch' }, { slug: 'breakfast' }] };
    expect(ownsCategoryOf(twoCategories, ent)).toBe(true);
  });
});
