import { describe, it, expect } from 'vitest'
import { abbreviateBezirk } from './abbreviateBezirk'

describe('abbreviateBezirk', () => {
  it("shortens Prenzlauer Berg to P'berg", () => {
    expect(abbreviateBezirk('Prenzlauer Berg')).toBe("P'berg")
  })

  it('returns other Berlin districts unchanged', () => {
    expect(abbreviateBezirk('Mitte')).toBe('Mitte')
    expect(abbreviateBezirk('Friedrichshain')).toBe('Friedrichshain')
    expect(abbreviateBezirk('Charlottenburg')).toBe('Charlottenburg')
    expect(abbreviateBezirk('Neukölln')).toBe('Neukölln')
  })

  it('passes empty / null / undefined through', () => {
    expect(abbreviateBezirk(null)).toBe(null)
    expect(abbreviateBezirk(undefined)).toBe(null)
    expect(abbreviateBezirk('')).toBe('')
  })

  it('matches case-insensitively (Sanity stores Prenzlauer Berg but be defensive)', () => {
    expect(abbreviateBezirk('prenzlauer berg')).toBe("P'berg")
    expect(abbreviateBezirk('PRENZLAUER BERG')).toBe("P'berg")
  })
})
