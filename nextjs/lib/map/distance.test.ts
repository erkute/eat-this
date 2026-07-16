import { describe, it, expect } from 'vitest'
import {
  haversineDistance,
  formatDistance,
  formatLocalizedDistance,
  formatWalkingTime,
} from './distance'

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

describe('formatLocalizedDistance', () => {
  it('uses localized kilometer decimals with a readable unit gap', () => {
    expect(formatLocalizedDistance(2400, 'de')).toBe('2,4 km')
    expect(formatLocalizedDistance(2400, 'en')).toBe('2.4 km')
  })

  it('keeps short distances in meters', () => {
    expect(formatLocalizedDistance(420, 'de')).toBe('420 m')
  })
})

describe('formatWalkingTime', () => {
  it('rounds up so short walks read as at least 1 Min', () => {
    expect(formatWalkingTime(50)).toBe('1 Min')
  })

  it('returns minutes within the 1600m comfort threshold', () => {
    expect(formatWalkingTime(800)).toBe('10 Min')
    expect(formatWalkingTime(1600)).toBe('20 Min')
  })

  it('returns null beyond the 1600m walking threshold', () => {
    expect(formatWalkingTime(1601)).toBeNull()
    expect(formatWalkingTime(5000)).toBeNull()
  })
})
