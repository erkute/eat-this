const FAN_RADIUS_LAT = 0.00015 // ≈ 16 m north–south
const MIN_ZOOM = 13

type RestaurantRef = { _id: string; lat: number; lng: number }
type MustEatInput = { _id: string; restaurant: RestaurantRef }

export type MustEatWithDisplay<T extends MustEatInput> = T & {
  displayLat: number
  displayLng: number
}

export function applyFanOffset<T extends MustEatInput>(
  mustEats: T[],
  zoom: number,
): MustEatWithDisplay<T>[] {
  if (zoom < MIN_ZOOM) {
    // One marker per restaurant at low zoom
    const seen = new Set<string>()
    return mustEats
      .filter(m => {
        if (seen.has(m.restaurant._id)) return false
        seen.add(m.restaurant._id)
        return true
      })
      .map(m => ({ ...m, displayLat: m.restaurant.lat, displayLng: m.restaurant.lng }))
  }

  const groups = new Map<string, T[]>()
  for (const m of mustEats) {
    const g = groups.get(m.restaurant._id) ?? []
    g.push(m)
    groups.set(m.restaurant._id, g)
  }

  const out: MustEatWithDisplay<T>[] = []
  for (const group of groups.values()) {
    const { lat, lng } = group[0].restaurant
    if (group.length === 1) {
      out.push({ ...group[0], displayLat: lat, displayLng: lng })
      continue
    }
    const step = (2 * Math.PI) / group.length
    const lngScale = Math.cos((lat * Math.PI) / 180)
    group.forEach((m, i) => {
      // Start at π/2 so the first pair of markers spreads north/south
      // rather than east/west (sin(0)=0 would leave lat unchanged).
      const angle = Math.PI / 2 + i * step
      out.push({
        ...m,
        displayLat: lat + FAN_RADIUS_LAT * Math.sin(angle),
        displayLng: lng + (FAN_RADIUS_LAT * Math.cos(angle)) / lngScale,
      })
    })
  }
  return out
}
