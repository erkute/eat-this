'use client'
import { useMemo } from 'react'
import Supercluster from 'supercluster'
import type { MapRestaurant } from '../types'

export type ClusterPoint =
  | { kind: 'cluster'; id: number; lat: number; lng: number; count: number; expansionZoom: number }
  | { kind: 'restaurant'; restaurant: MapRestaurant }

interface Bounds {
  north: number
  south: number
  east: number
  west: number
}

/**
 * Cluster restaurants for the current viewport via supercluster. Below
 * zoom ≈ 13 multiple restaurants in the same area collapse into a single
 * "N+" bubble; above that we show individual markers as before so the
 * user always sees real names where they care.
 */
export function useClusters(
  restaurants: MapRestaurant[],
  bounds: Bounds | null,
  zoom: number,
): ClusterPoint[] {
  // Build the index from restaurant points whenever the dataset changes.
  const index = useMemo(() => {
    const sc = new Supercluster<{ restaurant: MapRestaurant }>({
      radius: 60,    // px — tighter clusters look snappier than the default 40+
      maxZoom: 13,   // disable clustering at this zoom and higher
      minPoints: 2,
    })
    sc.load(
      restaurants.map(r => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [r.lng, r.lat] },
        properties: { restaurant: r },
      }))
    )
    return sc
  }, [restaurants])

  // Recompute the visible clusters whenever the viewport (bounds + zoom) changes.
  return useMemo(() => {
    if (!bounds) {
      // Initial render before the map fires onMove — show everything as singles.
      return restaurants.map(restaurant => ({ kind: 'restaurant' as const, restaurant }))
    }
    const bbox: [number, number, number, number] = [
      bounds.west,
      bounds.south,
      bounds.east,
      bounds.north,
    ]
    const z = Math.max(0, Math.min(20, Math.round(zoom)))
    const clusters = index.getClusters(bbox, z)
    return clusters.map((c): ClusterPoint => {
      const [lng, lat] = c.geometry.coordinates
      const props = c.properties as { cluster?: boolean; cluster_id?: number; point_count?: number; restaurant?: MapRestaurant }
      if (props.cluster && props.cluster_id != null) {
        const expansionZoom = Math.min(20, index.getClusterExpansionZoom(props.cluster_id))
        return {
          kind: 'cluster',
          id: props.cluster_id,
          lat,
          lng,
          count: props.point_count ?? 0,
          expansionZoom,
        }
      }
      return {
        kind: 'restaurant',
        restaurant: props.restaurant!,
      }
    })
  }, [index, bounds, zoom, restaurants])
}
