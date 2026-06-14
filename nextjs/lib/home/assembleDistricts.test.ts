import { describe, it, expect } from 'vitest'
import { assembleDistricts, pickWeeklyFeatureSlug, type DistrictRow, type HubDistrictSpot } from './assembleDistricts'

const spot = (slug: string): HubDistrictSpot => ({ name: slug, slug, image: `https://cdn/${slug}.jpg`, category: 'Lunch' })

const row = (slug: string, count: number): DistrictRow => ({
  name: slug, slug, tagline: `tag-${slug}`, count, spots: [spot(`${slug}-1`), spot(`${slug}-2`)],
})

const plusDays = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

describe('assembleDistricts', () => {
  it('puts the featured district first, marks it, and keeps it unique', () => {
    const rows = [row('mitte', 77), row('neukoelln', 30), row('kreuzberg', 58)]
    const out = assembleDistricts('neukoelln', rows)
    expect(out[0].slug).toBe('neukoelln')
    expect(out[0].isFeature).toBe(true)
    expect(out.filter(d => d.slug === 'neukoelln')).toHaveLength(1)
    expect(out.slice(1).every(d => d.isFeature === false)).toBe(true)
  })

  it('takes tagline and spots straight from the district row', () => {
    const out = assembleDistricts('neukoelln', [row('neukoelln', 30)])
    expect(out[0].tagline).toBe('tag-neukoelln')
    expect(out[0].spots.map(s => s.slug)).toEqual(['neukoelln-1', 'neukoelln-2'])
  })

  it('returns rows as-is (no marker) when the feature slug is null or unknown', () => {
    const rows = [row('mitte', 77), row('kreuzberg', 58)]
    expect(assembleDistricts(null, rows).every(d => d.isFeature === false)).toBe(true)
    expect(assembleDistricts('does-not-exist', rows).every(d => d.isFeature === false)).toBe(true)
    expect(assembleDistricts(null, rows)[0].slug).toBe('mitte')
  })

  it('caps the result at 10 districts', () => {
    const rows = Array.from({ length: 14 }, (_, i) => row(`b${i}`, 100 - i))
    expect(assembleDistricts(null, rows)).toHaveLength(10)
  })
})

describe('pickWeeklyFeatureSlug', () => {
  const rows = [row('mitte', 77), row('kreuzberg', 58), row('neukoelln', 30)]

  it('is deterministic for a given date', () => {
    expect(pickWeeklyFeatureSlug(rows, '2026-06-15')).toBe(pickWeeklyFeatureSlug(rows, '2026-06-15'))
  })

  it('advances one step per week and cycles through the whole pool', () => {
    const base = '2026-06-15'
    const picks = [0, 7, 14].map(off => pickWeeklyFeatureSlug(rows, plusDays(base, off)))
    expect(new Set(picks).size).toBe(3) // 3 distinct picks over 3 consecutive weeks (pool of 3)
    expect(pickWeeklyFeatureSlug(rows, plusDays(base, 21))).toBe(picks[0]) // wraps after a full cycle
  })

  it('returns null for an empty pool', () => {
    expect(pickWeeklyFeatureSlug([], '2026-06-15')).toBeNull()
  })
})
