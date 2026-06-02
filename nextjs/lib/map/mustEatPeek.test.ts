import { describe, it, expect } from 'vitest'
import { buildPrimaryMustEatMap, resolvePeek } from './mustEatPeek'
import type { MapMustEat } from '@/lib/types'

function me(id: string, restId: string, order: number, image = `img-${id}`): MapMustEat {
  return {
    _id: id, dish: id, image, order,
    restaurant: { _id: restId, name: restId, slug: restId, lat: 0, lng: 0 },
  }
}

describe('buildPrimaryMustEatMap', () => {
  it('keys by restaurant id and keeps the lowest-order must-eat per restaurant', () => {
    const map = buildPrimaryMustEatMap([me('b', 'r1', 2), me('a', 'r1', 1), me('c', 'r2', 5)])
    expect(map.get('r1')?._id).toBe('a')
    expect(map.get('r2')?._id).toBe('c')
    expect(map.size).toBe(2)
  })

  it('falls back to array order when order is undefined', () => {
    const m1 = { ...me('x', 'r1', 0), order: undefined }
    const m2 = { ...me('y', 'r1', 0), order: undefined }
    const map = buildPrimaryMustEatMap([m1, m2])
    expect(map.get('r1')?._id).toBe('x')
  })
})

describe('resolvePeek', () => {
  const primary = me('m1', 'r1', 1, 'dish.jpg')

  it('returns none when restaurant has no must-eat', () => {
    expect(resolvePeek(undefined, new Set(), new Set())).toEqual({ kind: 'none' })
  })

  it('returns open with the dish image when unlocked', () => {
    expect(resolvePeek(primary, new Set(['m1']), new Set())).toEqual({ kind: 'open', image: 'dish.jpg' })
  })

  it('returns open when pre-revealed for anon', () => {
    expect(resolvePeek(primary, new Set(), new Set(['m1']))).toEqual({ kind: 'open', image: 'dish.jpg' })
  })

  it('returns covered when neither unlocked nor revealed', () => {
    expect(resolvePeek(primary, new Set(), new Set())).toEqual({ kind: 'covered' })
  })
})
