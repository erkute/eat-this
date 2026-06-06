import { describe, it, expect } from 'vitest'
import {
  resolvePackByUrlSlug,
  packUrlSlug,
  formatPackPrice,
  buildPackTeaser,
} from './packDetail'
import { CATALOG } from '@/lib/stripe-catalog'
import type { RestaurantCard } from '@/lib/types'

describe('resolvePackByUrlSlug', () => {
  it('resolves a category slug to its category pack', () => {
    expect(resolvePackByUrlSlug('pizza')?.packId).toBe('category-pizza')
  })

  it('resolves a hyphenated category slug', () => {
    expect(resolvePackByUrlSlug('fast-food')?.packId).toBe('category-fastfood')
    expect(resolvePackByUrlSlug('fine-dining')?.packId).toBe('category-finedining')
  })

  it('resolves all-berlin', () => {
    expect(resolvePackByUrlSlug('all-berlin')?.packId).toBe('all-berlin')
  })

  it('returns null for an unknown slug', () => {
    expect(resolvePackByUrlSlug('not-a-pack')).toBeNull()
  })
})

describe('packUrlSlug', () => {
  it('uses the category slug for category packs', () => {
    expect(packUrlSlug(CATALOG['category-pizza'])).toBe('pizza')
    expect(packUrlSlug(CATALOG['category-fastfood'])).toBe('fast-food')
  })

  it('uses all-berlin for the all-berlin pack', () => {
    expect(packUrlSlug(CATALOG['all-berlin'])).toBe('all-berlin')
  })

  it('round-trips with resolvePackByUrlSlug for every catalog pack', () => {
    for (const pack of Object.values(CATALOG)) {
      expect(resolvePackByUrlSlug(packUrlSlug(pack))?.packId).toBe(pack.packId)
    }
  })
})

describe('formatPackPrice', () => {
  it('formats a sub-euro-cents price with a comma and trailing euro sign', () => {
    expect(formatPackPrice(299)).toBe('2,99 €')
  })

  it('drops the decimals for a whole-euro price', () => {
    expect(formatPackPrice(2000)).toBe('20 €')
  })
})

function card(id: string, name: string, district?: string): RestaurantCard {
  return { _id: id, name, slug: id, district }
}

describe('buildPackTeaser', () => {
  const six = [
    card('1', 'Slice Society', 'Mitte'),
    card('2', 'Gazzo', 'Neukölln'),
    card('3', 'Gemello', 'Prenzlauer Berg'),
    card('4', 'Standard', 'Charlottenburg'),
    card('5', 'Malafemmena', 'Kreuzberg'),
    card('6', 'Zola', 'Friedrichshain'),
  ]

  it('reveals the first three and locks the next two by default', () => {
    const t = buildPackTeaser(six)
    expect(t.revealed.map(r => r.name)).toEqual(['Slice Society', 'Gazzo', 'Gemello'])
    expect(t.revealed[0].district).toBe('Mitte')
    expect(t.locked.map(l => l.district)).toEqual(['Charlottenburg', 'Kreuzberg'])
  })

  it('does not leak locked names — only districts', () => {
    const t = buildPackTeaser(six)
    // locked rows expose district only, never the restaurant name
    expect(t.locked[0]).not.toHaveProperty('name')
  })

  it('reveals all and locks none when the list is short', () => {
    const t = buildPackTeaser([card('1', 'A', 'X'), card('2', 'B', 'Y')])
    expect(t.revealed).toHaveLength(2)
    expect(t.locked).toHaveLength(0)
  })

  it('handles an empty list', () => {
    const t = buildPackTeaser([])
    expect(t.revealed).toHaveLength(0)
    expect(t.locked).toHaveLength(0)
  })
})
