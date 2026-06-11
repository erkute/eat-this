import { describe, it, expect } from 'vitest'
import { presetQuery, groqImageUrl } from './sanity-image-presets'

// These assertions pin the EXACT query strings the hand-written GROQ
// projections used before the refactor. If any byte changes, a projection's
// emitted URL changes — which is exactly what must not happen silently.

describe('presetQuery — frozen against the pre-refactor strings', () => {
  it('detailHero → w=1200 q=85', () => {
    expect(presetQuery('detailHero')).toBe('?w=1200&auto=format&q=85')
  })
  it('bezirkHero → w=1600 q=85', () => {
    expect(presetQuery('bezirkHero')).toBe('?w=1600&auto=format&q=85')
  })
  it('card → w=800 q=80', () => {
    expect(presetQuery('card')).toBe('?w=800&auto=format&q=80')
  })
  it('mapCard → w=600 q=80', () => {
    expect(presetQuery('mapCard')).toBe('?w=600&auto=format&q=80')
  })
  it('articleDish → w=400 q=80', () => {
    expect(presetQuery('articleDish')).toBe('?w=400&auto=format&q=80')
  })
  it('articleDishRestaurant → w=500 q=75', () => {
    expect(presetQuery('articleDishRestaurant')).toBe('?w=500&auto=format&q=75')
  })
  it('buddyThumb → w=120 h=120 crop q=80 (param order preserved)', () => {
    expect(presetQuery('buddyThumb')).toBe('?w=120&h=120&fit=crop&auto=format&q=80')
  })
})

describe('groqImageUrl', () => {
  it('prefixes the dereference path and appends asset->url + query', () => {
    expect(groqImageUrl('image', 'detailHero')).toBe(
      'image.asset->url + "?w=1200&auto=format&q=85"',
    )
    expect(groqImageUrl('mustEatRef->restaurantRef->image', 'articleDishRestaurant')).toBe(
      'mustEatRef->restaurantRef->image.asset->url + "?w=500&auto=format&q=75"',
    )
  })
})
