import { describe, it, expect } from 'vitest'
import { extractHomeBezirk } from './userPrefs'

describe('extractHomeBezirk', () => {
  it('returns the slug string when present', () => {
    expect(extractHomeBezirk({ homeBezirk: 'neukoelln' })).toBe('neukoelln')
  })

  it('returns null when the field is missing', () => {
    expect(extractHomeBezirk({ avatar: 2 })).toBeNull()
  })

  it('returns null for undefined input (no user doc)', () => {
    expect(extractHomeBezirk(undefined)).toBeNull()
  })

  it('returns null when homeBezirk is not a non-empty string', () => {
    expect(extractHomeBezirk({ homeBezirk: '' })).toBeNull()
    expect(extractHomeBezirk({ homeBezirk: 123 as unknown as string })).toBeNull()
  })
})
