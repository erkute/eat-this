import type { MapRestaurant } from '@/lib/types';

/** Where the camera should go for a set of matches. `null` = stay put. */
export type CameraTarget =
  | { kind: 'point'; lat: number; lng: number }
  | { kind: 'bounds'; sw: [number, number]; ne: [number, number] };

/**
 * Camera target for a match set: nothing for an empty set, a centred point for
 * a single spot (bounds of one coordinate are degenerate — MapLibre fits them
 * at max zoom), a bounding box for the rest.
 */
export function spotsCameraTarget(list: MapRestaurant[]): CameraTarget | null {
  if (!list.length) return null;
  if (list.length === 1) {
    const [r] = list;
    return { kind: 'point', lat: r.lat, lng: r.lng };
  }
  const lngs = list.map((r) => r.lng);
  const lats = list.map((r) => r.lat);
  return {
    kind: 'bounds',
    sw: [Math.min(...lngs), Math.min(...lats)],
    ne: [Math.max(...lngs), Math.max(...lats)],
  };
}
