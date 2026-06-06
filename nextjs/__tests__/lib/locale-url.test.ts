import { describe, it, expect } from 'vitest'
import { localeUrl } from '@/lib/locale-url'
import { SITE_URL } from '@/lib/constants'

describe('localeUrl', () => {
  it('DE root resolves to the bare site origin with a single trailing slash', () => {
    expect(localeUrl('de', '/')).toBe(`${SITE_URL}/`)
    expect(localeUrl('de', '')).toBe(`${SITE_URL}/`)
  })

  it('non-DE root has no trailing slash — /en/ would 308-redirect to /en', () => {
    expect(localeUrl('en', '/')).toBe(`${SITE_URL}/en`)
    expect(localeUrl('en', '')).toBe(`${SITE_URL}/en`)
  })

  it('preserves nested paths verbatim', () => {
    expect(localeUrl('de', '/bezirk')).toBe(`${SITE_URL}/bezirk`)
    expect(localeUrl('en', '/bezirk')).toBe(`${SITE_URL}/en/bezirk`)
    expect(localeUrl('de', '/restaurant/foo')).toBe(`${SITE_URL}/restaurant/foo`)
    expect(localeUrl('en', '/restaurant/foo')).toBe(`${SITE_URL}/en/restaurant/foo`)
  })
})
