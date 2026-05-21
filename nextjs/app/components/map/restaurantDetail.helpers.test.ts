import { describe, it, expect } from 'vitest'
import { formatPriceLabel, splitStatusLabel, classifyWebsite } from './restaurantDetail.helpers'

describe('formatPriceLabel', () => {
  it('formats min and max with euro', () => {
    expect(formatPriceLabel({ priceRange: { min: 10, max: 20 } })).toBe('10–20 €')
  })
  it('returns null when only min is set (no real range)', () => {
    expect(formatPriceLabel({ priceRange: { min: 15 } })).toBeNull()
  })
  it('returns null when only max is set', () => {
    expect(formatPriceLabel({ priceRange: { max: 25 } })).toBeNull()
  })
  it('returns null when no priceRange', () => {
    expect(formatPriceLabel({})).toBeNull()
  })
})

describe('splitStatusLabel', () => {
  it('splits on " · "', () => {
    expect(splitStatusLabel('Geöffnet · schließt 22:00')).toEqual({
      main: 'Geöffnet', sub: 'schließt 22:00',
    })
  })
  it('returns sub: "" when no separator', () => {
    expect(splitStatusLabel('Geschlossen')).toEqual({ main: 'Geschlossen', sub: '' })
  })
  it('returns undefined main for empty input', () => {
    expect(splitStatusLabel('')).toEqual({ main: undefined, sub: '' })
  })
})

describe('classifyWebsite', () => {
  it('detects instagram URL with handle', () => {
    expect(classifyWebsite('https://www.instagram.com/barbasta'))
      .toEqual({ kind: 'instagram', url: 'https://www.instagram.com/barbasta', handle: 'barbasta' })
  })
  it('returns "web" kind with www. display for plain host', () => {
    const r = classifyWebsite('https://example.de')
    expect(r?.kind).toBe('web')
    expect(r && r.kind === 'web' && r.display).toBe('www.example.de')
  })
  it('passes through subdomain hosts unchanged', () => {
    const r = classifyWebsite('https://book.example.de')
    expect(r && r.kind === 'web' && r.display).toBe('book.example.de')
  })
  it('returns null on falsy input', () => {
    expect(classifyWebsite(null)).toBeNull()
    expect(classifyWebsite(undefined)).toBeNull()
    expect(classifyWebsite('')).toBeNull()
  })
})
