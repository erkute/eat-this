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
import {
  getCachedMapData,
  invalidateMapDataCache,
  __resetForTests,
} from '@/lib/map/cached-sanity'

const fetchSpy = vi.mocked(client.fetch)

function mockFetchReturns(restaurants: any[], mustEats: any[], categories: any[]) {
  fetchSpy.mockImplementation(async (query: string) => {
    if (query === 'RESTAURANTS') return restaurants
    if (query === 'MUSTEATS')    return mustEats
    if (query === 'CATEGORIES')  return categories
    throw new Error(`unexpected query: ${query}`)
  })
}

beforeEach(() => {
  fetchSpy.mockReset()
  __resetForTests()
})

describe('getCachedMapData', () => {
  it('fetches all three queries on cold cache', async () => {
    mockFetchReturns([{ _id: 'r1' }], [{ _id: 'm1' }], [{ slug: 'pizza' }])
    const data = await getCachedMapData()
    expect(data).toEqual({
      restaurants: [{ _id: 'r1' }],
      mustEats:    [{ _id: 'm1' }],
      categories:  [{ slug: 'pizza' }],
    })
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  it('returns cached data without re-fetching when within TTL', async () => {
    mockFetchReturns([{ _id: 'r1' }], [], [])
    await getCachedMapData()
    await getCachedMapData()
    await getCachedMapData()
    expect(fetchSpy).toHaveBeenCalledTimes(3)   // 3 queries × 1 fetch each, not 3×3
  })

  it('dedupes concurrent cold-cache calls into one underlying fetch', async () => {
    let resolveFetch!: (val: any[]) => void
    const pending = new Promise<any[]>((resolve) => { resolveFetch = resolve })
    fetchSpy.mockReturnValue(pending as any)

    // 10 concurrent callers during a cold cache
    const calls = Array.from({ length: 10 }, () => getCachedMapData())
    resolveFetch([])
    await Promise.all(calls)

    // Each unique query should have been invoked exactly once across all 10 callers
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  it('refetches after TTL expires', async () => {
    vi.useFakeTimers()
    mockFetchReturns([{ _id: 'r1' }], [], [])
    await getCachedMapData()
    expect(fetchSpy).toHaveBeenCalledTimes(3)

    // Advance just under TTL → still cached
    vi.advanceTimersByTime(59_000)
    await getCachedMapData()
    expect(fetchSpy).toHaveBeenCalledTimes(3)

    // Advance past TTL → refetch
    vi.advanceTimersByTime(2_000)
    await getCachedMapData()
    expect(fetchSpy).toHaveBeenCalledTimes(6)

    vi.useRealTimers()
  })

  it('invalidateMapDataCache forces a fresh fetch on next call', async () => {
    mockFetchReturns([{ _id: 'r1' }], [], [])
    await getCachedMapData()
    expect(fetchSpy).toHaveBeenCalledTimes(3)

    invalidateMapDataCache()
    await getCachedMapData()
    expect(fetchSpy).toHaveBeenCalledTimes(6)
  })
})
