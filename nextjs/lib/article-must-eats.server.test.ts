import { describe, expect, it, vi } from 'vitest';
import type { MapMustEat, NewsArticle } from './types';
vi.mock('server-only', () => ({}));
const catalog = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./map/cached-sanity', () => ({ getCachedMustEatsForPage: catalog.get }));
import { prepareArticleMustEats } from './article-must-eats.server';

describe('article must eat server preparation', () => {
  it('uses public metadata and protected image URLs without private content reads', async () => {
    const restaurant = { _id: 'spot', name: 'Gazzo', slug: 'gazzo' };
    catalog.get.mockResolvedValue([
      { _id: 'public-card', restaurant, previewCategory: 'pizza' },
      { _id: 'covered-card', restaurant, dish: 'PRIVATE_CLOSED', image: 'PRIVATE_CLOSED' },
    ] as MapMustEat[]);
    const article: NewsArticle = { _id: 'article', slug: 'gazzo', date: '2026-01-01', title: 'Gazzo: Pizza', content: [{ _type: 'block', children: [{ text: 'Pizza bei Gazzo.' }] }] };
    const result = await prepareArticleMustEats(article, 'en');
    expect(result.initialData?.revealedMustEatIds).toEqual(['public-card']);
    expect(result.initialData?.mustEats.find(m => m._id === 'public-card')?.image).toBe('/api/must-eat-image/public-card');
    expect(JSON.stringify(result.initialData)).not.toContain('PRIVATE_CLOSED');
    expect(result.article.content?.filter(b => b._type === 'mustEatCard')).toHaveLength(2);
  });
});
