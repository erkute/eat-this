import { describe, it, expect } from 'vitest'
import { pickLocale, hasEnContent } from '../pickLocale'

describe('pickLocale', () => {
  it('returns base when locale is de', () => {
    expect(pickLocale('Deutsch', 'English', 'de')).toBe('Deutsch')
  })

  it('returns override when locale is en and override is set', () => {
    expect(pickLocale('Deutsch', 'English', 'en')).toBe('English')
  })

  it('falls back to base when locale is en and override is undefined', () => {
    expect(pickLocale('Deutsch', undefined, 'en')).toBe('Deutsch')
  })

  it('falls back to base when locale is en and override is null', () => {
    expect(pickLocale('Deutsch', null, 'en')).toBe('Deutsch')
  })

  it('falls back to base when locale is en and override is empty string', () => {
    expect(pickLocale('Deutsch', '', 'en')).toBe('Deutsch')
  })
})

describe('hasEnContent', () => {
  it('returns true when descriptionEn is a non-empty string', () => {
    expect(hasEnContent({ descriptionEn: 'A description.' })).toBe(true)
  })

  it('returns false when descriptionEn is undefined', () => {
    expect(hasEnContent({ descriptionEn: undefined })).toBe(false)
  })

  it('returns false when descriptionEn is empty string', () => {
    expect(hasEnContent({ descriptionEn: '' })).toBe(false)
  })

  it('returns false when descriptionEn is whitespace only', () => {
    expect(hasEnContent({ descriptionEn: '   ' })).toBe(false)
  })
})
