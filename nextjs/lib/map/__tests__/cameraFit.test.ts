import { describe, it, expect } from 'vitest';
import { spotsCameraTarget } from '../cameraFit';
import type { MapRestaurant } from '@/lib/types';

const spot = (id: string, lat: number, lng: number): MapRestaurant =>
  ({ _id: id, name: id, lat, lng }) as unknown as MapRestaurant;

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
