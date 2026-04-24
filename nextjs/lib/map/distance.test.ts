import { describe, it, expect } from 'vitest'
import { haversineDistance, formatDistance } from './distance'

describe('haversineDistance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistance(52.52, 13.405, 52.52, 13.405)).toBe(0)
  })

  it('calculates ~1600m between Alexanderplatz and Ostbahnhof', () => {
    const dist = haversineDistance(52.5219, 13.4132, 52.5107, 13.4341)
    expect(dist).toBeGreaterThan(1400)
    expect(dist).toBeLessThan(2000)
  })
})

describe('formatDistance', () => {
  it('shows meters when < 1000', () => {
    expect(formatDistance(350)).toBe('350m')
  })

  it('shows km with 1 decimal when >= 1000', () => {
    expect(formatDistance(1500)).toBe('1.5km')
  })
})
