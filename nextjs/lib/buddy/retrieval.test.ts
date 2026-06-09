// nextjs/lib/buddy/retrieval.test.ts
import { describe, it, expect } from 'vitest'
import { buildSpotsQuery, buildSpotsParams } from './retrieval'
import { searchSpots, searchArticles } from './retrieval'
import type { ArticleResult } from './types'

describe('buildSpotsQuery', () => {
  it('inlines a clamped limit and selects the projection fields', () => {
    const q = buildSpotsQuery(30)
    expect(q).toContain('[0...30]')
    expect(q).toContain('_type == "restaurant"')
    expect(q).toContain('isOpen == true && isClosed != true')
    expect(q).not.toContain('tierAnon')
    expect(q).toContain('"slug": slug.current')
    expect(q).toContain('"bezirk": bezirkRef->name')
    expect(q).toContain('featured desc')
    expect(q).toContain('lastReviewed desc')
  })

  it('matches the cuisine term across name and descriptions, not just cuisineType', () => {
    const q = buildSpotsQuery(30)
    expect(q).toContain('cuisineType match $cuisine')
    expect(q).toContain('name match $cuisine')
    expect(q).toContain('description match $cuisine')
  })

  it('ranks a curated tag highest, then cuisineType, then name, then text', () => {
    const q = buildSpotsQuery(30)
    // relevance score: tag (4) > cuisineType (3) > name (2) > description (1)
    expect(q).toContain('count(tags[@ match $cuisine]) > 0 => 4')
    expect(q).toContain('cuisineType match $cuisine => 3')
    expect(q).toContain('name match $cuisine => 2')
  })

  it('includes curated tags in the candidate match', () => {
    const q = buildSpotsQuery(30)
    expect(q).toContain('count(tags[@ match $cuisine]) > 0')
  })

  it('filters by an optional spot name and floats a name match to the very top', () => {
    const q = buildSpotsQuery(30)
    // named-spot lookup (e.g. "kennst du Gazzo?") restricts to the matching name…
    expect(q).toContain('!defined($name) || name match $name')
    // …and the named spot outranks any cuisine-relevance scoring.
    expect(q).toContain('defined($name) && name match $name => 1')
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

  it('wildcards an optional spot name, null when absent', () => {
    expect(buildSpotsParams({ name: 'Gazzo', vibeQuery: 'x' }, 'de').name).toBe('*Gazzo*')
    expect(buildSpotsParams({ vibeQuery: 'x' }, 'de').name).toBeNull()
  })
})

describe('searchSpots', () => {
  it('passes the built query+params to the client and formats the price label', async () => {
    const calls: Array<{ query: string; params: unknown }> = []
    // Sanity returns priceRange as a raw {min,max,currency} object.
    const rawRow = {
      name: 'Standard Serif', slug: 'standard-serif', cuisineType: 'Pizza',
      bezirk: 'Mitte', shortDescription: 'Neapolitan', tip: null,
      priceRange: { min: 10, max: 20, currency: 'EUR' }, mapsUrl: 'https://maps.example/x', image: null,
      openingHours: [{ days: 'Mon–Sun', hours: '12:00–23:00' }],
    }
    const fakeClient = {
      fetch: async (query: string, params: unknown) => {
        calls.push({ query, params })
        return [rawRow]
      },
    }
    // Fixed clock: a Wednesday 20:00 Berlin time → spot is open till 23:00.
    const out = await searchSpots(
      { cuisine: 'Pizza', bezirk: 'Mitte', vibeQuery: 'gut' },
      'de',
      { client: fakeClient, now: new Date('2026-06-10T18:00:00Z') },
    )
    expect(out[0].name).toBe('Standard Serif')
    expect(out[0].priceRange).toBe('10–20 €')
    expect(out[0].openNow).toBe(true)
    expect(out[0].openLabel).toContain('Offen')
    expect(calls).toHaveLength(1)
    expect(calls[0].query).toContain('_type == "restaurant"')
    expect(calls[0].params).toMatchObject({ cuisine: '*Pizza*', bezirk: '*Mitte*', locale: 'de' })
  })

  it('sorts by distance and labels when userGeo is given', async () => {
    const base = {
      cuisineType: null, bezirk: null, shortDescription: null, tip: null,
      priceRange: null, mapsUrl: null, image: null,
    }
    const far = { ...base, name: 'Far', slug: 'far', lat: 52.6, lng: 13.5 }
    const near = { ...base, name: 'Near', slug: 'near', lat: 52.521, lng: 13.413 }
    const fakeClient = { fetch: async () => [far, near] }
    const out = await searchSpots(
      { vibeQuery: 'x', userGeo: { lat: 52.5219, lng: 13.4132 } },
      'de',
      { client: fakeClient },
    )
    expect(out.map((s) => s.slug)).toEqual(['near', 'far']) // nearest first
    expect(out[0].distanceLabel).toMatch(/m|km/)
  })
})

describe('searchArticles', () => {
  it('queries newsArticle with the wildcarded term and returns results', async () => {
    const calls: Array<{ query: string; params: unknown }> = []
    const fakeArticle: ArticleResult = { title: 'Kaffee in Berlin', slug: 'kaffee', excerpt: 'Third wave' }
    const fakeClient = {
      fetch: async (query: string, params: unknown) => {
        calls.push({ query, params })
        return [fakeArticle]
      },
    }
    const out = await searchArticles({ query: 'Kaffee' }, 'de', { client: fakeClient })
    expect(out).toEqual([fakeArticle])
    expect(calls[0].query).toContain('_type == "newsArticle"')
    expect(calls[0].params).toMatchObject({ q: '*Kaffee*', locale: 'de' })
  })
})
