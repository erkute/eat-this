export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

/**
 * Walking time at an average pedestrian pace of ~80 m/min (≈ 4.8 km/h).
 * Returns minutes rounded up so a 240 m walk reads as "3 min" not "2 min".
 */
export function formatWalkingTime(meters: number): string {
  const minutes = Math.max(1, Math.ceil(meters / 80))
  return `${minutes} Min`
}

/**
 * Public-transit estimate for an inner-city Berlin trip — average speed
 * ≈ 250 m/min (15 km/h, includes vehicle dwell + interchange) plus a flat
 * 4-minute baseline for walking to/from the stop and waiting for the next
 * service. Rough figure; tap-through to Google Maps for the real route.
 */
export function formatTransitTime(meters: number): string {
  const minutes = 4 + Math.ceil(meters / 250)
  return `${minutes} Min`
}

/**
 * Driving estimate for inner-city Berlin — average ≈ 333 m/min (20 km/h
 * factoring in lights, parking search, traffic). Rough figure; tap-through
 * to Google Maps for the real ETA.
 */
export function formatDrivingTime(meters: number): string {
  const minutes = Math.max(1, Math.ceil(meters / 333))
  return `${minutes} Min`
}
