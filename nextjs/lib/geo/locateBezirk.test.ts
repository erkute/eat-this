import { describe, it, expect } from 'vitest'
import { locateBezirk } from './locateBezirk'

describe('locateBezirk', () => {
  it('maps known Berlin coordinates to their Ortsteil', () => {
    expect(locateBezirk(52.4845, 13.3556)).toBe('Schöneberg') // Akazienstraße
    expect(locateBezirk(52.5215, 13.413)).toBe('Mitte') // Alexanderplatz
    expect(locateBezirk(52.483, 13.4356)).toBe('Neukölln') // Weserstraße
    expect(locateBezirk(52.5374, 13.4186)).toBe('Prenzlauer Berg') // Kollwitzplatz
    expect(locateBezirk(52.4889, 13.3927)).toBe('Kreuzberg') // Bergmannstraße
  })

  it('aliases the official "Alt-Treptow" Ortsteil to the data label "Treptow"', () => {
    expect(locateBezirk(52.4925, 13.4516)).toBe('Treptow')
  })

  it('returns null for points outside Berlin', () => {
    expect(locateBezirk(48.1351, 11.582)).toBeNull() // Munich
    expect(locateBezirk(0, 0)).toBeNull()
  })
})
