import { describe, expect, it } from 'vitest';
import {
  CLUSTER_MAX_ZOOM,
  FREE_PIN_CLUSTER_RADIUS_PX,
  clusterExpansionZoom,
  clusterSpots,
  type ClusterableSpot,
} from './clusterMarkers';

/* Berlin Mitte, where the overlap was measured. */
const BASE = { lat: 52.52, lng: 13.405 };

function spot(id: string, dLat = 0, dLng = 0): ClusterableSpot {
  return { _id: id, lat: BASE.lat + dLat, lng: BASE.lng + dLng };
}

interface LatLng {
  lat: number;
  lng: number;
}

/** Screen pixels between two points at a zoom — the unit the radius is in. */
function pixelDistance(a: LatLng, b: LatLng, zoom: number): number {
  const world = 512 * 2 ** zoom;
  const x = (p: LatLng) => ((p.lng + 180) / 360) * world;
  const y = (p: LatLng) => {
    const sin = Math.sin((p.lat * Math.PI) / 180);
    return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world;
  };
  return Math.hypot(x(a) - x(b), y(a) - y(b));
}

describe('clusterSpots', () => {
  it('leaves every spot on its own when clustering is off', () => {
    const spots = [spot('a'), spot('b', 0.0001), spot('c', 0.0002)];
    const groups = clusterSpots(spots, 12, 0);

    expect(groups).toHaveLength(3);
    expect(groups.every((g) => g.members.length === 1)).toBe(true);
  });

  it('merges spots that would overlap and splits them again once zoomed in', () => {
    // ~0.0015° of latitude apart: about 14px at z12, about 460px at z17.
    const near = [spot('a'), spot('b', 0.0015)];
    expect(Math.round(pixelDistance(near[0], near[1], 12))).toBeLessThan(
      FREE_PIN_CLUSTER_RADIUS_PX
    );

    expect(clusterSpots(near, 12, FREE_PIN_CLUSTER_RADIUS_PX)).toHaveLength(1);
    expect(clusterSpots(near, 17, FREE_PIN_CLUSTER_RADIUS_PX)).toHaveLength(2);
  });

  it('keeps every anchor more than a radius apart — the overlap guarantee', () => {
    /* A 12×12 lattice tight enough that most of it collapses; the point is that
       whatever survives can no longer paint over its neighbour. Anchoring on
       the seed rather than on the centroid is what buys this: a centroid can
       drift back inside another group's radius. */
    const spots: ClusterableSpot[] = [];
    for (let i = 0; i < 12; i += 1) {
      for (let j = 0; j < 12; j += 1) {
        spots.push(spot(`s-${i}-${j}`, i * 0.0008, j * 0.0012));
      }
    }

    const groups = clusterSpots(spots, 13, FREE_PIN_CLUSTER_RADIUS_PX);
    expect(groups.length).toBeLessThan(spots.length);

    for (let i = 0; i < groups.length; i += 1) {
      for (let j = i + 1; j < groups.length; j += 1) {
        expect(pixelDistance(groups[i], groups[j], 13)).toBeGreaterThan(FREE_PIN_CLUSTER_RADIUS_PX);
      }
    }
  });

  it('holds on to every spot exactly once', () => {
    const spots = Array.from({ length: 40 }, (_, i) =>
      spot(`s-${i}`, (i % 7) * 0.0009, Math.floor(i / 7) * 0.0009)
    );
    const seen = clusterSpots(spots, 13, FREE_PIN_CLUSTER_RADIUS_PX).flatMap((g) =>
      g.members.map((m) => m._id)
    );

    expect(seen).toHaveLength(spots.length);
    expect(new Set(seen).size).toBe(spots.length);
  });

  it('ignores the order of the input array', () => {
    /* displayedRestaurants is re-sorted by distance as soon as a location
       arrives. Clustering that reacted to array order would rebuild the whole
       map at the moment the user grants the permission. */
    const spots = Array.from({ length: 30 }, (_, i) =>
      spot(`s-${i}`, (i % 6) * 0.001, Math.floor(i / 6) * 0.001)
    );
    const shuffled = [...spots].reverse();

    const key = (list: ClusterableSpot[]) =>
      clusterSpots(list, 13, FREE_PIN_CLUSTER_RADIUS_PX)
        .map(
          (g) =>
            `${g.key}:${g.members
              .map((m) => m._id)
              .sort()
              .join(',')}`
        )
        .sort();

    expect(key(shuffled)).toEqual(key(spots));
  });

  it('anchors the group on one of its own members', () => {
    const spots = [spot('a'), spot('b', 0.0004), spot('c', 0.0008)];
    const [group] = clusterSpots(spots, 12, FREE_PIN_CLUSTER_RADIUS_PX);

    expect(group.members).toHaveLength(3);
    expect(group.members.some((m) => m.lat === group.lat && m.lng === group.lng)).toBe(true);
  });
});

describe('clusterExpansionZoom', () => {
  it('returns the first zoom at which the cluster is no longer one marker', () => {
    const members = [spot('a'), spot('b', 0.0015)];
    const zoom = clusterExpansionZoom(members, 12, FREE_PIN_CLUSTER_RADIUS_PX);

    expect(zoom).toBeGreaterThan(12);
    expect(clusterSpots(members, zoom, FREE_PIN_CLUSTER_RADIUS_PX).length).toBeGreaterThan(1);
    expect(clusterSpots(members, zoom - 1, FREE_PIN_CLUSTER_RADIUS_PX)).toHaveLength(1);
  });

  it('still moves the camera for members sharing a coordinate', () => {
    // Nothing splits these, so the tap must not become a no-op.
    const members = [spot('a'), spot('b')];
    expect(clusterExpansionZoom(members, 12, FREE_PIN_CLUSTER_RADIUS_PX)).toBe(CLUSTER_MAX_ZOOM);
  });
});
