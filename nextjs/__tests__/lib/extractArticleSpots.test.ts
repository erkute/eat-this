import { describe, it, expect } from 'vitest'
import { extractArticleSpots } from '@/lib/PortableTextRenderer'
import type { PortableTextBlock } from '@/lib/types'

const para = (text: string): PortableTextBlock => ({
  _type: 'block',
  _key: text,
  style: 'normal',
  children: [{ _type: 'span', text }],
})

const mustEat = (over: Record<string, unknown>): PortableTextBlock => ({
  _type: 'mustEatCard',
  _key: `me-${over.restaurantSlug ?? over.restaurantName}`,
  dish: 'Der Döner',
  restaurantName: 'Hasir',
  restaurantSlug: 'hasir',
  district: 'Schöneberg',
  cuisineType: 'Döner',
  restaurantPhoto: 'https://cdn/hasir.webp',
  ...over,
})

describe('extractArticleSpots', () => {
  it('returns [] for empty / undefined input', () => {
    expect(extractArticleSpots()).toEqual([])
    expect(extractArticleSpots([])).toEqual([])
  })

  it('ignores non-mustEatCard blocks', () => {
    expect(extractArticleSpots([para('hi'), para('there')])).toEqual([])
  })

  it('collects restaurants from mustEatCard blocks in order of appearance', () => {
    const blocks = [
      para('intro'),
      mustEat({ restaurantName: 'Hasir', restaurantSlug: 'hasir' }),
      para('middle'),
      mustEat({ restaurantName: 'Uludağ', restaurantSlug: 'uludag', district: 'Schöneberg' }),
    ]
    const spots = extractArticleSpots(blocks)
    expect(spots.map((s) => s.slug)).toEqual(['hasir', 'uludag'])
    expect(spots[0]).toMatchObject({
      name: 'Hasir',
      district: 'Schöneberg',
      cuisineType: 'Döner',
      photo: 'https://cdn/hasir.webp',
    })
  })

  it('dedupes the same restaurant referenced twice (keeps first)', () => {
    const blocks = [
      mustEat({ dish: 'Der Döner', restaurantSlug: 'hasir', restaurantName: 'Hasir' }),
      mustEat({ dish: 'Dürüm', restaurantSlug: 'hasir', restaurantName: 'Hasir' }),
    ]
    expect(extractArticleSpots(blocks)).toHaveLength(1)
  })

  it('skips mustEatCard blocks with no restaurant name', () => {
    const blocks = [mustEat({ restaurantName: undefined, restaurantSlug: undefined })]
    expect(extractArticleSpots(blocks)).toEqual([])
  })
})
