import { describe, it, expect } from 'vitest';
import { searchRefitSpots, spotsCameraTarget } from '../cameraFit';
import type { MapRestaurant } from '@/lib/types';

const spot = (id: string, lat: number, lng: number): MapRestaurant =>
  ({ _id: id, name: id, lat, lng }) as unknown as MapRestaurant;

describe('searchRefitSpots', () => {
  // A query lists free and locked hits as rows, so the camera has to frame
  // both — framing only the free ones would show a fraction of the results.
  it('spans free and locked matches together', () => {
    const free = [spot('free', 52.52, 13.4)];
    const locked = [spot('locked', 52.55, 13.2)];
    expect(searchRefitSpots(free, locked).map((r) => r._id)).toEqual(['free', 'locked']);
  });

  // The regression: a query whose only matches are grey. The camera used to
  // stay parked, so the dots were drawn outside the viewport and the search
  // read as "nothing found".
  it('takes the locked matches when no free spot matches', () => {
    expect(searchRefitSpots([], [spot('locked', 52.55, 13.2)]).map((r) => r._id)).toEqual([
      'locked',
    ]);
  });

  it('stays put when nothing matches at all', () => {
    expect(searchRefitSpots([], [])).toEqual([]);
  });
});

describe('spotsCameraTarget', () => {
  it('has no target for an empty set', () => {
    expect(spotsCameraTarget([])).toBeNull();
  });

  it('centres on a single match instead of fitting a degenerate box', () => {
    expect(spotsCameraTarget([spot('a', 52.5, 13.4)])).toEqual({
      kind: 'point',
      lat: 52.5,
      lng: 13.4,
    });
  });

  it('spans every match when there is more than one', () => {
    expect(
      spotsCameraTarget([spot('a', 52.4, 13.5), spot('b', 52.6, 13.2), spot('c', 52.5, 13.3)])
    ).toEqual({ kind: 'bounds', sw: [13.2, 52.4], ne: [13.5, 52.6] });
  });
});
