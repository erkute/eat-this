import { describe, it, expect } from 'vitest'
import { assembleDistricts, type DistrictRow, type FeatureRaw, type HubDistrictSpot } from './assembleDistricts'

const spot = (slug: string): HubDistrictSpot => ({ name: slug, slug, image: `https://cdn/${slug}.jpg`, category: 'Lunch' })

const row = (slug: string, count: number): DistrictRow => ({
  name: slug, slug, tagline: `tag-${slug}`, count, spots: [spot(`${slug}-1`), spot(`${slug}-2`)],
})

describe('assembleDistricts', () => {
  it('puts the feature district first, marks it, and removes its duplicate from the rest', () => {
    const feature: FeatureRaw = { name: 'Neukölln', slug: 'neukoelln', tagline: 'feat-tag', spots: [spot('curated-1')] }
    const rows = [row('mitte', 77), row('neukoelln', 30), row('kreuzberg', 58)]
    const out = assembleDistricts(feature, rows)
    expect(out[0].slug).toBe('neukoelln')
    expect(out[0].isFeature).toBe(true)
    expect(out.filter(d => d.slug === 'neukoelln')).toHaveLength(1)
    expect(out.slice(1).every(d => d.isFeature === false)).toBe(true)
  })

  it('uses curated feature spots and tagline when present', () => {
    const feature: FeatureRaw = { name: 'Neukölln', slug: 'neukoelln', tagline: 'feat-tag', spots: [spot('curated-1')] }
    const out = assembleDistricts(feature, [row('neukoelln', 30)])
    expect(out[0].spots).toHaveLength(1)
    expect(out[0].spots[0].slug).toBe('curated-1')
    expect(out[0].tagline).toBe('feat-tag')
  })

  it('falls back to the matching row spots/tagline when the feature has no curated spots', () => {
    const feature: FeatureRaw = { name: 'Neukölln', slug: 'neukoelln', tagline: null, spots: [] }
    const out = assembleDistricts(feature, [row('neukoelln', 30)])
    expect(out[0].spots.map(s => s.slug)).toEqual(['neukoelln-1', 'neukoelln-2'])
    expect(out[0].tagline).toBe('tag-neukoelln')
  })

  it('returns rows as-is (no feature marker) when feature is null', () => {
    const out = assembleDistricts(null, [row('mitte', 77), row('kreuzberg', 58)])
    expect(out).toHaveLength(2)
    expect(out.every(d => d.isFeature === false)).toBe(true)
    expect(out[0].slug).toBe('mitte')
  })

  it('caps the result at 10 districts', () => {
    const rows = Array.from({ length: 14 }, (_, i) => row(`b${i}`, 100 - i))
    expect(assembleDistricts(null, rows)).toHaveLength(10)
  })
})
