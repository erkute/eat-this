/**
 * Pixel-radius clustering for the map markers.
 *
 * Measured at the default camera on a 375×812 viewport: 10 free pins sit in
 * the visible map strip with 5 pairs closer than 40px — at a 44px marker box
 * that means two of them never receive a tap at their own centre (a neighbour
 * paints over it). The same strip carries 130 locked dots with 90 pairs
 * overlapping. Both sorts have to be clustered, or clustering the pins alone
 * would just uncover a carpet underneath.
 *
 * The algorithm is greedy over Web Mercator pixel space, the way supercluster
 * works, with two deliberate properties:
 *
 *  - The group anchor is the SEED member, not the centroid. A centroid can
 *    drift back inside another group's radius, which is exactly the overlap
 *    being fixed; seeding guarantees that any two anchors are more than
 *    `radiusPx` apart. That is the property the measurement checks.
 *  - Input is sorted geographically before the scan, so the result does not
 *    depend on the order of the array handed in. `displayedRestaurants` is
 *    re-sorted by distance the moment a location arrives — without this the
 *    whole map would re-cluster on a geolocation grant.
 */

/** MapLibre's tiles are 512px, so one world spans 512 · 2^zoom pixels. */
const WORLD_TILE_PX = 512;

/** Free pins are a 44px box (`.pinLogo` min-width) — 48 leaves a visible gap. */
export const FREE_PIN_CLUSTER_RADIUS_PX = 48;

/** Locked dots are 11px and grow to 22px as clusters (`.pinLockedDot`). */
export const LOCKED_DOT_CLUSTER_RADIUS_PX = 26;

/**
 * Above this zoom every marker is drawn on its own. At z17 over Berlin one
 * pixel is ~0.36m, so 48px is ~17m — spots closer than that are the same
 * doorway, and the honest thing is to show them touching rather than to offer
 * a cluster that cannot be split any further.
 */
export const CLUSTER_MAX_ZOOM = 17;

export interface ClusterableSpot {
  _id: string;
  lat: number;
  lng: number;
}

export interface MarkerGroup<T extends ClusterableSpot> {
  /** The seed member's id — stable for as long as the zoom level holds. */
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

/**
 * Group spots that fall within `radiusPx` of each other at `zoom`.
 *
 * A radius of 0 (or fewer than two spots) returns one group per spot, which is
 * how the caller turns clustering off past `CLUSTER_MAX_ZOOM`.
 */
export function clusterSpots<T extends ClusterableSpot>(
  spots: T[],
  zoom: number,
  radiusPx: number
): MarkerGroup<T>[] {
  const solo = (spot: T): MarkerGroup<T> => ({
    key: spot._id,
    lat: spot.lat,
    lng: spot.lng,
    members: [spot],
  });
  if (radiusPx <= 0 || spots.length < 2) return spots.map(solo);

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
 * The zoom a cluster has to reach before it breaks into more than one marker —
 * what tapping it should ease to. Capped at `maxZoom`, where clustering is off
 * anyway, so members sharing a coordinate still resolve to a real move.
 */
export function clusterExpansionZoom<T extends ClusterableSpot>(
  members: T[],
  fromZoom: number,
  radiusPx: number,
  maxZoom: number = CLUSTER_MAX_ZOOM
): number {
  for (let zoom = Math.floor(fromZoom) + 1; zoom < maxZoom; zoom += 1) {
    if (clusterSpots(members, zoom, radiusPx).length > 1) return zoom;
  }
  return maxZoom;
}
