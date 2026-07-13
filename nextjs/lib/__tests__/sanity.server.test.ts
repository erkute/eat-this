import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../sanity', () => ({
  client: { fetch: vi.fn() },
}))

import { client } from '../sanity'
import {
  getRestaurantBySlug,
  getAllRestaurantSlugs,
  getArticleBySlug,
  getAllArticleSlugs,
  getStaticPage,
  getRestaurantSiblingCandidates,
} from '../sanity.server'

const mockFetch = vi.mocked(client.fetch)

describe('getRestaurantBySlug', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns restaurant when found', async () => {
    const mock = { _id: 'abc', name: 'Ramen Place', slug: 'ramen-place', lat: 52.5, lng: 13.4 }
    mockFetch.mockResolvedValue(mock as never)

    const result = await getRestaurantBySlug('ramen-place')
    expect(result).toEqual(mock)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('restaurant'),
      { slug: 'ramen-place' },
      expect.objectContaining({ next: expect.objectContaining({ revalidate: 3600 }) })
    )
  })

  it('returns null when not found', async () => {
    mockFetch.mockResolvedValue(null as never)
    expect(await getRestaurantBySlug('unknown')).toBeNull()
  })
})

describe('getAllRestaurantSlugs', () => {
  it('returns flat array of strings', async () => {
    mockFetch.mockResolvedValue([{ slug: 'ramen-place' }, { slug: 'pizza-spot' }] as never)
    expect(await getAllRestaurantSlugs()).toEqual(['ramen-place', 'pizza-spot'])
  })

  it('returns empty array when no results', async () => {
    mockFetch.mockResolvedValue([] as never)
    expect(await getAllRestaurantSlugs()).toEqual([])
  })
})

describe('getArticleBySlug', () => {
  it('returns article when found', async () => {
    const mock = { _id: 'x1', slug: 'best-ramen', title: 'Best Ramen', date: '2026-01-01' }
    mockFetch.mockResolvedValue(mock as never)
    expect(await getArticleBySlug('best-ramen')).toEqual(mock)
  })

  it('returns null when not found', async () => {
    mockFetch.mockResolvedValue(null as never)
    expect(await getArticleBySlug('nope')).toBeNull()
  })
})

describe('getAllArticleSlugs', () => {
  it('returns flat array of strings', async () => {
    mockFetch.mockResolvedValue([{ slug: 'article-1' }] as never)
    expect(await getAllArticleSlugs()).toEqual(['article-1'])
  })
})

describe('getStaticPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requests only the selected slug and locale', async () => {
    const mock = { slug: 'about', title: 'Über uns', body: [] }
    mockFetch.mockResolvedValue(mock as never)

    expect(await getStaticPage('about', 'de')).toEqual(mock)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('$locale == "de"'),
      { slug: 'about', locale: 'de' },
      {
        next: {
          revalidate: 3600,
          tags: ['staticPage:about', 'staticPage'],
        },
      }
    )
  })

  it('returns null when the page does not exist', async () => {
    mockFetch.mockResolvedValue(null as never)
    expect(await getStaticPage('missing', 'en')).toBeNull()
  })
})

describe('getRestaurantSiblingCandidates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns bounded tail + wrap windows from one card-only query', async () => {
    mockFetch.mockResolvedValue({
      bezirkAfter: [{ _id: 'b1', name: 'B1', slug: 'b1' }],
      bezirkWrap: [
        { _id: 'b2', name: 'B2', slug: 'b2' },
        { _id: 'b3', name: 'B3', slug: 'b3' },
        { _id: 'b4', name: 'B4', slug: 'b4' },
      ],
      categoryAfter: [
        { _id: 'c1', name: 'C1', slug: 'c1' },
        { _id: 'c2', name: 'C2', slug: 'c2' },
      ],
      categoryWrap: [{ _id: 'c3', name: 'C3', slug: 'c3' }],
    } as never)

    const result = await getRestaurantSiblingCandidates({
      selfSlug: 'self',
      selfName: 'Self',
      bezirkSlug: 'mitte',
      categorySlug: 'dinner',
      bezirkLimit: 3,
      categoryLimit: 6,
    })

    expect(result.bezirk.map((row) => row.slug)).toEqual(['b1', 'b2', 'b3'])
    expect(result.category.map((row) => row.slug)).toEqual(['c1', 'c2', 'c3'])
    expect(mockFetch).toHaveBeenCalledOnce()

    const [query, params, options] = mockFetch.mock.calls[0]
    expect(query).toContain('[0...$bezirkLimit]')
    expect(query).toContain('[0...$categoryLimit]')
    expect(query).not.toContain('shortDescription')
    expect(params).toEqual({
      selfSlug: 'self',
      selfName: 'Self',
      bezirkSlug: 'mitte',
      categorySlug: 'dinner',
      bezirkLimit: 3,
      categoryLimit: 6,
    })
    expect(options).toMatchObject({
      next: {
        revalidate: 3600,
        tags: ['restaurant-siblings', 'bezirk:mitte', 'category:dinner'],
      },
    })
  })
})
