import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  sessionsList: vi.fn(),
  getUserByEmail: vi.fn(),
  entitlement: null as Record<string, unknown> | null,
  deleted: [] as string[],
}))

vi.mock('../../lib/stripe', () => ({
  getStripe: () => ({ checkout: { sessions: { list: mocks.sessionsList } } }),
}))

vi.mock('../../lib/firebase/admin', () => {
  const ref = (path: string) => ({ path })
  return {
    getAdminAuth: () => ({ getUserByEmail: mocks.getUserByEmail }),
    getAdminFirestore: () => ({
      collection: (users: string) => ({
        doc: (uid: string) => ({
          collection: (name: string) => ({
            doc: (id: string) => ref(`${users}/${uid}/${name}/${id}`),
          }),
        }),
      }),
      runTransaction: async (
        cb: (tx: {
          get: (r: { path: string }) => Promise<unknown>
          delete: (r: { path: string }) => void
        }) => unknown,
      ) =>
        cb({
          get: async () => ({ exists: mocks.entitlement !== null, data: () => mocks.entitlement }),
          delete: (r) => { mocks.deleted.push(r.path) },
        }),
    }),
  }
})

import { revokeEntitlementForPayment } from '../../lib/stripe-revoke'

const session = (over: Record<string, unknown> = {}) => ({
  id: 'cs_1',
  metadata: { packId: 'category-pizza', uid: 'u1' },
  customer_details: null,
  ...over,
})

beforeEach(() => {
  mocks.sessionsList.mockReset()
  mocks.sessionsList.mockResolvedValue({ data: [session()] })
  mocks.getUserByEmail.mockReset()
  mocks.entitlement = { stripeSessionId: 'cs_1' }
  mocks.deleted = []
})

describe('revokeEntitlementForPayment', () => {
  it('removes the entitlement the returned payment created', async () => {
    expect(await revokeEntitlementForPayment('pi_1')).toBe('revoked')
    expect(mocks.sessionsList).toHaveBeenCalledWith({ payment_intent: 'pi_1', limit: 1 })
    expect(mocks.deleted).toEqual(['users/u1/entitlements/category-pizza'])
  })

  it('keeps an entitlement that another session paid for (refunded duplicate)', async () => {
    mocks.entitlement = { stripeSessionId: 'cs_first' }
    expect(await revokeEntitlementForPayment('pi_1')).toBe('nothing_to_revoke')
    expect(mocks.deleted).toEqual([])
  })

  it('finds a guest buyer by the email Stripe collected', async () => {
    mocks.sessionsList.mockResolvedValue({
      data: [session({
        metadata: { packId: 'all-berlin', uid: '' },
        customer_details: { email: 'guest@example.com' },
      })],
    })
    mocks.getUserByEmail.mockResolvedValue({ uid: 'guest-uid' })
    expect(await revokeEntitlementForPayment('pi_1')).toBe('revoked')
    expect(mocks.getUserByEmail).toHaveBeenCalledWith('guest@example.com')
    expect(mocks.deleted).toEqual(['users/guest-uid/entitlements/all-berlin'])
  })

  it('has nothing to revoke without a session, a known pack, an account or an entitlement', async () => {
    mocks.sessionsList.mockResolvedValueOnce({ data: [] })
    expect(await revokeEntitlementForPayment('pi_1')).toBe('nothing_to_revoke')

    mocks.sessionsList.mockResolvedValueOnce({ data: [session({ metadata: { packId: 'nope' } })] })
    expect(await revokeEntitlementForPayment('pi_1')).toBe('nothing_to_revoke')

    mocks.sessionsList.mockResolvedValueOnce({
      data: [session({ metadata: { packId: 'all-berlin' }, customer_details: { email: 'gone@example.com' } })],
    })
    mocks.getUserByEmail.mockRejectedValueOnce({ code: 'auth/user-not-found' })
    expect(await revokeEntitlementForPayment('pi_1')).toBe('nothing_to_revoke')

    mocks.entitlement = null
    expect(await revokeEntitlementForPayment('pi_1')).toBe('nothing_to_revoke')
    expect(mocks.deleted).toEqual([])
  })

  it('lets an account lookup failure through so Stripe retries', async () => {
    mocks.sessionsList.mockResolvedValue({
      data: [session({ metadata: { packId: 'all-berlin' }, customer_details: { email: 'x@example.com' } })],
    })
    mocks.getUserByEmail.mockRejectedValue({ code: 'auth/internal-error' })
    await expect(revokeEntitlementForPayment('pi_1')).rejects.toEqual({ code: 'auth/internal-error' })
  })
})
