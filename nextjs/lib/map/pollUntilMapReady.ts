import type { RefObject } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'

const POLL_INTERVAL_MS = 120
const POLL_TIMEOUT_MS = 15_000

interface PollUntilMapReadyOptions {
  mapRef: RefObject<MapRef | null>
  onReady: (map: MapRef) => void
  onTimeout?: () => void
  shouldStop?: () => boolean
  onStopped?: () => void
}

/** Poll the lazy MapLibre ref for a bounded period. The returned cleanup is
 * safe to call on effect reruns, route deactivation, and unmount. */
export function pollUntilMapReady({
  mapRef,
  onReady,
  onTimeout,
  shouldStop,
  onStopped,
}: PollUntilMapReadyOptions): () => void {
  let cancelled = false
  let timer: number | undefined
  const deadline = Date.now() + POLL_TIMEOUT_MS

  const poll = () => {
    timer = undefined
    if (cancelled) return
    if (shouldStop?.()) {
      onStopped?.()
      return
    }
    if (mapRef.current) {
      onReady(mapRef.current)
      return
    }
    if (Date.now() >= deadline) {
      onTimeout?.()
      return
    }
    timer = window.setTimeout(poll, POLL_INTERVAL_MS)
  }

  poll()

  return () => {
    cancelled = true
    if (timer !== undefined) window.clearTimeout(timer)
  }
}
