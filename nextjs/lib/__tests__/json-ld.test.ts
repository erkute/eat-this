import { describe, it, expect } from 'vitest'
import { buildRestaurantJsonLd, serializeJsonLd } from '../json-ld'
import type { Restaurant } from '../types'

describe('serializeJsonLd', () => {
  it('serializes a plain object to JSON string', () => {
    const data = { '@type': 'Restaurant', name: 'Test' }
    const result = serializeJsonLd(data)
    expect(result).toBe('{"@type":"Restaurant","name":"Test"}')
  })

  it('escapes closing script tags to prevent XSS', () => {
    const data = { name: '</script><script>alert(1)</script>' }
    const result = serializeJsonLd(data)
    expect(result).not.toContain('</script>')
    expect(result).toContain('<\\/script>')
  })

  it('handles nested objects', () => {
    const data = { address: { '@type': 'PostalAddress', streetAddress: '123 Main St' } }
    const result = serializeJsonLd(data)
    expect(JSON.parse(result)).toEqual(data)
  })
})

describe('buildRestaurantJsonLd', () => {
  const baseRestaurant: Restaurant = {
    _id: 'r1',
    name: 'Boii Boii',
    slug: 'boii-boii',
    lat: 52.5,
    lng: 13.4,
  }

  const build = (r: Restaurant) =>
    JSON.parse(
      buildRestaurantJsonLd({
        restaurant: r,
        locale: 'de',
        slug: r.slug,
        description: undefined,
        districtsLabel: 'Bezirke',
      }),
    )

  it('emits hasMenu when menuUrl is maintained', () => {
    const graph = build({ ...baseRestaurant, menuUrl: 'https://boiiboii.de/menu' })
    const restaurant = graph['@graph'].find((n: { '@type': string }) => n['@type'] === 'Restaurant')
    expect(restaurant.hasMenu).toBe('https://boiiboii.de/menu')
  })

  it('omits hasMenu without menuUrl', () => {
    const graph = build(baseRestaurant)
    const restaurant = graph['@graph'].find((n: { '@type': string }) => n['@type'] === 'Restaurant')
    expect(restaurant).not.toHaveProperty('hasMenu')
  })
})
