import { describe, it, expect } from 'vitest'
import { isValidSlug, spotPhotoUrl, mustEatCardUrl, SpotCardImage } from '../spotCard'

describe('isValidSlug', () => {
  it('accepts normal sanity slugs', () => {
    expect(isValidSlug('sofi')).toBe(true)
    expect(isValidSlug('wen-cheng-2')).toBe(true)
  })

  it('rejects empty, traversal and url-ish input', () => {
    expect(isValidSlug('')).toBe(false)
    expect(isValidSlug('../etc')).toBe(false)
    expect(isValidSlug('https://evil')).toBe(false)
    expect(isValidSlug('a b')).toBe(false)
    expect(isValidSlug('UPPER')).toBe(false)
    expect(isValidSlug('x'.repeat(120))).toBe(false)
  })
})

describe('image url builders', () => {
  it('photo: square server-crop, forced JPEG (Satori cannot decode WebP)', () => {
    expect(spotPhotoUrl('https://cdn.sanity.io/images/x/y/a.png?w=99')).toBe(
      'https://cdn.sanity.io/images/x/y/a.png?w=720&h=720&fit=crop&fm=jpg&q=80'
    )
  })

  it('card: trading-card crop, forced PNG (keeps alpha)', () => {
    expect(mustEatCardUrl('https://cdn.sanity.io/images/x/y/c.png')).toBe(
      'https://cdn.sanity.io/images/x/y/c.png?w=400&h=560&fit=crop&fm=png'
    )
  })
})

describe('SpotCardImage', () => {
  const spot = {
    name: 'Sofi',
    area: 'Mitte',
    cuisine: 'Bakery',
    photo: 'https://cdn.sanity.io/images/x/y/a.png',
    mustEats: [{ dish: 'Breakfast Plate', cardPhoto: 'https://cdn.sanity.io/images/x/y/c.png' }],
  }

  function flatten(node: unknown): string {
    return JSON.stringify(node)
  }

  it('composes photo, meta line, name and the rotated must-eat badge', () => {
    const tree = flatten(SpotCardImage({ spot }))
    expect(tree).toContain('fm=jpg')          // photo layer
    expect(tree).toContain('MITTE · BAKERY')  // meta caps on the photo
    expect(tree).toContain('Sofi')            // name in Schoolbell
    expect(tree).toContain('rotate(8deg)')    // badge tilt
    expect(tree).toContain('fm=png')          // badge keeps alpha
  })

  it('drops the badge when the spot has no must-eat card', () => {
    const tree = flatten(SpotCardImage({ spot: { ...spot, mustEats: [] } }))
    expect(tree).not.toContain('rotate(8deg)')
    expect(tree).not.toContain('fm=png')
  })

  it('handles a missing cuisine without a dangling separator', () => {
    const tree = flatten(SpotCardImage({ spot: { ...spot, cuisine: undefined } }))
    expect(tree).toContain('MITTE')
    expect(tree).not.toContain('MITTE ·')
  })
})
