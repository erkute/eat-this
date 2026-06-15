import { describe, it, expect } from 'vitest'
import { heartLabel, heartCountShort } from '@/lib/map/heartLabel'

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

describe('heartCountShort', () => {
  it('returns empty below 1', () => {
    expect(heartCountShort(0)).toBe('')
    expect(heartCountShort(NaN)).toBe('')
    expect(heartCountShort(-5)).toBe('')
  })

  it('shows exact integers up to 999', () => {
    expect(heartCountShort(1)).toBe('1')
    expect(heartCountShort(142)).toBe('142')
    expect(heartCountShort(999)).toBe('999')
    expect(heartCountShort(7.8)).toBe('7') // floors
  })

  it('abbreviates thousands with a locale decimal', () => {
    expect(heartCountShort(1200, 'en')).toBe('1.2k')
    expect(heartCountShort(1200, 'de')).toBe('1,2k')
    expect(heartCountShort(1000, 'de')).toBe('1k') // trims .0
    expect(heartCountShort(15400, 'en')).toBe('15k') // no decimal ≥ 10k
  })
})
