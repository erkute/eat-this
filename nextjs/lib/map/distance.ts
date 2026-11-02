export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Walking time at an average pedestrian pace of ~80 m/min (≈ 4.8 km/h).
 * Returns null beyond ~1600 m (≈ 20 min) — anything further reads as
 * off-putting ("oh god, 90 min on foot") and the address-section's Maps
 * button is the right tool for those routes.
 */
export function formatWalkingTime(meters: number): string | null {
  const minutes = walkingMinutes(meters);
  return minutes === null ? null : `${minutes} Min`;
}

/** Die Gehminuten hinter formatWalkingTime, als Zahl (null ab ~1600 m). */
function walkingMinutes(meters: number): number | null {
  if (meters > 1600) return null;
  return Math.max(1, Math.ceil(meters / 80));
}
