// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, ...path) => ({ path: path.join('/') })),
  onSnapshot: vi.fn(),
  setDoc: vi.fn(),
}))
vi.mock('../config', () => ({ db: {} }))

import { onSnapshot, setDoc } from 'firebase/firestore'
import { useUserProfile } from '../useUserProfile'

describe('useUserProfile', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns avatar from snapshot', async () => {
    vi.mocked(onSnapshot).mockImplementation((_ref, onNext) => {
      ;(onNext as (s: { data: () => unknown }) => void)({
        data: () => ({ avatar: 2 }),
      })
      return () => {}
    })

    const { result } = renderHook(() => useUserProfile('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile.avatar).toBe(2)
  })

  it('returns avatar as null when missing', async () => {
    vi.mocked(onSnapshot).mockImplementation((_ref, onNext) => {
      ;(onNext as (s: { data: () => unknown }) => void)({
        data: () => ({}),
      })
      return () => {}
    })

    const { result } = renderHook(() => useUserProfile('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile.avatar).toBeNull()
  })

  it('setAvatar writes via merge', async () => {
    vi.mocked(onSnapshot).mockImplementation(() => () => {})
    vi.mocked(setDoc).mockResolvedValue(undefined)

    const { result } = renderHook(() => useUserProfile('u1'))
    await act(async () => { await result.current.setAvatar(3) })

    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/u1' }),
      { avatar: 3 },
      { merge: true },
    )
  })

  it('setAvatar is no-op without uid', async () => {
    const { result } = renderHook(() => useUserProfile(null))
    await act(async () => { await result.current.setAvatar(2) })
    expect(setDoc).not.toHaveBeenCalled()
  })
})
