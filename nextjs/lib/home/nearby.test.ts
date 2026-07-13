import { describe, it, expect } from 'vitest'
import { nearestRestaurants } from './nearby'
import type { MapRestaurant } from '@/lib/types'

const R = (id: string, lat: number, lng: number) =>
  ({ _id: id, name: id, slug: id, lat, lng }) as unknown as MapRestaurant
const MITTE = { lat: 52.52, lng: 13.405 }

describe('nearestRestaurants', () => {
  it('sorts by distance to the location and caps at n', () => {
    const far = R('far', 52.6, 13.5)
    const near = R('near', 52.521, 13.406)
    const mid = R('mid', 52.55, 13.45)
    const out = nearestRestaurants([far, near, mid], MITTE, 2)
    expect(out.map((r) => r._id)).toEqual(['near', 'mid'])
  })
  it('returns [] for an empty list', () => {
    expect(nearestRestaurants([], MITTE, 4)).toEqual([])
  })
  it('does not mutate the input array', () => {
    const input = [R('far', 52.6, 13.5), R('near', 52.521, 13.406)]
    nearestRestaurants(input, MITTE, 2)
    expect(input.map((r) => r._id)).toEqual(['far', 'near'])
  })
})
