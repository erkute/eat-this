import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the sanity client module. The fetch wrappers in sanity.server.ts
// only care that the client returns whatever the query returned; verify the
// fetch wrappers pass the right query + tags + params to it.
vi.mock('../../lib/sanity', () => ({
  client: { fetch: vi.fn() },
}))

import { client } from '../../lib/sanity'
import {
  getLandingPage,
  getRestaurantCount,
  getCategoryGrid,
  getRecentlyAdded,
} from '../../lib/sanity.server'

const mockFetch = vi.mocked(client.fetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe('getLandingPage', () => {
  it('fetches the singleton with tag landingPage', async () => {
    mockFetch.mockResolvedValueOnce({ hero: { headlineEn: 'x' } } as never)
    const result = await getLandingPage()
    expect(mockFetch).toHaveBeenCalledOnce()
    const [query, params, options] = mockFetch.mock.calls[0]
    expect(query).toContain('_id == "landingPage"')
    expect(params).toEqual({})
    expect(options?.next?.tags).toEqual(['landingPage'])
    expect(result).toMatchObject({ hero: { headlineEn: 'x' } })
  })

  it('returns null when the doc does not exist', async () => {
    mockFetch.mockResolvedValueOnce(null as never)
    const result = await getLandingPage()
    expect(result).toBeNull()
  })
})

describe('getRestaurantCount', () => {
  it('returns a number from the count query', async () => {
    mockFetch.mockResolvedValueOnce(217 as never)
    const result = await getRestaurantCount()
    expect(result).toBe(217)
    expect(mockFetch.mock.calls[0][0]).toContain('count(*[_type == "restaurant"')
  })

  it('returns 0 if the query returns null', async () => {
    mockFetch.mockResolvedValueOnce(null as never)
    const result = await getRestaurantCount()
    expect(result).toBe(0)
  })
})

describe('getCategoryGrid', () => {
  it('returns an array of category tiles', async () => {
    mockFetch.mockResolvedValueOnce([
      { _id: 'a', name: 'Café', nameEn: 'Coffee', slug: 'coffee', iconUrl: 'x' },
    ] as never)
    const result = await getCategoryGrid()
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('coffee')
  })
})

describe('getRecentlyAdded', () => {
  it('passes the limit param', async () => {
    mockFetch.mockResolvedValueOnce([] as never)
    await getRecentlyAdded(8)
    const [, params] = mockFetch.mock.calls[0]
    expect(params).toEqual({ limit: 8 })
  })
})
