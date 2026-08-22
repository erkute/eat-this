import type { MapRestaurant } from '@/lib/types';

/** Where the camera should go for a set of matches. `null` = stay put. */
export type CameraTarget =
  | { kind: 'point'; lat: number; lng: number }
  | { kind: 'bounds'; sw: [number, number]; ne: [number, number] };

/**
 * The spots a search query should move the camera onto: every match, free and
 * locked alike.
 *
 * A query lists both kinds as rows, so the camera has to span both or it shows
 * a fraction of the result set — five free spots framed tight while forty grey
 * ones sit off-screen. Before any of this the camera never moved for a search
 * at all, which is what made a locked-only query read as "not found": the
 * match existed, was drawn as a grey dot, and was outside the viewport.
 *
 * Fitting wide is the honest answer when the matches ARE wide. `maxZoom` at the
 * call site keeps a single-cluster result from slamming all the way in.
 */
export function searchRefitSpots(
  free: MapRestaurant[],
  locked: MapRestaurant[]
): MapRestaurant[] {
  return [...free, ...locked];
}

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
