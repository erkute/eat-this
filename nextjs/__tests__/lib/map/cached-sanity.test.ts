import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the sanity client + the two map queries before the module under test loads.
vi.mock('@/lib/sanity', () => ({
  client: { fetch: vi.fn() },
}))
vi.mock('@/lib/map/queries', () => ({
  mapRestaurantsQuery: 'RESTAURANTS',
  mapMustEatsQuery:    'MUSTEATS',
}))
vi.mock('@/lib/queries', () => ({
  allCategoriesQuery: 'CATEGORIES',
}))

import { client } from '@/lib/sanity'
import { getCachedMapData } from '@/lib/map/cached-sanity'

const fetchSpy = vi.mocked(client.fetch)

function mockFetchReturns(restaurants: any[], mustEats: any[], categories: any[]) {
  // `client.fetch` is heavily overloaded; cast the impl to `any` so the mock
  // matches its signature without re-stating every overload here.
  fetchSpy.mockImplementation(((query: string) => {
    if (query === 'RESTAURANTS') return Promise.resolve(restaurants)
    if (query === 'MUSTEATS')    return Promise.resolve(mustEats)
    if (query === 'CATEGORIES')  return Promise.resolve(categories)
    throw new Error(`unexpected query: ${query}`)
  }) as any)
}

beforeEach(() => {
  fetchSpy.mockReset()
})

describe('getCachedMapData', () => {
  it('fetches all three queries through the tagged shared Next cache', async () => {
    mockFetchReturns([{ _id: 'r1' }], [{ _id: 'm1' }], [{ slug: 'pizza' }])
    const data = await getCachedMapData()
    expect(data).toEqual({
      restaurants: [{ _id: 'r1' }],
      mustEats:    [{ _id: 'm1' }],
      categories:  [{ slug: 'pizza' }],
    })
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    const cacheOptions = { next: { revalidate: 60, tags: ['map-data'] } }
    expect(fetchSpy).toHaveBeenCalledWith('RESTAURANTS', {}, cacheOptions)
    expect(fetchSpy).toHaveBeenCalledWith('MUSTEATS', {}, cacheOptions)
    expect(fetchSpy).toHaveBeenCalledWith('CATEGORIES', {}, cacheOptions)
  })
})
