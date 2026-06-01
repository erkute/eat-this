import { describe, it, expect } from 'vitest'
import { nearestRestaurants, nearbyMustEats } from './nearby'

const R = (id: string, lat: number, lng: number) =>
  ({ _id: id, name: id, slug: id, lat, lng }) as any
const M = (id: string, lat: number, lng: number) =>
  ({ _id: id, dish: id, image: '', restaurant: { _id: id, name: id, slug: id, lat, lng } }) as any
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

describe('nearbyMustEats', () => {
  it('keeps only must-eats within the radius, nearest first, capped at n', () => {
    const inA = M('a', 52.521, 13.406) // ~100m
    const inB = M('b', 52.525, 13.41) // <1km
    const outFar = M('c', 52.7, 13.7) // >1km
    const out = nearbyMustEats([outFar, inB, inA], MITTE, 1000, 5)
    expect(out.map((m) => m._id)).toEqual(['a', 'b'])
  })
  it('caps at n', () => {
    const a = M('a', 52.5205, 13.4051)
    const b = M('b', 52.521, 13.406)
    const c = M('c', 52.5215, 13.4065)
    const out = nearbyMustEats([c, b, a], MITTE, 1000, 2)
    expect(out.map((m) => m._id)).toEqual(['a', 'b'])
  })
  it('returns [] when nothing is within the radius', () => {
    expect(nearbyMustEats([M('c', 52.7, 13.7)], MITTE, 1000, 5)).toEqual([])
  })
})
