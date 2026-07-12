// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useMustEatDetailState } from '../useMustEatDetailState'
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
  it('within unlock radius + isAuthed: sets revealOrigin and calls onUnlock', () => {
    const onUnlock = vi.fn()
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

    act(() => { result.current.handleCardClick(mkEvent()) })

    expect(result.current.revealOrigin).not.toBeNull()
    expect(onUnlock).toHaveBeenCalledOnce()
  })

  it('within unlock radius but NOT authed: does NOT set revealOrigin or call onUnlock', () => {
    const onUnlock = vi.fn()
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
})

describe('useMustEatDetailState — lazy zoom lifecycle', () => {
  it('keeps the origin visible until the lightbox is ready and through fly-back', () => {
    const { result } = renderHook(() =>
      useMustEatDetailState({
        mustEat: mkMustEat(),
        userLocation: null,
        onUnlock: vi.fn(),
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
