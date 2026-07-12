import { describe, it, expect } from 'vitest'
import { categoryDistrictLinks } from './crossLinks'
import type { RestaurantCard } from '../types'

function r(partial: Partial<RestaurantCard>): RestaurantCard {
  return { _id: Math.random().toString(36), name: 'x', slug: 'x', ...partial }
}

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
