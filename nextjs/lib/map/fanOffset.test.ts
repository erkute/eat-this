import { describe, it, expect } from 'vitest'
import { applyFanOffset } from './fanOffset'

const me = (id: string, restaurantId: string) => ({
  _id: id,
  dish: 'Test',
  image: '',
  price: null,
  restaurant: { _id: restaurantId, lat: 52.52, lng: 13.405, name: 'R', district: null, address: null, slug: '' },
})

describe('applyFanOffset', () => {
  it('passes through a single must-eat unchanged', () => {
    const result = applyFanOffset([me('m1', 'r1')], 15)
    expect(result).toHaveLength(1)
    expect(result[0].displayLat).toBe(52.52)
    expect(result[0].displayLng).toBe(13.405)
  })

  it('offsets two must-eats from the same restaurant to different positions', () => {
    const result = applyFanOffset([me('m1', 'r1'), me('m2', 'r1')], 15)
    expect(result).toHaveLength(2)
    expect(result[0].displayLat).not.toBeCloseTo(result[1].displayLat, 6)
  })

  it('keeps must-eats from different restaurants at their own coords', () => {
    const items = [
      { ...me('m1', 'r1'), restaurant: { ...me('m1', 'r1').restaurant, lat: 52.52, lng: 13.405 } },
      { ...me('m2', 'r2'), restaurant: { ...me('m2', 'r2').restaurant, lat: 52.53, lng: 13.41 } },
    ]
    const result = applyFanOffset(items, 15)
    expect(result[0].displayLat).toBe(52.52)
    expect(result[1].displayLat).toBe(52.53)
  })

  it('collapses to one marker per restaurant at zoom < 13', () => {
    const result = applyFanOffset([me('m1', 'r1'), me('m2', 'r1')], 12)
    expect(result).toHaveLength(1)
  })

  it('shows all restaurants at low zoom when they differ', () => {
    const items = [me('m1', 'r1'), me('m2', 'r2')]
    const result = applyFanOffset(items, 12)
    expect(result).toHaveLength(2)
  })
})
