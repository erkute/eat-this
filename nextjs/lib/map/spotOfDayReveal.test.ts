import { describe, it, expect } from 'vitest'
import { applySpotOfDayReveal } from './spotOfDayReveal'
import type { MapRestaurant, MapMustEat } from '@/lib/types'

const rest = (id: string): MapRestaurant => ({
  _id: id, name: id, slug: id, lat: 0, lng: 0,
} as unknown as MapRestaurant)

const me = (id: string, restId: string): MapMustEat => ({
  _id: id, dish: id, image: '', restaurant: { _id: restId, name: restId, slug: restId, lat: 0, lng: 0 },
} as unknown as MapMustEat)

const slice = (over: Partial<Parameters<typeof applySpotOfDayReveal>[3]> = {}) => ({
  restaurants: [], lockedRestaurants: [], mustEats: [], revealedMustEatIds: new Set<string>(), ...over,
})

describe('applySpotOfDayReveal', () => {
  const all = [rest('owned'), rest('sotd'), rest('other')]
  const allMe = [me('me-owned', 'owned'), me('me-sotd', 'sotd')]

  it('no-ops when spotId is null', () => {
    const s = slice({ restaurants: [rest('owned')] })
    expect(applySpotOfDayReveal(null, all, allMe, s)).toBe(s)
  })

  it('surfaces the spot even when it has no must-eats (shown regardless)', () => {
    const s = slice({ lockedRestaurants: [rest('other')] })
    const out = applySpotOfDayReveal('other', all, allMe, s)
    expect(out.restaurants.some((r) => r._id === 'other')).toBe(true)
    expect(out.lockedRestaurants.some((r) => r._id === 'other')).toBe(false)
    expect(out.mustEats).toHaveLength(0)
    expect(out.revealedMustEatIds.size).toBe(0)
  })

  it('surfaces a locked spot of the day into visible + reveals its must-eat', () => {
    const s = slice({
      restaurants: [rest('owned')],
      lockedRestaurants: [rest('sotd'), rest('other')],
      mustEats: [me('me-owned', 'owned')],
    })
    const out = applySpotOfDayReveal('sotd', all, allMe, s)
    expect(out.restaurants.some((r) => r._id === 'sotd')).toBe(true)
    expect(out.lockedRestaurants.some((r) => r._id === 'sotd')).toBe(false)
    expect(out.mustEats.some((m) => m._id === 'me-sotd')).toBe(true)
    expect(out.revealedMustEatIds.has('me-sotd')).toBe(true)
    // didn't drop the other locked spot or the existing must-eat
    expect(out.lockedRestaurants.some((r) => r._id === 'other')).toBe(true)
    expect(out.mustEats.some((m) => m._id === 'me-owned')).toBe(true)
  })

  it('only reveals (no duplication) when the spot is already visible', () => {
    const s = slice({
      restaurants: [rest('sotd')],
      mustEats: [me('me-sotd', 'sotd')],
    })
    const out = applySpotOfDayReveal('sotd', all, allMe, s)
    expect(out.restaurants.filter((r) => r._id === 'sotd')).toHaveLength(1)
    expect(out.mustEats.filter((m) => m._id === 'me-sotd')).toHaveLength(1)
    expect(out.revealedMustEatIds.has('me-sotd')).toBe(true)
  })
})
