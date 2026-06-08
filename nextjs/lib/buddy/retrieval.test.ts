// nextjs/lib/buddy/retrieval.test.ts
import { describe, it, expect } from 'vitest'
import { buildSpotsQuery, buildSpotsParams } from './retrieval'
import { searchSpots, searchArticles } from './retrieval'
import type { SpotCandidate, ArticleResult } from './types'

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

describe('searchSpots', () => {
  it('passes the built query+params to the client and returns results', async () => {
    const calls: Array<{ query: string; params: unknown }> = []
    const fakeSpot: SpotCandidate = {
      name: 'Standard Serif', slug: 'standard-serif', cuisineType: 'Pizza',
      bezirk: 'Mitte', shortDescription: 'Neapolitan', tip: null,
      priceRange: '€€', mapsUrl: 'https://maps.example/x',
    }
    const fakeClient = {
      fetch: async (query: string, params: unknown) => {
        calls.push({ query, params })
        return [fakeSpot]
      },
    }
    const out = await searchSpots(
      { cuisine: 'Pizza', bezirk: 'Mitte', vibeQuery: 'gut' },
      'de',
      { client: fakeClient },
    )
    expect(out).toEqual([fakeSpot])
    expect(calls).toHaveLength(1)
    expect(calls[0].query).toContain('_type == "restaurant"')
    expect(calls[0].params).toMatchObject({ cuisine: '*Pizza*', bezirk: '*Mitte*', locale: 'de' })
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
