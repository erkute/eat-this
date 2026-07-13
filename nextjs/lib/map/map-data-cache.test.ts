// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'

import type { CachedMapData } from './map-data-cache'
import {
  clearMapDataCaches,
  readMapCache,
  reconcileMapDataCacheIdentity,
  writeMapCache,
} from './map-data-cache'

const data = {
  restaurants: [],
  lockedRestaurants: [],
  mustEats: [{
    _id: 'm1',
    dish: 'private dish',
    description: 'private description',
    descriptionEn: 'private description en',
    price: '€€',
    image: '/api/must-eat-image/m1',
    restaurant: {
      _id: 'r1',
      name: 'Restaurant',
      slug: 'restaurant',
      lat: 1,
      lng: 2,
    },
  }],
  categories: [],
  totalCount: 1,
  revealedMustEatIds: ['m1'],
} satisfies CachedMapData

beforeEach(() => window.localStorage.clear())

describe('map data cache premium boundary', () => {
  it('persists only metadata, never hydrated Premium Must-Eat fields', () => {
    writeMapCache('user-1', data)
    const cached = readMapCache('user-1')

    expect(cached?.mustEats[0]).toEqual({
      _id: 'm1',
      restaurant: data.mustEats[0].restaurant,
    })
    expect(cached?.revealedMustEatIds).toEqual([])
    expect(JSON.stringify(window.localStorage)).not.toContain('private dish')
  })

  it('deletes legacy caches and caches owned by a different identity', () => {
    window.localStorage.setItem('eatthis_mapdata_old-user', 'legacy-private')
    writeMapCache('user-1', data)

    reconcileMapDataCacheIdentity('user-2')

    expect(window.localStorage.getItem('eatthis_mapdata_old-user')).toBeNull()
    expect(readMapCache('user-1')).toBeNull()
  })

  it('clears every map cache on logout', () => {
    writeMapCache('user-1', data)
    clearMapDataCaches()
    expect(readMapCache('user-1')).toBeNull()
  })
})
