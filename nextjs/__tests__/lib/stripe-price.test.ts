import { describe, it, expect, vi, afterEach } from 'vitest'

// vi.hoisted ensures these are available inside vi.mock factories
const { listFn } = vi.hoisted(() => ({
  listFn: vi.fn(async () => ({ data: [] as Array<{ id: string }> })),
}))

vi.mock('../../lib/stripe', () => ({
  getStripe: () => ({ prices: { list: listFn } }),
}))

import { resolvePriceId, isTestMode } from '../../lib/stripe-price'

afterEach(() => {
  vi.unstubAllEnvs()
  listFn.mockClear()
})

describe('isTestMode', () => {
  it('is false for a live key and true for a test key', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_abc')
    expect(isTestMode()).toBe(false)
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_abc')
    expect(isTestMode()).toBe(true)
  })
})

describe('resolvePriceId', () => {
  it('returns the catalog (live) price ID in live mode without calling Stripe', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_abc')
    const id = await resolvePriceId({ packId: 'category-pizza', stripePriceId: 'price_live_1' })
    expect(id).toBe('price_live_1')
    expect(listFn).not.toHaveBeenCalled()
  })

  it('resolves the test-mode price via lookup_key = packId in test mode', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_abc')
    listFn.mockResolvedValueOnce({ data: [{ id: 'price_test_coffee' }] })
    const id = await resolvePriceId({ packId: 'category-coffee', stripePriceId: 'price_live_2' })
    expect(id).toBe('price_test_coffee')
    expect(listFn).toHaveBeenCalledWith({ lookup_keys: ['category-coffee'], active: true, limit: 1 })
  })

  it('caches resolved test-mode price IDs per pack', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_abc')
    listFn.mockResolvedValueOnce({ data: [{ id: 'price_test_dinner' }] })
    await resolvePriceId({ packId: 'category-dinner', stripePriceId: 'price_live_3' })
    const again = await resolvePriceId({ packId: 'category-dinner', stripePriceId: 'price_live_3' })
    expect(again).toBe('price_test_dinner')
    expect(listFn).toHaveBeenCalledTimes(1)
  })

  it('throws with a seed-script hint when no test price exists', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_abc')
    listFn.mockResolvedValueOnce({ data: [] })
    await expect(
      resolvePriceId({ packId: 'category-sweets', stripePriceId: 'price_live_4' }),
    ).rejects.toThrow(/seed-stripe-test-prices/)
  })
})
