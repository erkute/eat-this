import { beforeEach, describe, expect, it, vi } from 'vitest'

// Zwei Wege zu Sanity: `client.fetch` geht über das API-CDN (wie die Seiten),
// `client.withConfig({ useCdn: false }).fetch` an die Live-API.
const mocks = vi.hoisted(() => ({
  cdnFetch: vi.fn(),
  liveFetch: vi.fn(),
}))

vi.mock('@/lib/sanity', () => ({
  client: {
    fetch: mocks.cdnFetch,
    withConfig: () => ({ fetch: mocks.liveFetch }),
  },
}))

import { waitForFreshCdn } from '@/lib/sanity.server'
import { mustEatRestaurantSlugQuery, restaurantPageQuery } from '@/lib/queries'

const OLD_PAGE = { slug: 'boii-boii', mustEats: [] }
const NEW_PAGE = { slug: 'boii-boii', mustEats: [{ _id: 'must-eat-boii-boii-pla-tod', order: 36 }] }

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
})

describe('waitForFreshCdn', () => {
  // 14.10.2026: Karte publiziert, Webhook wartete pauschal fünf Sekunden,
  // /restaurant/boii-boii baute gegen ein CDN ohne die Karte neu und blieb so.
  it('wartet bei einer Must-Eat-Karte, bis das CDN die Seite ihres Spots frisch liefert', async () => {
    mocks.liveFetch.mockImplementation(async (query: string) =>
      query === mustEatRestaurantSlugQuery ? 'boii-boii' : NEW_PAGE
    )
    mocks.cdnFetch
      .mockResolvedValueOnce(OLD_PAGE)
      .mockResolvedValueOnce(OLD_PAGE)
      .mockResolvedValueOnce(NEW_PAGE)

    const pending = waitForFreshCdn({ type: 'mustEat', id: 'must-eat-boii-boii-pla-tod' })
    await vi.advanceTimersByTimeAsync(10_000)

    await expect(pending).resolves.toBe('fresh')
    expect(mocks.liveFetch).toHaveBeenCalledWith(
      mustEatRestaurantSlugQuery,
      { id: 'must-eat-boii-boii-pla-tod' },
      { cache: 'no-store' }
    )
    expect(mocks.cdnFetch).toHaveBeenCalledTimes(3)
    expect(mocks.cdnFetch).toHaveBeenLastCalledWith(
      restaurantPageQuery,
      expect.objectContaining({ slug: 'boii-boii' }),
      { cache: 'no-store' }
    )
  })

  it('wartet bei einer gelöschten Karte pauschal, weil kein Spot mehr an ihr hängt', async () => {
    mocks.liveFetch.mockResolvedValue(null)

    const pending = waitForFreshCdn({ type: 'mustEat', id: 'must-eat-weg' }, { fallbackMs: 5000 })
    await vi.advanceTimersByTimeAsync(5000)

    await expect(pending).resolves.toBe('fixed')
    expect(mocks.cdnFetch).not.toHaveBeenCalled()
  })

  it('vergleicht bei einem Restaurant direkt dessen Seite, ohne Umweg über die Live-Suche', async () => {
    mocks.liveFetch.mockResolvedValue(NEW_PAGE)
    mocks.cdnFetch.mockResolvedValue(NEW_PAGE)

    await expect(waitForFreshCdn({ type: 'restaurant', slug: 'boii-boii' })).resolves.toBe('fresh')
    expect(mocks.liveFetch).toHaveBeenCalledTimes(1)
    expect(mocks.liveFetch).toHaveBeenCalledWith(
      restaurantPageQuery,
      expect.objectContaining({ slug: 'boii-boii' }),
      { cache: 'no-store' }
    )
  })

  it('gibt nach maxMs auf, wenn das CDN nicht nachzieht', async () => {
    mocks.liveFetch.mockImplementation(async (query: string) =>
      query === mustEatRestaurantSlugQuery ? 'boii-boii' : NEW_PAGE
    )
    mocks.cdnFetch.mockResolvedValue(OLD_PAGE)

    const pending = waitForFreshCdn({ type: 'mustEat', id: 'must-eat-boii-boii-pla-tod' })
    await vi.advanceTimersByTimeAsync(30_000)

    await expect(pending).resolves.toBe('timeout')
  })
})
