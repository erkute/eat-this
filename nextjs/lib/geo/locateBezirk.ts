import ortsteile from './berlin-ortsteile.json'

// Berlin Ortsteil (neighbourhood) boundaries, simplified from the official
// Geoportal Berlin "lor_ortsteile" dataset (CRS84 / WGS84 lng,lat). Names match
// the bezirk labels used on restaurants ("Alt-Treptow" is aliased to "Treptow"
// during the build of this file). Server-side only — keeps the ~74 KB polygon
// set out of the client bundle.

type Ring = [number, number][]

interface OrtsteilFeature {
  properties: { name: string }
  geometry:
    | { type: 'Polygon'; coordinates: Ring[] }
    | { type: 'MultiPolygon'; coordinates: Ring[][] }
}

const FEATURES = (ortsteile as unknown as { features: OrtsteilFeature[] }).features

/** Ray-casting test: is (lng,lat) inside a single ring? */
function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** Inside the outer ring and outside every hole. */
function inPolygon(lng: number, lat: number, rings: Ring[]): boolean {
  if (rings.length === 0 || !inRing(lng, lat, rings[0])) return false
  for (let h = 1; h < rings.length; h++) {
    if (inRing(lng, lat, rings[h])) return false
  }
  return true
}

/**
 * The Berlin Ortsteil containing the given point, or null if the point is
 * outside Berlin. Point-in-polygon over the official neighbourhood boundaries.
 */
export function locateBezirk(lat: number, lng: number): string | null {
  for (const f of FEATURES) {
    const g = f.geometry
    if (g.type === 'Polygon') {
      if (inPolygon(lng, lat, g.coordinates)) return f.properties.name
    } else {
      for (const poly of g.coordinates) {
        if (inPolygon(lng, lat, poly)) return f.properties.name
      }
    }
  }
  return null
}
