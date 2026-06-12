// nextjs/lib/buddy/retrieval.test.ts
import { describe, it, expect } from 'vitest'
import { buildSpotsQuery, buildSpotsParams, priceBand } from './retrieval'
import { searchSpots, searchArticles, foldName, resolveNameToSlug, vibeTokens, __resetNameIndexCache } from './retrieval'
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
    expect(p.priceMin).toBeNull()
    expect(p.priceMaxExcl).toBeNull()
    expect(p.locale).toBe('de')
  })

  it('trims and wildcards bezirk and maps the price level to a min band', () => {
    const p = buildSpotsParams(
      { bezirk: ' Schöneberg ', priceRange: '€€', vibeQuery: 'x' },
      'en',
    )
    expect(p.bezirk).toBe('*Schöneberg*')
    // "€€" → mid band on priceRange.min (15..35), not an exact object compare.
    expect(p.priceMin).toBe(15)
    expect(p.priceMaxExcl).toBe(35)
    expect(p.locale).toBe('en')
  })

  it('wildcards an optional spot name, null when absent', () => {
    expect(buildSpotsParams({ name: 'Gazzo', vibeQuery: 'x' }, 'de').name).toBe('*Gazzo*')
    expect(buildSpotsParams({ vibeQuery: 'x' }, 'de').name).toBeNull()
  })
})

describe('priceBand', () => {
  it('maps € levels to disjoint min bands and is open-ended at the top', () => {
    expect(priceBand('€')).toEqual({ min: 0, maxExcl: 15 })
    expect(priceBand('€€')).toEqual({ min: 15, maxExcl: 35 })
    expect(priceBand('€€€')).toEqual({ min: 35, maxExcl: null })
    // €€€€ collapses into the top (upscale) band rather than a fourth tier.
    expect(priceBand('€€€€')).toEqual({ min: 35, maxExcl: null })
  })

  it('tolerates whitespace and fails open on unparseable input', () => {
    expect(priceBand(' €€ ')).toEqual({ min: 15, maxExcl: 35 })
    expect(priceBand('')).toBeNull()
    expect(priceBand(undefined)).toBeNull()
    expect(priceBand('billig')).toBeNull()
  })
})

describe('searchSpots', () => {
  it('passes the built query+params to the client and formats the price label', async () => {
    const calls: Array<{ query: string; params: unknown }> = []
    // Sanity returns priceRange as a raw {min,max,currency} object.
    const rawRow = {
      _id: 'r-standard', name: 'Standard Serif', slug: 'standard-serif', cuisineType: 'Pizza',
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
    const far = { ...base, _id: 'r-far', name: 'Far', slug: 'far', lat: 52.6, lng: 13.5 }
    const near = { ...base, _id: 'r-near', name: 'Near', slug: 'near', lat: 52.521, lng: 13.413 }
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

describe('foldName', () => {
  it('strips diacritics, case and non-alphanumerics', () => {
    expect(foldName('amatō')).toBe('amato')
    expect(foldName('Kuréme')).toBe('kureme')
    expect(foldName('Boii Boii')).toBe('boiiboii')
    expect(foldName('Café Krème 23')).toBe('cafekreme23')
  })
})

describe('resolveNameToSlug', () => {
  const index = [
    { name: 'amatō', slug: 'amato', folded: foldName('amatō') },
    { name: 'Kuréme', slug: 'kureme', folded: foldName('Kuréme') },
    { name: 'Boii Boii', slug: 'boii-boii', folded: foldName('Boii Boii') },
    { name: 'Gazzo', slug: 'gazzo', folded: foldName('Gazzo') },
    { name: 'La Maison', slug: 'la-maison', folded: foldName('La Maison') },
    { name: 'Maison Blanche', slug: 'maison-blanche', folded: foldName('Maison Blanche') },
  ]

  it('resolves exact folded matches across diacritics', () => {
    expect(resolveNameToSlug('amato', index)).toBe('amato')
    expect(resolveNameToSlug('AMATŌ', index)).toBe('amato')
    expect(resolveNameToSlug('kureme', index)).toBe('kureme')
  })

  it('resolves common misspellings via fuzzy distance', () => {
    // GSC-real: "boi boi" → Boii Boii (folded distance 2 on length 6)
    expect(resolveNameToSlug('boi boi', index)).toBe('boii-boii')
    expect(resolveNameToSlug('kurème', index)).toBe('kureme')
  })

  it('prefers the exact folded match over substring candidates', () => {
    expect(resolveNameToSlug('gazzo', index)).toBe('gazzo')
  })

  it('returns null when ambiguous or unconvincing', () => {
    // "maison" is a substring of two entries and exact match of none → ambiguous.
    expect(resolveNameToSlug('maison', index)).toBeNull()
    expect(resolveNameToSlug('xy', index)).toBeNull()
    expect(resolveNameToSlug('völlig anderes lokal', index)).toBeNull()
  })
})

describe('vibeTokens', () => {
  it('keeps diacritics (GROQ matches unfolded text), drops stopwords and short tokens', () => {
    expect(vibeTokens('etwas gemütliches für ein date')).toEqual(['*gemütliches*', '*date*', null])
  })

  it('caps at three unique tokens and pads with null', () => {
    expect(vibeTokens('vegan ramen spicy cozy late')).toEqual(['*vegan*', '*ramen*', '*spicy*'])
    expect(vibeTokens('')).toEqual([null, null, null])
  })
})

describe('searchSpots name resolution', () => {
  it('resolves a diacritic-blind name to a slug filter and drops raw name match', async () => {
    __resetNameIndexCache()
    const calls: Array<{ query: string; params: Record<string, unknown> }> = []
    const fakeClient = {
      fetch: async (query: string, params?: unknown) => {
        calls.push({ query, params: (params ?? {}) as Record<string, unknown> })
        if (query.includes('{ name, "slug": slug.current }')) {
          return [{ name: 'amatō', slug: 'amato' }]
        }
        return []
      },
    }
    await searchSpots({ name: 'amato', vibeQuery: '' }, 'de', { client: fakeClient })
    const spotCall = calls.find((c) => c.query.includes('order('))
    expect(spotCall?.params.slug).toBe('amato')
    expect(spotCall?.params.name).toBeNull()
  })

  it('falls back to raw name match when nothing resolves', async () => {
    __resetNameIndexCache()
    const calls: Array<{ query: string; params: Record<string, unknown> }> = []
    const fakeClient = {
      fetch: async (query: string, params?: unknown) => {
        calls.push({ query, params: (params ?? {}) as Record<string, unknown> })
        if (query.includes('{ name, "slug": slug.current }')) return [{ name: 'Gazzo', slug: 'gazzo' }]
        return []
      },
    }
    await searchSpots({ name: 'Totally Unknown Place', vibeQuery: '' }, 'de', { client: fakeClient })
    const spotCall = calls.find((c) => c.query.includes('order('))
    expect(spotCall?.params.slug).toBeNull()
    expect(spotCall?.params.name).toBe('*Totally Unknown Place*')
  })
})
