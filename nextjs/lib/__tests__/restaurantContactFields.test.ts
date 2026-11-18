import { describe, it, expect } from 'vitest';
import { articlesAboutRestaurant, restaurantPageQuery } from '../queries';
import { restaurantMapDetailQuery } from '../map/queries';

/**
 * The public /restaurant/[slug] page and the map detail sheet render the same
 * contact affordances but run two separate GROQ projections, which can drift (a
 * `phone` in one and not the other leaves a page without a call button).
 *
 * These assert the overlap that the UI depends on. They do not demand the
 * queries be identical: the page additionally carries SEO/editorial fields the
 * sheet has no use for.
 */
const CONTACT_FIELDS = [
  'address',
  'phone',
  'website',
  'menuUrl',
  'reservationUrl',
  'mapsUrl',
  'instagramHandle',
] as const;

describe('restaurant contact fields', () => {
  it.each(CONTACT_FIELDS)('the public page query selects %s', (field) => {
    expect(restaurantPageQuery).toMatch(new RegExp(`^\\s*${field},?\\s*$`, 'm'));
  });

  it.each(CONTACT_FIELDS)('the map detail query selects %s', (field) => {
    expect(restaurantMapDetailQuery).toMatch(new RegExp(`^\\s*${field},?\\s*$`, 'm'));
  });
});

describe('„Im Magazin" on both surfaces', () => {
  // Restaurant-Seite und Map-Sheet zeigen denselben Artikel-Block — dieselbe
  // Projektion, nicht zwei, die auseinanderlaufen können.
  it('both queries carry the same article projection', () => {
    expect(restaurantPageQuery).toContain(articlesAboutRestaurant);
    expect(restaurantMapDetailQuery).toContain(articlesAboutRestaurant);
  });
});
