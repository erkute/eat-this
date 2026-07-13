// @vitest-environment jsdom
import type { RefObject } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pollUntilMapReady } from './pollUntilMapReady'

function mapRef(current: MapRef | null = null): RefObject<MapRef | null> {
  return { current }
}

describe('pollUntilMapReady', () => {
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('runs once when the lazy map ref becomes available', () => {
    vi.useFakeTimers()
    const ref = mapRef()
    const map = {} as MapRef
    const onReady = vi.fn()

    pollUntilMapReady({ mapRef: ref, onReady })
    expect(vi.getTimerCount()).toBe(1)

    ref.current = map
    vi.advanceTimersByTime(120)

    expect(onReady).toHaveBeenCalledOnce()
    expect(onReady).toHaveBeenCalledWith(map)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('clears its pending timer when the caller cleans up', () => {
    vi.useFakeTimers()
    const ref = mapRef()
    const onReady = vi.fn()
    const onTimeout = vi.fn()

    const cleanup = pollUntilMapReady({ mapRef: ref, onReady, onTimeout })
    cleanup()
    expect(vi.getTimerCount()).toBe(0)

    ref.current = {} as MapRef
    vi.advanceTimersByTime(30_000)

    expect(onReady).not.toHaveBeenCalled()
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('times out once when the map chunk never mounts', () => {
    vi.useFakeTimers()
    const onReady = vi.fn()
    const onTimeout = vi.fn()

    pollUntilMapReady({ mapRef: mapRef(), onReady, onTimeout })
    vi.advanceTimersByTime(14_999)
    expect(onTimeout).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onTimeout).toHaveBeenCalledOnce()
    expect(onReady).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('stops without waiting for the map after an external abort', () => {
    vi.useFakeTimers()
    let shouldStop = false
    const onReady = vi.fn()
    const onStopped = vi.fn()

    pollUntilMapReady({
      mapRef: mapRef(),
      onReady,
      shouldStop: () => shouldStop,
      onStopped,
    })
    shouldStop = true
    vi.advanceTimersByTime(120)

    expect(onStopped).toHaveBeenCalledOnce()
    expect(onReady).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
