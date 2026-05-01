// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, ...path) => ({ path: path.join('/') })),
  onSnapshot: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ __sentinel: 'serverTimestamp' })),
}))
vi.mock('../config', () => ({ db: {} }))

import { onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { useUserProfile } from '../useUserProfile'

describe('useUserProfile', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns onboardedAt from snapshot', async () => {
    const ts = { toDate: () => new Date('2026-05-01') }
    vi.mocked(onSnapshot).mockImplementation((_ref, onNext) => {
      ;(onNext as (s: { data: () => unknown }) => void)({
        data: () => ({ avatar: 2, onboardedAt: ts }),
      })
      return () => {}
    })

    const { result } = renderHook(() => useUserProfile('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile.avatar).toBe(2)
    expect(result.current.profile.onboardedAt).toBe(ts)
  })

  it('returns onboardedAt as null when missing', async () => {
    vi.mocked(onSnapshot).mockImplementation((_ref, onNext) => {
      ;(onNext as (s: { data: () => unknown }) => void)({
        data: () => ({ avatar: 1 }),
      })
      return () => {}
    })

    const { result } = renderHook(() => useUserProfile('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile.onboardedAt).toBeNull()
  })

  it('markOnboarded writes serverTimestamp via merge', async () => {
    vi.mocked(onSnapshot).mockImplementation(() => () => {})
    vi.mocked(setDoc).mockResolvedValue(undefined)

    const { result } = renderHook(() => useUserProfile('u1'))
    await act(async () => { await result.current.markOnboarded() })

    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/u1' }),
      { onboardedAt: { __sentinel: 'serverTimestamp' } },
      { merge: true },
    )
  })

  it('markOnboarded is no-op without uid', async () => {
    const { result } = renderHook(() => useUserProfile(null))
    await act(async () => { await result.current.markOnboarded() })
    expect(setDoc).not.toHaveBeenCalled()
  })
})
