// @vitest-environment jsdom
import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MapRestaurant } from '@/lib/types';

// Stand-in for the maplibre surface: each Marker becomes a plain element so
// the assertions below are about what MapCanvasLayer renders and in which
// order, not about maplibre itself.
vi.mock('react-map-gl/maplibre', () => ({
  Marker: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-marker className={className}>
      {children}
    </div>
  ),
}));
// Reports first paint immediately, the way a healthy basemap does — otherwise
// every case here would sit out the 2.5s "CDN never reported" fallback.
vi.mock('./MapCanvas', () => {
  function MapCanvasStub({
    children,
    onFirstPaint,
  }: {
    children: React.ReactNode;
    onFirstPaint: () => void;
  }) {
    useEffect(() => onFirstPaint(), [onFirstPaint]);
    return <div data-canvas>{children}</div>;
  }
  // The real initial camera, so the stub clusters at the same zoom the app does.
  return { default: MapCanvasStub, INITIAL_ZOOM_LEVEL: 12 };
});
vi.mock('./UserLocationMarker', () => ({ default: () => <div data-user-marker /> }));

import MapCanvasLayer from './MapCanvasLayer';

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
  } as MapRestaurant;
}

/* Spots far enough apart that nothing clusters at the default zoom (0.03° is
   roughly 290px at z12, against a 48px radius). These cases are about which
   markers are rendered and in what order; clustering itself is covered in
   lib/map/clusterMarkers.test.ts. */
function spread(...ids: string[]): MapRestaurant[] {
  return ids.map((id, i) => spot(id, { lat: 52.42 + i * 0.03, lng: 13.31 + i * 0.03 }));
}

function layer(
  free: MapRestaurant[],
  locked: MapRestaurant[],
  selected: MapRestaurant | null = null,
  selectedIsLocked = false
) {
  return (
    <MapCanvasLayer
      mapRef={{ current: null }}
      onMapClick={vi.fn()}
      displayedRestaurants={free}
      displayedLockedRestaurants={locked}
      selectedRestaurant={selected}
      selectedIsLocked={selectedIsLocked}
      onRestaurantClick={vi.fn()}
      onLockedClick={vi.fn()}
      lockedLabel="Gesperrter Spot"
      clusterLabel={(n) => `${n} Spots`}
      lockedClusterLabel={(n) => `${n} gesperrte Spots`}
      location={null}
    />
  );
}

describe('MapCanvasLayer locked spots', () => {
  it('draws one dot per locked spot alongside the free pins', async () => {
    render(layer(spread('free-1', 'free-2'), spread('locked-1', 'locked-2', 'locked-3')));

    // Markers are held back until the basemap reports its first paint; the
    // fallback timer reveals them regardless.
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getAllByLabelText('Gesperrter Spot')).toHaveLength(3);
    expect(screen.getAllByLabelText(/^free-/)).toHaveLength(2);
  });

  it('renders the dots before the pins so an overlapping pin wins the tap', async () => {
    render(layer(spread('free-1'), spread('locked-1', 'locked-2')));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    // MapLibre stacks markers purely by DOM order — it sets no z-index — so
    // "locked first" is what keeps a free pin on top of the dots around it.
    const labels = screen.getAllByRole('button').map((el) => el.getAttribute('aria-label'));
    expect(labels).toEqual(['Gesperrter Spot', 'Gesperrter Spot', 'free-1']);
  });

  it('does not hand an open locked spot the free-spot pin', async () => {
    // The "selected spot may sit outside the visible set" fallback exists for
    // deep links. A locked selection is already drawn as its own dot, and the
    // yellow pin would announce it as free at exactly the moment the sheet
    // says it is not.
    const target = spot('locked-1');
    render(layer([spot('free-1')], [target], target, true));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getAllByLabelText('Gesperrter Spot')).toHaveLength(1);
    expect(screen.queryAllByLabelText('locked-1')).toHaveLength(0);
  });

  it('still gives a deep-linked free spot a pin when it is outside the set', async () => {
    const target = spot('deep-linked');
    render(layer([spot('free-1')], [], target, false));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getByLabelText('deep-linked')).toBeTruthy();
  });

  it('draws nothing extra when no locked spot matches the filter', async () => {
    render(layer([spot('free-1')], []));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.queryAllByLabelText('Gesperrter Spot')).toHaveLength(0);
  });
});

describe('MapCanvasLayer clustering', () => {
  /* Measured on a 375px viewport at the default camera: 10 free pins in the
     visible map strip, 5 pairs closer than 40px at a 44px marker box, and two
     pins that never received a tap at their own centre. */
  it('collapses free pins that would overlap into one tag with the count', async () => {
    // Same coordinate, so they cluster at any zoom the map can reach.
    render(layer([spot('free-1'), spot('free-2'), spot('free-3')], []));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getByLabelText('3 Spots')).toBeTruthy();
    expect(screen.queryByLabelText('free-1')).toBeNull();
    // The count is on the tag itself, not only in the accessible name.
    expect(screen.getByLabelText('3 Spots').textContent).toBe('3');
  });

  it('clusters the locked dots as well as the pins', async () => {
    /* Clustering only the pins would uncover the carpet underneath: the same
       strip carries 130 locked dots with 90 overlapping pairs. */
    render(layer([], [spot('locked-1'), spot('locked-2'), spot('locked-3'), spot('locked-4')]));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getByLabelText('4 gesperrte Spots')).toBeTruthy();
    expect(screen.queryAllByLabelText('Gesperrter Spot')).toHaveLength(0);
  });

  it('keeps the open spot out of the cluster it came from', async () => {
    // A sheet describing a spot the map cannot show is the dead end the
    // deep-link fallback exists for — a cluster must not recreate it.
    const target = spot('free-2');
    render(layer([spot('free-1'), target, spot('free-3')], [], target, false));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getByLabelText('free-2')).toBeTruthy();
    expect(screen.getByLabelText('2 Spots')).toBeTruthy();
  });

  it('keeps an open locked spot out of its dot cluster', async () => {
    const target = spot('locked-2');
    render(layer([], [spot('locked-1'), target, spot('locked-3')], target, true));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    expect(screen.getAllByLabelText('Gesperrter Spot')).toHaveLength(1);
    expect(screen.getByLabelText('2 gesperrte Spots')).toBeTruthy();
  });

  it('leaves the free pin painting over the dots when both cluster', async () => {
    render(layer([spot('free-1'), spot('free-2')], [spot('locked-1'), spot('locked-2')]));
    await waitFor(() => expect(screen.getAllByRole('button')).not.toHaveLength(0));

    const labels = screen.getAllByRole('button').map((el) => el.getAttribute('aria-label'));
    expect(labels).toEqual(['2 gesperrte Spots', '2 Spots']);
  });
});
