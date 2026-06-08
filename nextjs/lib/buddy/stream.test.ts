// nextjs/lib/buddy/stream.test.ts
import { describe, it, expect } from 'vitest'
import { encodeBuddyEvent, sanitizeLinks } from './stream'

describe('encodeBuddyEvent', () => {
  it('encodes one NDJSON line per event', () => {
    expect(encodeBuddyEvent({ type: 'text', value: 'hi' })).toBe('{"type":"text","value":"hi"}\n')
  })
})

describe('sanitizeLinks', () => {
  it('keeps markdown links whose slug is allowed and strips unknown ones to plain text', () => {
    const text =
      'Probier [Standard Serif](/de/restaurant/standard-serif) oder [Fake Spot](/de/restaurant/fake).'
    const out = sanitizeLinks(text, new Set(['standard-serif']))
    expect(out).toContain('[Standard Serif](/de/restaurant/standard-serif)')
    expect(out).toContain('Fake Spot')
    expect(out).not.toContain('/restaurant/fake')
  })

  it('leaves non-restaurant links untouched', () => {
    const text = 'Lies [den Artikel](/de/news/kaffee).'
    expect(sanitizeLinks(text, new Set())).toBe(text)
  })
})
