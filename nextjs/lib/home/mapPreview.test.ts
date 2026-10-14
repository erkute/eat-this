import { describe, expect, it } from 'vitest';
import type { MapRestaurant } from '@/lib/types';
import { distanceKm, nearbyCluster, spreadPreviewPins } from './mapPreview';

describe('homepage pin spacing', () => {
  const spots = Array.from({ length: 20 }, (_, index) => ({
    _id: String(index), lat: 52 + index / 1000, lng: 13 + index / 1000,
  })) as MapRestaurant[];
  const project = (spot: MapRestaurant) => ({ x: Number(spot._id) % 5 * 50, y: Math.floor(Number(spot._id) / 5) * 65 });

  it('keeps the active pin and separates every pair without changing coordinates', () => {
    const pins = spreadPreviewPins(spots, project, '3');
    expect(pins[0]).toBe(spots[3]);
    expect(pins.length).toBeGreaterThan(3);
    expect(pins.length).toBeLessThan(spots.length);
    for (const [index, pin] of pins.entries()) {
      expect(spots).toContain(pin);
      for (const other of pins.slice(index + 1)) {
        const a = project(pin), b = project(other);
        expect(Math.abs(a.x - b.x) >= 56 || Math.abs(a.y - b.y) >= 60).toBe(true);
      }
    }
  });

  it('starts with the editorial lead and fills a roomy map up to twelve pins', () => {
    const pins = spreadPreviewPins(spots, (spot) => ({ x: Number(spot._id) * 100, y: 100 }), null);
    expect(pins[0]).toBe(spots[0]);
    expect(pins).toHaveLength(12);
    expect(spreadPreviewPins([], project, null)).toEqual([]);
  });
});

describe('homepage map neighbourhood', () => {
  // Mitte (52.53, 13.40) dicht, dazu je ein Spot in Spandau und Köpenick.
  const mitte = [
    { id: 'a', lat: 52.5300, lng: 13.4000 },
    { id: 'b', lat: 52.5310, lng: 13.4050 },
    { id: 'c', lat: 52.5280, lng: 13.3950 },
    { id: 'd', lat: 52.5250, lng: 13.4080 },
  ];
  const far = [
    { id: 'spandau', lat: 52.5360, lng: 13.2000 },
    { id: 'koepenick', lat: 52.4450, lng: 13.5750 },
  ];

  it('frames the corner around the lead recommendation, keeping the ranking', () => {
    const cluster = nearbyCluster([mitte[2], far[0], mitte[0], far[1], mitte[1], mitte[3]]);
    expect(cluster.map((spot) => spot.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('falls back to the densest corner when the lead stands alone', () => {
    const cluster = nearbyCluster([far[0], ...mitte, far[1]]);
    expect(cluster.map((spot) => spot.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps every spot when there are too few to choose from', () => {
    expect(nearbyCluster([mitte[0], ...far])).toHaveLength(3);
  });

  it('measures Berlin distances in kilometres', () => {
    expect(distanceKm(mitte[0], far[0])).toBeGreaterThan(13);
    expect(distanceKm(mitte[0], far[0])).toBeLessThan(14);
  });
});
