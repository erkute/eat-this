import { describe, it, expect } from 'vitest';
import { restaurantBySlugQuery } from '../queries';
import { restaurantMapDetailQuery } from '../map/queries';

/**
 * The public /restaurant/[slug] page and the map detail sheet render the same
 * contact affordances but run two separate GROQ projections. They drifted:
 * `phone` was in the sheet's query only, so the page could not offer a call
 * button at all — and the comment above the sheet's query claimed the two were
 * already the same set.
 *
 * These assert the overlap that the UI depends on. They do NOT demand the
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
    expect(restaurantBySlugQuery).toMatch(new RegExp(`^\\s*${field},?\\s*$`, 'm'));
  });

  it.each(CONTACT_FIELDS)('the map detail query selects %s', (field) => {
    expect(restaurantMapDetailQuery).toMatch(new RegExp(`^\\s*${field},?\\s*$`, 'm'));
  });
});
