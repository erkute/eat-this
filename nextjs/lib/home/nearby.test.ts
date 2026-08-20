import { describe, it, expect } from 'vitest';
import { nearestRestaurants, rotatingRestaurants } from './nearby';
import type { MapRestaurant } from '@/lib/types';

const R = (id: string, lat: number, lng: number) =>
  ({ _id: id, name: id, slug: id, lat, lng }) as unknown as MapRestaurant;
const MITTE = { lat: 52.52, lng: 13.405 };

describe('nearestRestaurants', () => {
  it('sorts by distance to the location and caps at n', () => {
    const far = R('far', 52.6, 13.5);
    const near = R('near', 52.521, 13.406);
    const mid = R('mid', 52.55, 13.45);
    const out = nearestRestaurants([far, near, mid], MITTE, 2);
    expect(out.map((r) => r._id)).toEqual(['near', 'mid']);
  });
  it('returns [] for an empty list', () => {
    expect(nearestRestaurants([], MITTE, 4)).toEqual([]);
  });
  it('does not mutate the input array', () => {
    const input = [R('far', 52.6, 13.5), R('near', 52.521, 13.406)];
    nearestRestaurants(input, MITTE, 2);
    expect(input.map((r) => r._id)).toEqual(['far', 'near']);
  });
});

const BERLIN = [
  R('e-neukoelln', 52.481, 13.435),
  R('a-mitte', 52.52, 13.405),
  R('c-kreuzberg', 52.499, 13.418),
  R('d-wedding', 52.548, 13.365),
  R('b-pankow', 52.569, 13.402),
];

describe('rotatingRestaurants', () => {
  it('returns the same pick for the same day — SSR and hydration must agree', () => {
    const a = rotatingRestaurants(BERLIN, '2026-08-20', 3);
    const b = rotatingRestaurants(BERLIN, '2026-08-20', 3);
    expect(a.map((r) => r._id)).toEqual(b.map((r) => r._id));
  });

  it('is independent of the incoming order', () => {
    const shuffled = [BERLIN[3], BERLIN[0], BERLIN[4], BERLIN[2], BERLIN[1]];
    expect(rotatingRestaurants(shuffled, '2026-08-20', 3).map((r) => r._id)).toEqual(
      rotatingRestaurants(BERLIN, '2026-08-20', 3).map((r) => r._id)
    );
  });

  it('moves on across a run of days', () => {
    const days = ['2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24'];
    const firsts = new Set(days.map((d) => rotatingRestaurants(BERLIN, d, 2)[0]._id));
    // Not asserting a change every single day — a hash can land twice — but a
    // week must not be stuck on one spot the way the Mitte centroid was.
    expect(firsts.size).toBeGreaterThan(1);
  });

  it('spreads across the whole list, not just one corner', () => {
    const days = Array.from({ length: 30 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
    const seen = new Set(days.flatMap((d) => rotatingRestaurants(BERLIN, d, 2).map((r) => r._id)));
    expect(seen.size).toBe(BERLIN.length);
  });

  it('caps at the list length and survives an empty list', () => {
    expect(rotatingRestaurants(BERLIN, '2026-08-20', 99)).toHaveLength(BERLIN.length);
    expect(rotatingRestaurants([], '2026-08-20', 4)).toEqual([]);
  });

  it('does not repeat a spot within one pick', () => {
    const ids = rotatingRestaurants(BERLIN, '2026-08-20', 5).map((r) => r._id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not mutate the input array', () => {
    const before = BERLIN.map((r) => r._id);
    rotatingRestaurants(BERLIN, '2026-08-20', 3);
    expect(BERLIN.map((r) => r._id)).toEqual(before);
  });
});
