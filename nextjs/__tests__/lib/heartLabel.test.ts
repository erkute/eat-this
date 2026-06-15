import { describe, it, expect } from 'vitest'
import { heartLabel } from '@/lib/map/heartLabel'

describe('heartLabel', () => {
  it('hides below 1 (no "loved by 0")', () => {
    expect(heartLabel(0, 'de')).toBeNull()
    expect(heartLabel(0, 'en')).toBeNull()
    expect(heartLabel(-3, 'de')).toBeNull()
  })

  it('hides on non-finite input', () => {
    expect(heartLabel(NaN, 'de')).toBeNull()
    expect(heartLabel(Infinity, 'en')).toBeNull()
  })

  it('uses singular for exactly 1', () => {
    expect(heartLabel(1, 'de')).toBe('geherzt von 1 Person')
    expect(heartLabel(1, 'en')).toBe('loved by 1 person')
  })

  it('uses plural above 1', () => {
    expect(heartLabel(2, 'de')).toBe('geherzt von 2 Leuten')
    expect(heartLabel(50, 'en')).toBe('loved by 50 people')
  })

  it('floors fractional counts', () => {
    expect(heartLabel(2.9, 'de')).toBe('geherzt von 2 Leuten')
  })

  it('defaults to German for any non-en locale', () => {
    expect(heartLabel(5, 'fr')).toBe('geherzt von 5 Leuten')
  })
})
