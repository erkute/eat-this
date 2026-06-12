import { describe, it, expect } from 'vitest'
import { buildHreflangAlternates, toOgLocale } from './metadata'

// SITE_URL is https://www.eatthisdot.com (lib/constants). These assertions pin
// the exact strings the pages emitted before the refactor.

describe('buildHreflangAlternates — EN live (index/news/spa pages)', () => {
  it('keeps canonical on the current locale and always emits the en alternate', () => {
    const de = buildHreflangAlternates('/bezirk', 'de')
    expect(de.canonical).toBe('https://www.eatthisdot.com/bezirk')
    expect(de.languages).toEqual({
      de: 'https://www.eatthisdot.com/bezirk',
      'x-default': 'https://www.eatthisdot.com/bezirk',
      en: 'https://www.eatthisdot.com/en/bezirk',
    })

    const en = buildHreflangAlternates('/bezirk', 'en')
    expect(en.canonical).toBe('https://www.eatthisdot.com/en/bezirk')
  })

  it('handles the home path without a trailing slash for EN', () => {
    const en = buildHreflangAlternates('/', 'en')
    expect(en.canonical).toBe('https://www.eatthisdot.com/en')
    expect(en.languages).toEqual({
      de: 'https://www.eatthisdot.com/',
      'x-default': 'https://www.eatthisdot.com/',
      en: 'https://www.eatthisdot.com/en',
    })
  })
})

describe('buildHreflangAlternates — EN gated (detail pages)', () => {
  it('with EN content behaves like the EN-live shape', () => {
    const r = buildHreflangAlternates('/restaurant/sofi', 'en', { hasEnContent: true })
    expect(r.canonical).toBe('https://www.eatthisdot.com/en/restaurant/sofi')
    expect(r.languages.en).toBe('https://www.eatthisdot.com/en/restaurant/sofi')
  })

  it('without EN content points the canonical at DE and drops the en alternate', () => {
    const r = buildHreflangAlternates('/restaurant/sofi', 'en', { hasEnContent: false })
    expect(r.canonical).toBe('https://www.eatthisdot.com/restaurant/sofi')
    expect(r.languages).toEqual({
      de: 'https://www.eatthisdot.com/restaurant/sofi',
      'x-default': 'https://www.eatthisdot.com/restaurant/sofi',
    })
    expect(r.languages.en).toBeUndefined()
  })

  it('a DE request for a doc without EN content still self-canonicals to DE', () => {
    const r = buildHreflangAlternates('/bezirk/mitte', 'de', { hasEnContent: false })
    expect(r.canonical).toBe('https://www.eatthisdot.com/bezirk/mitte')
    expect(r.languages.en).toBeUndefined()
  })
})

describe('toOgLocale', () => {
  it('maps app locales to og:locale values', () => {
    expect(toOgLocale('de')).toBe('de_DE')
    expect(toOgLocale('en')).toBe('en_US')
  })
})
