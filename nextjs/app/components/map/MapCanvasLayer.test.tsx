// @vitest-environment jsdom
import { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MapRestaurant } from '@/lib/types'

// Stand-in for the maplibre surface: each Marker becomes a plain element so
// the assertions below are about what MapCanvasLayer renders and in which
// order, not about maplibre itself.
vi.mock('react-map-gl/maplibre', () => ({
  Marker: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-marker className={className}>
      {children}
    </div>
  ),
}))
// Reports first paint immediately, the way a healthy basemap does — otherwise
// every case here would sit out the 2.5s "CDN never reported" fallback.
vi.mock('./MapCanvas', () => {
  function MapCanvasStub({
    children,
    onFirstPaint,
  }: {
    children: React.ReactNode
    onFirstPaint: () => void
  }) {
    useEffect(() => onFirstPaint(), [onFirstPaint])
    return <div data-canvas>{children}</div>
  }
  return { default: MapCanvasStub }
})
vi.mock('./UserLocationMarker', () => ({ default: () => <div data-user-marker /> }))

import MapCanvasLayer from './MapCanvasLayer'

function spot(id: string, over: Partial<MapRestaurant> = {}): MapRestaurant {
  return {
    _id: id,
    _createdAt: '2026-01-01T00:00:00Z',
    name: id,
    slug: id,
    isClosed: false,
    lat: 52.52,
    lng: 13.405,
    mustEatCount: 0,
    ...over,
  } as MapRestaurant
}

function layer(free: MapRestaurant[], locked: MapRestaurant[]) {
  return (
    <MapCanvasLayer
      mapRef={{ current: null }}
      onMapClick={vi.fn()}
      displayedRestaurants={free}
      displayedLockedRestaurants={locked}
      selectedRestaurant={null}
      onRestaurantClick={vi.fn()}
      onLockedClick={vi.fn()}
      lockedLabel="Gesperrter Spot"
      location={null}
    />
  )
}

describe('MapCanvasLayer locked spots', () => {
  it('draws one dot per locked spot alongside the free pins', async () => {
    render(layer([spot('free-1'), spot('free-2')], [spot('locked-1'), spot('locked-2'), spot('locked-3')]))

    // Markers are held back until the basemap reports its first paint; the
    // fallback timer reveals them regardless.
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0))

    expect(screen.getAllByLabelText('Gesperrter Spot')).toHaveLength(3)
    expect(screen.getAllByLabelText(/^free-/)).toHaveLength(2)
  })

  it('renders the dots before the pins so an overlapping pin wins the tap', async () => {
    render(layer([spot('free-1')], [spot('locked-1'), spot('locked-2')]))
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0))

    // MapLibre stacks markers purely by DOM order — it sets no z-index — so
    // "locked first" is what keeps a free pin on top of the dots around it.
    const labels = screen.getAllByRole('button').map((el) => el.getAttribute('aria-label'))
    expect(labels).toEqual(['Gesperrter Spot', 'Gesperrter Spot', 'free-1'])
  })

  it('draws nothing extra when no locked spot matches the filter', async () => {
    render(layer([spot('free-1')], []))
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0))

    expect(screen.queryAllByLabelText('Gesperrter Spot')).toHaveLength(0)
  })
})
