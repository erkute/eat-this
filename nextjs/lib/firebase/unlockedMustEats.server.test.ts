import { beforeEach, describe, expect, it, vi } from 'vitest'

const set = vi.fn()
const unlockedDoc = vi.fn(() => ({ set }))
const unlockedCollection = { doc: unlockedDoc }
const userDoc = { collection: vi.fn(() => unlockedCollection) }

vi.mock('./admin', () => ({
  getAdminFirestore: () => ({
    collection: () => ({ doc: () => userDoc }),
  }),
}))

import { unlockMustEat } from './unlockedMustEats.server'

beforeEach(() => vi.clearAllMocks())

describe('unlockMustEat', () => {
  it('persists only non-sensitive metadata and replaces legacy payloads', async () => {
    await unlockMustEat('user-1', {
      _id: 'm1',
      restaurant: {
        _id: 'r1',
        name: 'Restaurant',
        slug: 'restaurant',
        lat: 1,
        lng: 2,
      },
    })

    expect(unlockedDoc).toHaveBeenCalledWith('m1')
    expect(set).toHaveBeenCalledOnce()
    expect(set.mock.calls[0][0]).toEqual({
      restaurantId: 'r1',
      unlockedAt: expect.anything(),
    })
    expect(set.mock.calls[0]).toHaveLength(1)
  })
})
