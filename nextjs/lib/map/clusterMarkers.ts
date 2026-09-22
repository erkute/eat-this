/**
 * Groups the pins — but only once the map is zoomed out past the default view.
 *
 * History: clustering at every zoom shipped on 18.08.2026 and came out again a
 * day later (user decision): at the default camera most of what you could tap
 * was a number, and a count tells a hungry person nothing about what is there.
 * The carpet of brand pins at the default view is wanted — it shows how much
 * there is.
 *
 * Zoomed further out, though, the pins pile into a single yellow slab that
 * can no longer be read or tapped, and every one of them is a DOM node the
 * map repositions on each frame of a pan. Only there do neighbours merge into
 * one brand pin carrying their count (user, 22.09.2026: "wenn man's komplett
 * rauszoomt ... das Icon lassen und da drüber eine Zahl").
 *
 * The algorithm is greedy over Web Mercator pixel space, the way supercluster
 * works, with two deliberate properties:
 *
 *  - The group anchor is the SEED member, not the centroid. A centroid can
 *    drift back inside another group's radius; seeding guarantees any two
 *    anchors stay more than `radiusPx` apart.
 *  - Input is sorted geographically before the scan, so the result does not
 *    depend on array order. `displayedRestaurants` is re-sorted by distance
 *    the moment a location arrives — without this the map would re-cluster on
 *    a geolocation grant.
 */

/** MapLibre's tiles are 512px, so one world spans 512 · 2^zoom pixels. */
const WORLD_TILE_PX = 512;

/** Pins are a 44px box (`.pinLogo` min-size) — 48 leaves a visible gap. */
export const CLUSTER_RADIUS_PX = 48;

/**
 * Below this zoom pins group; at and above it every spot is its own pin.
 * The map opens at z12 (MapCanvas), so the default view is never grouped —
 * clustering starts only once you zoom out beyond it.
 */
export const CLUSTER_BELOW_ZOOM = 11.5;

/**
 * The zoom clusters are computed at, or `null` when clustering is off.
 *
 * Snapped down to half steps so groups only change when the zoom crosses a
 * step — a pinch then re-renders markers a handful of times, not per frame.
 */
export function clusterZoomStep(zoom: number): number | null {
  if (!(zoom < CLUSTER_BELOW_ZOOM)) return null;
  return Math.floor(zoom * 2) / 2;
}

export interface ClusterableSpot {
  _id: string;
  lat: number;
  lng: number;
}

export interface MarkerGroup<T extends ClusterableSpot> {
  /** The seed member's id — stable for as long as the zoom step holds. */
  key: string;
  lat: number;
  lng: number;
  members: T[];
}

function projectX(lng: number, worldSize: number): number {
  return ((lng + 180) / 360) * worldSize;
}

function projectY(lat: number, worldSize: number): number {
  const sin = Math.sin((lat * Math.PI) / 180);
  // Clamped so the poles stay finite; irrelevant for Berlin, cheap insurance
  // against a bad coordinate in the dataset taking the whole map down.
  const clamped = Math.min(Math.max(sin, -0.9999), 0.9999);
  return (0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI)) * worldSize;
}

/** Group spots that fall within `radiusPx` of each other at `zoom`. */
export function clusterSpots<T extends ClusterableSpot>(
  spots: T[],
  zoom: number,
  radiusPx: number = CLUSTER_RADIUS_PX
): MarkerGroup<T>[] {
  const worldSize = WORLD_TILE_PX * 2 ** Math.max(0, zoom);
  const points = spots
    .map((spot) => ({
      spot,
      x: projectX(spot.lng, worldSize),
      y: projectY(spot.lat, worldSize),
    }))
    .sort((a, b) => a.y - b.y || a.x - b.x || a.spot._id.localeCompare(b.spot._id));

  const taken = new Array<boolean>(points.length).fill(false);
  const groups: MarkerGroup<T>[] = [];
  const radiusSq = radiusPx * radiusPx;

  for (let i = 0; i < points.length; i += 1) {
    if (taken[i]) continue;
    taken[i] = true;
    const seed = points[i];
    const members = [seed.spot];
    // Sorted north-to-south, so once the row gap exceeds the radius nothing
    // further down can reach this seed — one pass instead of n².
    for (let j = i + 1; j < points.length; j += 1) {
      const dy = points[j].y - seed.y;
      if (dy > radiusPx) break;
      if (taken[j]) continue;
      const dx = points[j].x - seed.x;
      if (dx * dx + dy * dy > radiusSq) continue;
      taken[j] = true;
      members.push(points[j].spot);
    }
    groups.push({ key: seed.spot._id, lat: seed.spot.lat, lng: seed.spot.lng, members });
  }

  return groups;
}

/**
 * Where tapping a cluster takes the camera: the members' centre, at the zoom
 * where they stop being grouped. That is the default view's zoom band, so one
 * tap always lands on pins, never on a smaller cluster.
 */
export function clusterTarget<T extends ClusterableSpot>(
  members: T[],
  fromZoom: number
): { lat: number; lng: number; zoom: number } {
  let lat = 0;
  let lng = 0;
  for (const m of members) {
    lat += m.lat;
    lng += m.lng;
  }
  return {
    lat: lat / members.length,
    lng: lng / members.length,
    zoom: Math.max(fromZoom + 1, 12),
  };
}
