import { describe, expect, it } from 'vitest';
import {
  CLUSTER_BELOW_ZOOM,
  CLUSTER_RADIUS_PX,
  clusterSpots,
  clusterTarget,
  clusterZoomStep,
  type ClusterableSpot,
} from './clusterMarkers';

/* Berlin Mitte. */
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

describe('clusterZoomStep', () => {
  it('never groups the default view (z12) or anything closer', () => {
    expect(clusterZoomStep(12)).toBeNull();
    expect(clusterZoomStep(CLUSTER_BELOW_ZOOM)).toBeNull();
    expect(clusterZoomStep(15)).toBeNull();
  });

  it('groups once zoomed out, in half steps', () => {
    expect(clusterZoomStep(11.49)).toBe(11);
    expect(clusterZoomStep(10.7)).toBe(10.5);
    expect(clusterZoomStep(9)).toBe(9);
  });
});

describe('clusterSpots', () => {
  it('merges spots that would overlap and splits them again closer in', () => {
    // ~0.0015° of latitude apart: about 7px at z11, about 460px at z17.
    const near = [spot('a'), spot('b', 0.0015)];
    expect(pixelDistance(near[0], near[1], 11)).toBeLessThan(CLUSTER_RADIUS_PX);

    expect(clusterSpots(near, 11)).toHaveLength(1);
    expect(clusterSpots(near, 17)).toHaveLength(2);
  });

  it('keeps every anchor more than a radius apart — the overlap guarantee', () => {
    const spots: ClusterableSpot[] = [];
    for (let i = 0; i < 12; i += 1) {
      for (let j = 0; j < 12; j += 1) {
        spots.push(spot(`s-${i}-${j}`, i * 0.004, j * 0.006));
      }
    }

    const groups = clusterSpots(spots, 11);
    expect(groups.length).toBeLessThan(spots.length);
    for (let i = 0; i < groups.length; i += 1) {
      for (let j = i + 1; j < groups.length; j += 1) {
        expect(pixelDistance(groups[i], groups[j], 11)).toBeGreaterThan(CLUSTER_RADIUS_PX);
      }
    }
  });

  it('holds on to every spot exactly once', () => {
    const spots = Array.from({ length: 40 }, (_, i) =>
      spot(`s-${i}`, (i % 7) * 0.003, Math.floor(i / 7) * 0.003)
    );
    const seen = clusterSpots(spots, 11).flatMap((g) => g.members.map((m) => m._id));

    expect(seen).toHaveLength(spots.length);
    expect(new Set(seen).size).toBe(spots.length);
  });

  it('ignores the order of the input array', () => {
    /* displayedRestaurants is re-sorted by distance as soon as a location
       arrives — grouping must not rebuild the map at that moment. */
    const spots = Array.from({ length: 30 }, (_, i) =>
      spot(`s-${i}`, (i % 6) * 0.004, Math.floor(i / 6) * 0.004)
    );
    const key = (list: ClusterableSpot[]) =>
      clusterSpots(list, 11)
        .map(
          (g) =>
            `${g.key}:${g.members
              .map((m) => m._id)
              .sort()
              .join(',')}`
        )
        .sort();

    expect(key([...spots].reverse())).toEqual(key(spots));
  });

  it('anchors the group on one of its own members', () => {
    const [group] = clusterSpots([spot('a'), spot('b', 0.0004), spot('c', 0.0008)], 11);

    expect(group.members).toHaveLength(3);
    expect(group.members.some((m) => m.lat === group.lat && m.lng === group.lng)).toBe(true);
  });
});

describe('clusterTarget', () => {
  it('lands on the default view, where every member is its own pin', () => {
    const members = [spot('a'), spot('b', 0.002)];
    const target = clusterTarget(members, 10);

    expect(target.zoom).toBe(12);
    expect(clusterZoomStep(target.zoom)).toBeNull();
    expect(target.lat).toBeCloseTo(BASE.lat + 0.001, 6);
  });

  it('still moves the camera in when already close to the threshold', () => {
    expect(clusterTarget([spot('a'), spot('b')], 11.4).zoom).toBeCloseTo(12.4, 6);
  });
});
