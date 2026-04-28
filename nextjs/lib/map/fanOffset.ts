const MIN_ZOOM = 13

type RestaurantRef = { _id: string; lat: number; lng: number }
type MustEatInput = { _id: string; restaurant: RestaurantRef }

export type MustEatWithDisplay<T extends MustEatInput> = T & {
  displayLat: number
  displayLng: number
  /** Rotation in degrees. Applied via CSS transform with bottom-center origin
   *  so the cards' bottoms stay anchored on the restaurant point and only the
   *  tops fan out — like a hand of playing cards. 0 = single card, no rotation. */
  fanRotation: number
  /** Order in the fan (0 = leftmost = back). Used as z-index so the centre
   *  cards stack on top of the outer ones. */
  fanIndex: number
  /** Total fan size — used by the marker to compute z-index relative to centre. */
  fanCount: number
}

// Total spread (degrees) for N cards. Subtle: 2 cards ≈ 16°, 3 ≈ 24°, 4 ≈ 30°,
// capped at 36° so even big stacks stay legible. Each card's rotation =
// -spread/2 + step * i.
function spreadFor(n: number): number {
  if (n <= 1) return 0
  return Math.min(36, 8 * (n - 1))
}

export function applyFanOffset<T extends MustEatInput>(
  mustEats: T[],
  zoom: number,
): MustEatWithDisplay<T>[] {
  if (zoom < MIN_ZOOM) {
    // Low zoom: collapse to one marker per restaurant (no rotation).
    const seen = new Set<string>()
    return mustEats
      .filter(m => {
        if (seen.has(m.restaurant._id)) return false
        seen.add(m.restaurant._id)
        return true
      })
      .map(m => ({
        ...m,
        displayLat: m.restaurant.lat,
        displayLng: m.restaurant.lng,
        fanRotation: 0,
        fanIndex: 0,
        fanCount: 1,
      }))
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
    const n = group.length
    if (n === 1) {
      out.push({ ...group[0], displayLat: lat, displayLng: lng, fanRotation: 0, fanIndex: 0, fanCount: 1 })
      continue
    }
    const spread = spreadFor(n)
    const step = spread / (n - 1)
    group.forEach((m, i) => {
      // Same lat/lng for every card in the group — the fan is created purely
      // via CSS rotation around each marker's bottom-centre. Bottoms stay
      // anchored on the restaurant point, tops fan out.
      out.push({
        ...m,
        displayLat: lat,
        displayLng: lng,
        fanRotation: -spread / 2 + step * i,
        fanIndex: i,
        fanCount: n,
      })
    })
  }
  return out
}
