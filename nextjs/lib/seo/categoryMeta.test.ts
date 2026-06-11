import { describe, it, expect } from 'vitest'
import type { RestaurantCard } from '../types'
import { buildCategoryTitle, buildCategoryDescription } from './categoryMeta'

function r(name: string): RestaurantCard {
  return { _id: name, name, slug: name.toLowerCase() }
}

describe('buildCategoryTitle', () => {
  it('uses the curated search-language title for known slugs', () => {
    expect(buildCategoryTitle('pizza', 'Pizza', 'de')).toBe('Die beste Pizza in Berlin')
    expect(buildCategoryTitle('coffee', 'Kaffee', 'de')).toBe('Die besten Cafés in Berlin')
    expect(buildCategoryTitle('coffee', 'Coffee', 'en')).toBe('The Best Cafés in Berlin')
    expect(buildCategoryTitle('drinks', 'Drinks', 'de')).toBe('Die besten Bars in Berlin')
  })

  it('stays brandless — layout template appends the brand', () => {
    for (const slug of ['pizza', 'coffee', 'breakfast', 'dinner', 'lunch', 'drinks', 'fine-dining', 'fast-food', 'sweets']) {
      expect(buildCategoryTitle(slug, 'X', 'de')).not.toContain('Eat This')
      expect(buildCategoryTitle(slug, 'X', 'en')).not.toContain('Eat This')
    }
  })

  it('falls back to "{label} in Berlin" for unknown slugs', () => {
    expect(buildCategoryTitle('ramen', 'Ramen', 'de')).toBe('Ramen in Berlin')
  })
})

describe('buildCategoryDescription', () => {
  it('combines blurb with count and a trust signal — no raw names', () => {
    const desc = buildCategoryDescription({
      blurb: 'Pizza in Berlin — Napoletana und mehr.',
      restaurants: [r('Gemello'), r('Zola'), r('Standard')],
      locale: 'de',
    })
    expect(desc).toContain('Pizza in Berlin — Napoletana und mehr.')
    expect(desc).toContain('3 kuratierte Spots, alle persönlich getestet.')
    // Raw restaurant names must never leak into the snippet (order is not
    // "best first", so slicing produced garbage like "136 Berlin Restaurant").
    expect(desc).not.toContain('Gemello')
  })

  it('caps at 160 chars via sentence truncation', () => {
    const desc = buildCategoryDescription({
      blurb: 'Lange Beschreibung. '.repeat(20),
      restaurants: [r('A'), r('B'), r('C')],
      locale: 'de',
    })
    expect(desc!.length).toBeLessThanOrEqual(160)
  })

  it('omits the data suffix below 3 restaurants', () => {
    const desc = buildCategoryDescription({ blurb: 'Blurb.', restaurants: [r('A')], locale: 'de' })
    expect(desc).toBe('Blurb.')
  })

  it('returns undefined with no blurb and no restaurants', () => {
    expect(buildCategoryDescription({ blurb: '', restaurants: [], locale: 'de' })).toBeUndefined()
  })
})
