import { describe, it, expect } from 'vitest'
import { districtCategoryLinks, categoryDistrictLinks } from './crossLinks'
import type { RestaurantCard } from '../types'

const cat = (slug: string, name: string, nameEn?: string) => ({ slug, name, nameEn })

function r(partial: Partial<RestaurantCard>): RestaurantCard {
  return { _id: Math.random().toString(36), name: 'x', slug: 'x', ...partial }
}

describe('districtCategoryLinks', () => {
  it('returns distinct categories ranked by frequency', () => {
    const restaurants = [
      r({ categories: [cat('pizza', 'Pizza'), cat('dinner', 'Dinner')] }),
      r({ categories: [cat('pizza', 'Pizza')] }),
      r({ categories: [cat('coffee', 'Café', 'Coffee')] }),
    ]
    const links = districtCategoryLinks(restaurants, 'de')
    // pizza(2) leads; the two count-1 entries break ties alphabetically: 'Café' < 'Dinner'
    expect(links.map(l => l.slug)).toEqual(['pizza', 'coffee', 'dinner'])
    expect(links[0]).toEqual({ slug: 'pizza', label: 'Pizza', count: 2 })
  })

  it('localizes the label to EN when available', () => {
    const links = districtCategoryLinks([r({ categories: [cat('coffee', 'Café', 'Coffee')] })], 'en')
    expect(links[0].label).toBe('Coffee')
  })

  it('skips categories without a slug and respects the limit', () => {
    const restaurants = [r({ categories: [cat('', 'Broken'), cat('a', 'A'), cat('b', 'B'), cat('c', 'C')] })]
    const links = districtCategoryLinks(restaurants, 'de', 2)
    expect(links).toHaveLength(2)
    expect(links.every(l => l.slug)).toBe(true)
  })

  it('returns an empty array when no restaurants have categories', () => {
    expect(districtCategoryLinks([r({}), r({})], 'de')).toEqual([])
  })
})

describe('categoryDistrictLinks', () => {
  it('returns distinct districts ranked by frequency, using the bezirk slug', () => {
    const restaurants = [
      r({ bezirk: { name: 'Mitte', slug: 'mitte' } }),
      r({ bezirk: { name: 'Mitte', slug: 'mitte' } }),
      r({ bezirk: { name: 'Neukölln', slug: 'neukoelln' } }),
    ]
    const links = categoryDistrictLinks(restaurants)
    expect(links.map(l => l.slug)).toEqual(['mitte', 'neukoelln'])
    expect(links[0]).toEqual({ slug: 'mitte', label: 'Mitte', count: 2 })
  })

  it('skips restaurants without a bezirk slug', () => {
    const restaurants = [
      r({ district: 'Mitte' }), // district name but no bezirk ref → not linkable
      r({ bezirk: { name: 'Pankow', slug: 'pankow' } }),
    ]
    const links = categoryDistrictLinks(restaurants)
    expect(links.map(l => l.slug)).toEqual(['pankow'])
  })
})
