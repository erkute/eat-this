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
} from '../sanity.server'

const mockFetch = vi.mocked(client.fetch)

describe('getRestaurantBySlug', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns restaurant when found', async () => {
    const mock = { _id: 'abc', name: 'Ramen Place', slug: 'ramen-place', lat: 52.5, lng: 13.4 }
    mockFetch.mockResolvedValue(mock)

    const result = await getRestaurantBySlug('ramen-place')
    expect(result).toEqual(mock)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('restaurant'),
      { slug: 'ramen-place' },
      expect.objectContaining({ next: expect.objectContaining({ revalidate: 3600 }) })
    )
  })

  it('returns null when not found', async () => {
    mockFetch.mockResolvedValue(null)
    expect(await getRestaurantBySlug('unknown')).toBeNull()
  })
})

describe('getAllRestaurantSlugs', () => {
  it('returns flat array of strings', async () => {
    mockFetch.mockResolvedValue([{ slug: 'ramen-place' }, { slug: 'pizza-spot' }])
    expect(await getAllRestaurantSlugs()).toEqual(['ramen-place', 'pizza-spot'])
  })

  it('returns empty array when no results', async () => {
    mockFetch.mockResolvedValue([])
    expect(await getAllRestaurantSlugs()).toEqual([])
  })
})

describe('getArticleBySlug', () => {
  it('returns article when found', async () => {
    const mock = { _id: 'x1', slug: 'best-ramen', title: 'Best Ramen', date: '2026-01-01' }
    mockFetch.mockResolvedValue(mock)
    expect(await getArticleBySlug('best-ramen')).toEqual(mock)
  })

  it('returns null when not found', async () => {
    mockFetch.mockResolvedValue(null)
    expect(await getArticleBySlug('nope')).toBeNull()
  })
})

describe('getAllArticleSlugs', () => {
  it('returns flat array of strings', async () => {
    mockFetch.mockResolvedValue([{ slug: 'article-1' }])
    expect(await getAllArticleSlugs()).toEqual(['article-1'])
  })
})
