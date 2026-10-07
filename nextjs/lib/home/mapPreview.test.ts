import { describe, expect, it } from 'vitest';
import type { MapRestaurant } from '@/lib/types';
import { spreadPreviewPins } from './mapPreview';

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
