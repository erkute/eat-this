// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }))

import { useMustEatDetailState } from '../useMustEatDetailState'
import { trackEvent } from '@/lib/analytics'
import type { MapMustEat } from '@/lib/types'

const mkMustEat = (): MapMustEat => ({
  _id: 'me-1',
  dish: 'Pizza',
  image: '',
  restaurant: {
    _id: 'r-1',
    name: 'R',
    slug: 'r',
    lat: 52.52,
    lng: 13.405,
  },
})

const fakeRect = { width: 100, height: 100, x: 0, y: 0, top: 0, left: 0, right: 100, bottom: 100, toJSON: () => ({}) } as DOMRect
const mkEvent = () =>
  ({ currentTarget: { getBoundingClientRect: () => fakeRect } }) as unknown as React.MouseEvent<HTMLButtonElement>

describe('useMustEatDetailState — handleCardClick auth gate', () => {
  beforeEach(() => {
    vi.mocked(trackEvent).mockClear()
  })

  it('waits for a persisted unlock before showing or tracking success', async () => {
    let resolveUnlock!: (persisted: boolean) => void
    const onUnlock = vi.fn(() => new Promise<boolean>((resolve) => {
      resolveUnlock = resolve
    }))
    const { result } = renderHook(() =>
      useMustEatDetailState({
        mustEat: mkMustEat(),
        userLocation: { lat: 52.52, lng: 13.405 },  // 0m from restaurant
        onUnlock,
        isAuthed: true,
      }),
    )

    expect(result.current.canUnlock).toBe(true)
    expect(result.current.revealOrigin).toBeNull()

    let click!: Promise<void>
    act(() => { click = result.current.handleCardClick(mkEvent()) })

    expect(result.current.unlocking).toBe(true)
    expect(result.current.revealOrigin).toBeNull()
    expect(onUnlock).toHaveBeenCalledOnce()
    expect(trackEvent).not.toHaveBeenCalledWith(
      'must_eat_reveal_attempt',
      expect.objectContaining({ result: 'unlocked' }),
    )

    await act(async () => {
      resolveUnlock(true)
      await click
    })

    expect(result.current.unlocking).toBe(false)
    expect(result.current.unlockError).toBe(false)
    expect(result.current.revealOrigin).toBe(fakeRect)
    expect(trackEvent).toHaveBeenCalledWith(
      'must_eat_reveal_attempt',
      expect.objectContaining({ result: 'unlocked' }),
    )
  })

  it('keeps the card covered and exposes a retry state when persistence fails', async () => {
    const onUnlock = vi.fn().mockResolvedValue(false)
    const { result } = renderHook(() =>
      useMustEatDetailState({
        mustEat: mkMustEat(),
        userLocation: { lat: 52.52, lng: 13.405 },
        onUnlock,
        isAuthed: true,
      }),
    )

    await act(async () => {
      await result.current.handleCardClick(mkEvent())
    })

    expect(result.current.unlocking).toBe(false)
    expect(result.current.unlockError).toBe(true)
    expect(result.current.revealOrigin).toBeNull()
    expect(trackEvent).toHaveBeenCalledWith(
      'must_eat_reveal_attempt',
      expect.objectContaining({ result: 'failed' }),
    )
    expect(trackEvent).not.toHaveBeenCalledWith(
      'must_eat_reveal_attempt',
      expect.objectContaining({ result: 'unlocked' }),
    )
  })

  it('handles a rejected unlock request without starting the reveal', async () => {
    const onUnlock = vi.fn().mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() =>
      useMustEatDetailState({
        mustEat: mkMustEat(),
        userLocation: { lat: 52.52, lng: 13.405 },
        onUnlock,
        isAuthed: true,
      }),
    )

    await act(async () => {
      await expect(result.current.handleCardClick(mkEvent())).resolves.toBeUndefined()
    })

    expect(result.current.unlockError).toBe(true)
    expect(result.current.revealOrigin).toBeNull()
  })

  it('within unlock radius but NOT authed: does NOT set revealOrigin or call onUnlock', () => {
    const onUnlock = vi.fn().mockResolvedValue(true)
    const { result } = renderHook(() =>
      useMustEatDetailState({
        mustEat: mkMustEat(),
        userLocation: { lat: 52.52, lng: 13.405 },
        onUnlock,
        isAuthed: false,
      }),
    )

    expect(result.current.canUnlock).toBe(true)

    act(() => { result.current.handleCardClick(mkEvent()) })

    // Anon must not enter the reveal-overlay code path — overlay would leak.
    expect(result.current.revealOrigin).toBeNull()
    expect(onUnlock).not.toHaveBeenCalled()
  })

  it('outside the unlock radius clears the tapping state after the shake', () => {
    vi.useFakeTimers()
    try {
      const { result } = renderHook(() =>
        useMustEatDetailState({
          mustEat: mkMustEat(),
          userLocation: null,
          onUnlock: vi.fn().mockResolvedValue(true),
          isAuthed: true,
        }),
      )

      act(() => { result.current.handleCardClick(mkEvent()) })
      expect(result.current.tapping).toBe(true)

      act(() => { vi.advanceTimersByTime(599) })
      expect(result.current.tapping).toBe(true)

      act(() => { vi.advanceTimersByTime(1) })
      expect(result.current.tapping).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('useMustEatDetailState — lazy zoom lifecycle', () => {
  it('keeps the origin visible until the lightbox is ready and through fly-back', () => {
    const { result } = renderHook(() =>
      useMustEatDetailState({
        mustEat: mkMustEat(),
        userLocation: null,
        onUnlock: vi.fn().mockResolvedValue(true),
        isAuthed: true,
      }),
    )

    act(() => { result.current.handleCardZoom(mkEvent()) })
    expect(result.current.zoomRect).toBe(fakeRect)
    expect(result.current.zoomActive).toBe(false)

    act(() => { result.current.handleZoomReady() })
    expect(result.current.zoomActive).toBe(true)

    act(() => { result.current.handleZoomClose() })
    expect(result.current.zoomRect).toBeNull()
    expect(result.current.zoomActive).toBe(true)

    act(() => { result.current.handleZoomExitComplete() })
    expect(result.current.zoomActive).toBe(false)
  })
})
