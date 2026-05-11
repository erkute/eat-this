import { describe, it, expect } from 'vitest'
import { pickLocale, pickLocaleArray, interpolate } from '../../lib/landing-locale'

describe('pickLocale', () => {
  it('returns DE field for de locale when present', () => {
    expect(pickLocale({ titleDe: 'Hallo', titleEn: 'Hello' }, 'title', 'de')).toBe('Hallo')
  })
  it('returns EN field for en locale when present', () => {
    expect(pickLocale({ titleDe: 'Hallo', titleEn: 'Hello' }, 'title', 'en')).toBe('Hello')
  })
  it('falls back to the other locale when one is missing', () => {
    expect(pickLocale({ titleDe: '', titleEn: 'Hello' }, 'title', 'de')).toBe('Hello')
    expect(pickLocale({ titleDe: 'Hallo' }, 'title', 'en')).toBe('Hallo')
  })
  it('returns empty string when both are missing', () => {
    expect(pickLocale({}, 'title', 'de')).toBe('')
  })
})

describe('pickLocaleArray', () => {
  it('returns DE array for de locale', () => {
    expect(pickLocaleArray({ itemsDe: ['a'], itemsEn: ['x'] }, 'items', 'de')).toEqual(['a'])
  })
  it('falls back to the other locale array when one is empty/missing', () => {
    expect(pickLocaleArray({ itemsEn: ['x'] }, 'items', 'de')).toEqual(['x'])
    expect(pickLocaleArray({ itemsDe: [] }, 'items', 'de')).toEqual([])
  })
  it('returns empty array when both are missing', () => {
    expect(pickLocaleArray({}, 'items', 'de')).toEqual([])
  })
})

describe('interpolate', () => {
  it('replaces {count} placeholder with number', () => {
    expect(interpolate('{count}+ spots', { count: 217 })).toBe('217+ spots')
  })
  it('handles multiple placeholders', () => {
    expect(interpolate('{a} and {b}', { a: 'x', b: 'y' })).toBe('x and y')
  })
  it('leaves unknown placeholders intact', () => {
    expect(interpolate('hi {x}', { count: 5 })).toBe('hi {x}')
  })
})
