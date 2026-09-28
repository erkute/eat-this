import { describe, it, expect } from 'vitest';
import { DELISTED_RESTAURANT_REDIRECTS } from './delistedSpots';
import { GONE_SLUGS } from './legacyRedirects';

// The nine category hubs (kategorie/[slug]/page.tsx). A redirect into a hub
// that does not exist would trade a 404 for a redirect to a 404.
const CATEGORY_SLUGS = new Set([
  'breakfast',
  'coffee',
  'dinner',
  'drinks',
  'fast-food',
  'fine-dining',
  'lunch',
  'pizza',
  'sweets',
]);

describe('DELISTED_RESTAURANT_REDIRECTS', () => {
  const entries = Object.entries(DELISTED_RESTAURANT_REDIRECTS);

  it('sends every delisted spot to a hub or the map, never to another spot', () => {
    for (const [slug, target] of entries) {
      expect(target, slug).toMatch(/^\/(bezirk\/[a-z0-9-]+|kategorie\/[a-z0-9-]+|map)$/);
    }
  });

  it('only targets category hubs that exist', () => {
    for (const [slug, target] of entries) {
      const cat = target.match(/^\/kategorie\/(.+)$/)?.[1];
      if (cat) expect(CATEGORY_SLUGS.has(cat), `${slug} → ${target}`).toBe(true);
    }
  });

  it('leaves closed spots to the 410 in middleware', () => {
    for (const slug of GONE_SLUGS) expect(DELISTED_RESTAURANT_REDIRECTS[slug]).toBeUndefined();
  });

  it('keys are plain slugs, without locale or path', () => {
    for (const [slug] of entries) expect(slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
  });
});
