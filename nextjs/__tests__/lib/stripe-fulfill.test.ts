import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted ensures these are available inside vi.mock factories
const { setFn, getFn, updateFn, sanityFetch } = vi.hoisted(() => {
  type Snapshot = {
    exists: boolean
    data: () => Record<string, unknown> | undefined
  }
  const setFn      = vi.fn<(doc: Record<string, unknown>) => Promise<undefined>>(async () => undefined)
  const updateFn   = vi.fn<(doc: Record<string, unknown>) => Promise<undefined>>(async () => undefined)
  const getFn      = vi.fn<() => Promise<Snapshot>>(async () => ({
    exists: false,
    data: () => undefined,
  }))
  const sanityFetch = vi.fn<(
    query: string,
    params: { slug: string },
  ) => Promise<{ _id: string; rid: string }[]>>(async () => [
      { _id: 'mustEat-1', rid: 'rest-A' },
      { _id: 'mustEat-2', rid: 'rest-A' },
      { _id: 'mustEat-3', rid: 'rest-B' },
    ])
  return { setFn, getFn, updateFn, sanityFetch }
})

const docRef  = { get: getFn, set: setFn, update: updateFn, create: vi.fn() }
const docFn   = vi.fn(() => docRef)
const collFn  = vi.fn(() => ({ doc: docFn }))
const userDocFn = vi.fn(() => ({ collection: collFn }))
const adminFirestore = {
  collection: vi.fn(() => ({ doc: userDocFn })),
  // assembleAndWriteEntitlement now does the exists-check + write inside a
  // transaction (race-safe first-writer-wins). The fake tx forwards to the
  // same docRef.get/.set the assertions already track (set still receives the
  // doc as its first arg, so `setFn.mock.calls[0][0]` stays valid).
  runTransaction: vi.fn(async (cb: (tx: {
    get: (ref: typeof docRef) => unknown
    set: (ref: typeof docRef, doc: Record<string, unknown>) => unknown
    update: (ref: typeof docRef, doc: Record<string, unknown>) => unknown
  }) => unknown) =>
    cb({
      get: (ref) => ref.get(),
      set: (ref, doc) => ref.set(doc),
      update: (ref, doc) => ref.update(doc),
    }),
  ),
}

vi.mock('../../lib/firebase/admin', () => ({
  getAdminFirestore: () => adminFirestore,
}))

vi.mock('../../lib/sanity', () => ({
  client: { fetch: sanityFetch },
}))

import { assembleAndWriteEntitlement, markGuestMagicLinkSent } from '../../lib/stripe-fulfill'
import { getPack } from '../../lib/stripe-catalog'

beforeEach(() => {
  setFn.mockClear(); getFn.mockClear(); updateFn.mockClear(); sanityFetch.mockClear()
  getFn.mockResolvedValue({ exists: false, data: () => undefined })
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
    expect(result).toEqual({ status: 'created' })
    expect(sanityFetch).toHaveBeenCalledOnce()
    expect(sanityFetch.mock.calls[0][0]).not.toContain('image.asset')
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
    getFn.mockResolvedValueOnce({
      exists: true,
      data: () => ({ stripeSessionId: 'cs_original' }),
    })
    const result = await assembleAndWriteEntitlement({
      uid: 'u1', packId: 'category-pizza', stripeSessionId: 'cs_test_dup',
    })
    expect(result).toEqual({
      status: 'exists',
      existingPackId: 'category-pizza',
      existingStripeSessionId: 'cs_original',
      guestMagicLinkSent: false,
    })
    expect(setFn).not.toHaveBeenCalled()
  })

  it('treats all-berlin as existing coverage for a guest category purchase', async () => {
    getFn
      .mockResolvedValueOnce({ exists: false, data: () => undefined })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ stripeSessionId: 'cs_all_berlin' }),
      })

    const result = await assembleAndWriteEntitlement({
      uid: 'u1', packId: 'category-pizza', stripeSessionId: 'cs_category',
    })

    expect(result).toEqual({
      status: 'exists',
      existingPackId: 'all-berlin',
      existingStripeSessionId: 'cs_all_berlin',
      guestMagicLinkSent: false,
    })
    expect(setFn).not.toHaveBeenCalled()
  })

  it('throws on unknown packId', async () => {
    await expect(assembleAndWriteEntitlement({
      uid: 'u1', packId: 'not-a-pack', stripeSessionId: 'cs',
    })).rejects.toThrow(/unknown pack/)
    expect(getPack('not-a-pack')).toBeNull()
  })

  it('persists the guest email outbox marker only for the matching session', async () => {
    getFn.mockResolvedValueOnce({
      exists: true,
      data: () => ({stripeSessionId: 'cs_guest'}),
    })

    await markGuestMagicLinkSent({
      uid: 'u1', packId: 'category-pizza', stripeSessionId: 'cs_guest',
    })

    expect(updateFn).toHaveBeenCalledWith({
      guestMagicLinkSentAt: expect.anything(),
    })
  })
})
