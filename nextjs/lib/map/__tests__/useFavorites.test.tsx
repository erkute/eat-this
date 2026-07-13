// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(() => Promise.resolve({})),
  getDocs: vi.fn(),
  openLoginModal: vi.fn(),
  getIdToken: vi.fn(() => Promise.resolve('token')),
}))

vi.mock('next-intl', () => ({ useLocale: () => 'de' }))
vi.mock('@/lib/auth', () => ({
  useLoginModal: () => ({ open: mocks.openLoginModal }),
}))
vi.mock('@/lib/firebase/config', () => ({
  auth: { currentUser: { getIdToken: mocks.getIdToken } },
  getDb: mocks.getDb,
}))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...parts: string[]) => ({ path: parts.join('/') })),
  getDocs: (...args: unknown[]) => mocks.getDocs(...args),
  doc: vi.fn((_db, ...parts: string[]) => ({ path: parts.join('/') })),
  updateDoc: vi.fn(),
}))

import { useFavorites } from '../useFavorites'

function pendingSnapshot() {
  return new Promise<never>(() => {})
}

describe('useFavorites uid isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mocks.getDb.mockResolvedValue({})
    mocks.getDocs.mockImplementation(pendingSnapshot)
  })

  it('atomically clears the previous account on uid change and sign-out', async () => {
    window.localStorage.setItem('eatthis_favorites_user-a', JSON.stringify([
      { restaurantId: 'restaurant-a', name: 'Account A spot' },
    ]))

    const { result, rerender } = renderHook(
      ({ uid }: { uid: string | null }) => useFavorites(uid),
      { initialProps: { uid: 'user-a' as string | null } },
    )

    await waitFor(() => expect(result.current.favoriteIds.has('restaurant-a')).toBe(true))
    expect(result.current.favorites).toHaveLength(1)

    rerender({ uid: 'user-b' })
    expect(result.current.favoriteIds.size).toBe(0)
    expect(result.current.favorites).toEqual([])
    expect(result.current.loading).toBe(true)

    rerender({ uid: null })
    expect(result.current.favoriteIds.size).toBe(0)
    expect(result.current.favorites).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('ignores a previous uid read that resolves after an account switch', async () => {
    let resolveFirst: ((value: { docs: Array<{ id: string; data: () => object }> }) => void) | null = null
    mocks.getDocs
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
      .mockResolvedValueOnce({ docs: [] })

    const { result, rerender } = renderHook(
      ({ uid }: { uid: string | null }) => useFavorites(uid),
      { initialProps: { uid: 'user-a' as string | null } },
    )

    await waitFor(() => expect(mocks.getDocs).toHaveBeenCalledTimes(1))
    rerender({ uid: 'user-b' })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      resolveFirst?.({
        docs: [{ id: 'restaurant-a', data: () => ({ name: 'Account A spot' }) }],
      })
      await Promise.resolve()
    })

    expect(result.current.favoriteIds.size).toBe(0)
    expect(result.current.favorites).toEqual([])
  })
})
