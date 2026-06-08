// nextjs/lib/buddy/stream.test.ts
import { describe, it, expect } from 'vitest'
import { encodeBuddyEvent, sanitizeLinks, splitAnswerSegments } from './stream'

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

  it('handles locale-prefix-less restaurant links (German default route)', () => {
    const textFake = 'Schau mal [Fake](/restaurant/fake).'
    expect(sanitizeLinks(textFake, new Set())).toBe('Schau mal Fake.')
    expect(sanitizeLinks(textFake, new Set())).not.toContain('/restaurant/fake')

    const textReal = 'Ich empfehle [Real](/restaurant/real).'
    const out = sanitizeLinks(textReal, new Set(['real']))
    expect(out).toContain('[Real](/restaurant/real)')
  })
})

describe('splitAnswerSegments', () => {
  const allowed = new Set(['zola', 'oliveto'])

  it('interleaves text and spot segments in order', () => {
    const content =
      'Pizza-Lust!\n**ZOLA** Neapolitanisch\n[[spot:zola]]\n**Oliveto** Klassiker\n[[spot:oliveto]]'
    const { segments, placedSlugs } = splitAnswerSegments(content, allowed)
    expect(segments.map((s) => s.type)).toEqual(['text', 'spot', 'text', 'spot'])
    expect(segments[1]).toEqual({ type: 'spot', slug: 'zola' })
    expect(segments[3]).toEqual({ type: 'spot', slug: 'oliveto' })
    expect(placedSlugs).toEqual(['zola', 'oliveto'])
  })

  it('drops markers with an unknown slug and keeps the surrounding text', () => {
    const { segments, placedSlugs } = splitAnswerSegments('A [[spot:ghost]] B', allowed)
    expect(segments).toHaveLength(1)
    expect(segments[0].type).toBe('text')
    const text = (segments[0] as { type: 'text'; text: string }).text
    expect(text).toContain('A')
    expect(text).toContain('B')
    expect(text).not.toContain('[[spot')
    expect(placedSlugs).toEqual([])
  })

  it('places a duplicated slug only once', () => {
    const { segments, placedSlugs } = splitAnswerSegments(
      'X [[spot:zola]] Y [[spot:zola]] Z',
      allowed,
    )
    expect(segments.filter((s) => s.type === 'spot')).toEqual([{ type: 'spot', slug: 'zola' }])
    expect(placedSlugs).toEqual(['zola'])
  })

  it('hides an incomplete trailing marker while streaming', () => {
    const { segments } = splitAnswerSegments('Hier ist ZOLA [[spot:zo', allowed)
    expect(segments).toEqual([{ type: 'text', text: 'Hier ist ZOLA ' }])
  })

  it('returns a single text segment when there are no markers', () => {
    const { segments, placedSlugs } = splitAnswerSegments('Nur Text ohne Marker', allowed)
    expect(segments).toEqual([{ type: 'text', text: 'Nur Text ohne Marker' }])
    expect(placedSlugs).toEqual([])
  })
})
