import { describe, expect, it } from 'vitest'
import type { MapMustEat } from '@/lib/types'
import type { InitialMapData } from './server-initial-map-data'
import {
  selectHomeInitialMapData,
  selectInitialMustEatsData,
} from './initial-surface-data'

function mapData(): InitialMapData {
  const mustEats = Array.from({ length: 9 }, (_, index) => ({
    _id: `must-eat-${index + 1}`,
  })) as MapMustEat[]

  return {
    restaurants: [],
    lockedRestaurants: [],
    mustEats,
    categories: [],
    totalCount: 42,
    revealedMustEatIds: [
      'must-eat-1',
      'must-eat-2',
      'must-eat-3',
      'must-eat-4',
      'must-eat-5',
      'must-eat-6',
      'must-eat-8',
    ],
  }
}

describe('initial surface data selectors', () => {
  it('keeps only the six public Must Eats needed by the home teaser', () => {
    const data = mapData()
    data.lockedRestaurants = [{ _id: 'locked' }] as InitialMapData['lockedRestaurants']
    data.categories = [{ slug: 'pizza' }] as InitialMapData['categories']

    const selected = selectHomeInitialMapData(data)

    expect(selected.mustEats.map(({ _id }) => _id)).toEqual([
      'must-eat-1',
      'must-eat-2',
      'must-eat-3',
      'must-eat-4',
      'must-eat-5',
      'must-eat-6',
    ])
    expect(selected.lockedRestaurants).toEqual([])
    expect(selected.categories).toEqual([])
    expect(selected.restaurants).toBe(data.restaurants)
    expect(selected.revealedMustEatIds).toBe(data.revealedMustEatIds)
    expect(data.mustEats).toHaveLength(9)
  })

  it('keeps only catalog fields for the Must-Eats page', () => {
    const data = mapData()

    expect(selectInitialMustEatsData(data)).toEqual({
      mustEats: data.mustEats,
      revealedMustEatIds: data.revealedMustEatIds,
    })
  })
})
