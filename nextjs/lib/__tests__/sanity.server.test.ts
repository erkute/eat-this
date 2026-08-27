import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../sanity', () => ({
  client: { fetch: vi.fn() },
}));

import { client } from '../sanity';
import { SANITY_REVALIDATE_SECONDS } from '../constants';
import {
  getAllRestaurantSlugs,
  getArticleBySlug,
  getAllArticleSlugs,
  getStaticPage,
  getRestaurantPageData,
} from '../sanity.server';

const mockFetch = vi.mocked(client.fetch);

describe('getAllRestaurantSlugs', () => {
  it('returns flat array of strings', async () => {
    mockFetch.mockResolvedValue([{ slug: 'ramen-place' }, { slug: 'pizza-spot' }] as never);
    expect(await getAllRestaurantSlugs()).toEqual(['ramen-place', 'pizza-spot']);
  });

  it('returns empty array when no results', async () => {
    mockFetch.mockResolvedValue([] as never);
    expect(await getAllRestaurantSlugs()).toEqual([]);
  });
});

describe('getArticleBySlug', () => {
  it('returns article when found', async () => {
    const mock = { _id: 'x1', slug: 'best-ramen', title: 'Best Ramen', date: '2026-01-01' };
    mockFetch.mockResolvedValue(mock as never);
    expect(await getArticleBySlug('best-ramen')).toEqual(mock);
  });

  it('returns null when not found', async () => {
    mockFetch.mockResolvedValue(null as never);
    expect(await getArticleBySlug('nope')).toBeNull();
  });
});

describe('getAllArticleSlugs', () => {
  it('returns flat array of strings', async () => {
    mockFetch.mockResolvedValue([{ slug: 'article-1' }] as never);
    expect(await getAllArticleSlugs()).toEqual(['article-1']);
  });
});

describe('getStaticPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests only the selected slug and locale', async () => {
    const mock = { slug: 'about', title: 'Über uns', body: [] };
    mockFetch.mockResolvedValue(mock as never);

    expect(await getStaticPage('about', 'de')).toEqual(mock);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('$locale == "de"'),
      { slug: 'about', locale: 'de' },
      {
        next: {
          revalidate: SANITY_REVALIDATE_SECONDS,
          tags: ['staticPage:about', 'staticPage'],
        },
      }
    );
  });

  it('returns null when the page does not exist', async () => {
    mockFetch.mockResolvedValue(null as never);
    expect(await getStaticPage('missing', 'en')).toBeNull();
  });
});

describe('getRestaurantPageData', () => {
  beforeEach(() => vi.clearAllMocks());

  const row = {
    _id: 'abc',
    name: 'Ramen Place',
    slug: 'ramen-place',
    mustEats: [{ _id: 'm1', order: 1 }],
    siblingsAfter: [{ _id: 'b1', name: 'B1', slug: 'b1' }],
    siblingsWrap: [
      { _id: 'b2', name: 'B2', slug: 'b2' },
      { _id: 'b3', name: 'B3', slug: 'b3' },
      { _id: 'b4', name: 'B4', slug: 'b4' },
      { _id: 'b5', name: 'B5', slug: 'b5' },
    ],
  };

  it('splits one response into document, Must-Eats and a bounded sibling window', async () => {
    mockFetch.mockResolvedValue(row as never);

    const result = await getRestaurantPageData('ramen-place');

    expect(result?.restaurant).toEqual({ _id: 'abc', name: 'Ramen Place', slug: 'ramen-place' });
    expect(result?.mustEats).toEqual([{ _id: 'm1', order: 1 }]);
    // tail + wrap, gekappt auf vier
    expect(result?.siblings.map((r) => r.slug)).toEqual(['b1', 'b2', 'b3', 'b4']);
  });

  // Der eigentliche Zweck der Zusammenlegung. Bricht dieser Test, kostet jede
  // der 932 vorgerenderten Restaurant-Seiten wieder drei Anfragen statt einer.
  it('makes exactly one request, carrying the union of the three old tag sets', async () => {
    mockFetch.mockResolvedValue(row as never);

    await getRestaurantPageData('ramen-place');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [query, params, options] = mockFetch.mock.calls[0];
    expect(query).toContain('"mustEats"');
    expect(query).toContain('"siblingsAfter"');
    expect(query).toContain('"siblingsWrap"');
    expect(params).toEqual({ slug: 'ramen-place', siblingLimit: 4 });
    expect(options).toMatchObject({
      next: {
        revalidate: SANITY_REVALIDATE_SECONDS,
        tags: ['restaurant:ramen-place', 'restaurant', 'mustEat', 'restaurant-siblings'],
      },
    });
  });

  // Die Kategorie-Hälfte der Sibling-Abfrage ist am 24.08.2026 mit der zweiten
  // Empfehlungszeile weggefallen. Der Test hält fest, dass sie nicht
  // zurückkommt: sie kostete auf jeder Seite zwei weitere GROQ-Fenster.
  it('no longer fetches a category window', async () => {
    mockFetch.mockResolvedValue(row as never);

    await getRestaurantPageData('ramen-place');

    const [query, params] = mockFetch.mock.calls[0];
    expect(query).not.toContain('categoryAfter');
    expect(query).not.toContain('categoryWrap');
    expect(params).not.toHaveProperty('categorySlug');
    expect(params).not.toHaveProperty('categoryLimit');
  });

  it('returns null when the slug does not resolve', async () => {
    mockFetch.mockResolvedValue(null as never);
    expect(await getRestaurantPageData('unknown')).toBeNull();
  });

  it('tolerates a document with neither Must-Eats nor siblings', async () => {
    mockFetch.mockResolvedValue({ _id: 'x', name: 'Solo', slug: 'solo' } as never);

    const result = await getRestaurantPageData('solo');

    expect(result?.mustEats).toEqual([]);
    expect(result?.siblings).toEqual([]);
  });
});
