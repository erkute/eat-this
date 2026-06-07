import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted ensures these are available inside vi.mock factories
const { setFn, getFn, sanityFetch } = vi.hoisted(() => {
  const setFn      = vi.fn<(doc: Record<string, unknown>) => Promise<undefined>>(async () => undefined)
  const getFn      = vi.fn(async () => ({ exists: false }))
  const sanityFetch = vi.fn(async () => [
    { _id: 'mustEat-1', rid: 'rest-A' },
    { _id: 'mustEat-2', rid: 'rest-A' },
    { _id: 'mustEat-3', rid: 'rest-B' },
  ])
  return { setFn, getFn, sanityFetch }
})

const docRef  = { get: getFn, set: setFn, create: vi.fn() }
const docFn   = vi.fn(() => docRef)
const collFn  = vi.fn(() => ({ doc: docFn }))
const userDocFn = vi.fn(() => ({ collection: collFn }))
const adminFirestore = { collection: vi.fn(() => ({ doc: userDocFn })) }

vi.mock('../../lib/firebase/admin', () => ({
  getAdminFirestore: () => adminFirestore,
}))

vi.mock('../../lib/sanity', () => ({
  client: { fetch: sanityFetch },
}))

import { assembleAndWriteEntitlement } from '../../lib/stripe-fulfill'
import { getPack } from '../../lib/stripe-catalog'

beforeEach(() => {
  setFn.mockClear(); getFn.mockClear(); sanityFetch.mockClear()
  getFn.mockResolvedValue({ exists: false })
  sanityFetch.mockResolvedValue([
    { _id: 'mustEat-1', rid: 'rest-A' },
    { _id: 'mustEat-2', rid: 'rest-A' },
    { _id: 'mustEat-3', rid: 'rest-B' },
  ])
})

describe('assembleAndWriteEntitlement', () => {
  it('writes a category entitlement with mustEatIds + dedup\'d restaurantIds from Sanity', async () => {
    const result = await assembleAndWriteEntitlement({
      uid: 'u1', packId: 'category-pizza', stripeSessionId: 'cs_test_123',
    })
    expect(result).toBe('created')
    expect(sanityFetch).toHaveBeenCalledOnce()
    expect(setFn).toHaveBeenCalledOnce()
    const written = setFn.mock.calls[0][0]
    expect(written.type).toBe('category')
    expect(written.slug).toBe('pizza')
    expect(written.mustEatIds).toEqual(['mustEat-1', 'mustEat-2', 'mustEat-3'])
    expect(written.restaurantIds).toEqual(['rest-A', 'rest-B'])
    expect(written.stripeSessionId).toBe('cs_test_123')
    expect(written.source).toBe('stripe')
  })

  it('writes an all-berlin entitlement without Sanity lookup', async () => {
    await assembleAndWriteEntitlement({
      uid: 'u1', packId: 'all-berlin', stripeSessionId: 'cs_test_456',
    })
    expect(sanityFetch).not.toHaveBeenCalled()
    const written = setFn.mock.calls[0][0]
    expect(written.type).toBe('all-berlin')
    expect(written.slug).toBeNull()
    expect(written.restaurantIds).toEqual([])
    expect(written.mustEatIds).toEqual([])
  })

  it('returns "exists" and does not write when the entitlement is already there', async () => {
    getFn.mockResolvedValueOnce({ exists: true })
    const result = await assembleAndWriteEntitlement({
      uid: 'u1', packId: 'category-pizza', stripeSessionId: 'cs_test_dup',
    })
    expect(result).toBe('exists')
    expect(setFn).not.toHaveBeenCalled()
  })

  it('throws on unknown packId', async () => {
    await expect(assembleAndWriteEntitlement({
      uid: 'u1', packId: 'not-a-pack', stripeSessionId: 'cs',
    })).rejects.toThrow(/unknown pack/)
    expect(getPack('not-a-pack')).toBeNull()
  })
})
