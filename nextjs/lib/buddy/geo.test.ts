// nextjs/lib/buddy/geo.test.ts
import { describe, it, expect } from 'vitest'
import { distanceKm, distanceLabel } from './geo'

describe('distanceKm', () => {
  it('is ~0 for the same point', () => {
    expect(distanceKm({ lat: 52.52, lng: 13.405 }, { lat: 52.52, lng: 13.405 })).toBeCloseTo(0, 5)
  })
  it('matches a known Berlin distance (Alexanderplatz ↔ Brandenburger Tor ≈ 2.2 km)', () => {
    const d = distanceKm({ lat: 52.5219, lng: 13.4132 }, { lat: 52.5163, lng: 13.3777 })
    expect(d).toBeGreaterThan(2.0)
    expect(d).toBeLessThan(2.6)
  })
})

describe('distanceLabel', () => {
  it('uses metres under 1 km', () => {
    expect(distanceLabel(0.24, 'de')).toBe('240 m')
  })
  it('uses one decimal km with locale separator', () => {
    expect(distanceLabel(1.84, 'de')).toBe('1,8 km')
    expect(distanceLabel(1.84, 'en')).toBe('1.8 km')
  })
})
