// nextjs/lib/buddy/retrieval.test.ts
import { describe, it, expect } from 'vitest'
import { buildSpotsQuery, buildSpotsParams } from './retrieval'

describe('buildSpotsQuery', () => {
  it('inlines a clamped limit and selects the projection fields', () => {
    const q = buildSpotsQuery(30)
    expect(q).toContain('[0...30]')
    expect(q).toContain('_type == "restaurant"')
    expect(q).toContain('isOpen == true && isClosed != true && tierAnon == true')
    expect(q).toContain('"slug": slug.current')
    expect(q).toContain('"bezirk": bezirkRef->name')
    expect(q).toContain('order(featured desc, lastReviewed desc)')
  })

  it('clamps the limit to the 1..40 range', () => {
    expect(buildSpotsQuery(999)).toContain('[0...40]')
    expect(buildSpotsQuery(0)).toContain('[0...1]')
  })
})

describe('buildSpotsParams', () => {
  it('returns null for absent filters and wildcards present filters', () => {
    const p = buildSpotsParams({ cuisine: 'Pizza', vibeQuery: 'gemütlich' }, 'de')
    expect(p.cuisine).toBe('*Pizza*')
    expect(p.bezirk).toBeNull()
    expect(p.price).toBeNull()
    expect(p.locale).toBe('de')
  })

  it('trims and wildcards bezirk and passes price exactly', () => {
    const p = buildSpotsParams(
      { bezirk: ' Schöneberg ', priceRange: '€€', vibeQuery: 'x' },
      'en',
    )
    expect(p.bezirk).toBe('*Schöneberg*')
    expect(p.price).toBe('€€')
    expect(p.locale).toBe('en')
  })
})
