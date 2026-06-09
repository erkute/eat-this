// nextjs/lib/buddy/geo.ts
export interface LatLng {
  lat: number
  lng: number
}

// Great-circle distance in kilometres (haversine). Good enough for "how far is
// this spot" — we don't need road distance.
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Compact human label: "240 m" under 1 km, otherwise "1,8 km" (de) / "1.8 km".
export function distanceLabel(km: number, locale: 'de' | 'en'): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  const oneDecimal = Math.round(km * 10) / 10
  const num = locale === 'de' ? String(oneDecimal).replace('.', ',') : String(oneDecimal)
  return `${num} km`
}
