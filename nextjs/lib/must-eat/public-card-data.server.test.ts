import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapMustEat } from '@/lib/types';
vi.mock('server-only', () => ({}));
const catalog = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/map/cached-sanity', () => ({ getCachedMapData: catalog.get }));
import { getInitialSpotMustEatData } from './public-card-data.server';

describe('public spot card data', () => {
  beforeEach(() => catalog.get.mockReset());
  it('skips catalogue loading for a spot without cards', async () => {
    expect((await getInitialSpotMustEatData([])).mustEats).toEqual([]);
    expect(catalog.get).not.toHaveBeenCalled();
  });
  it('includes only this spot’s cards and strips covered content', async () => {
    const restaurant = { _id: 'spot', name: 'SOFI', slug: 'sofi', lat: 0, lng: 0 };
    catalog.get.mockResolvedValue({ mustEats: [
      { _id: 'open/card', restaurant, previewCategory: 'bread' },
      { _id: 'covered', restaurant, dish: 'PRIVATE_DISH', image: 'PRIVATE_IMAGE' },
      { _id: 'elsewhere', restaurant, previewCategory: 'coffee' },
    ] satisfies MapMustEat[] });
    const result = await getInitialSpotMustEatData(['open/card', 'covered']);
    expect(result.mustEats.map(card => card._id)).toEqual(['open/card', 'covered']);
    expect(result.revealedMustEatIds).toEqual(['open/card']);
    expect(result.mustEats[0].image).toBe('/api/must-eat-image/open%2Fcard');
    expect(JSON.stringify(result)).not.toContain('PRIVATE_');
  });
});
