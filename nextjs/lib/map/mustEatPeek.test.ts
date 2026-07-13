import { describe, it, expect } from 'vitest'
import { buildPeekMustEatMap, resolvePeek } from './mustEatPeek'
import type { MapMustEat } from '@/lib/types'

function me(id: string, restId: string, order: number, image = `img-${id}`): MapMustEat {
  return {
    _id: id, dish: id, image, order,
    restaurant: { _id: restId, name: restId, slug: restId, lat: 0, lng: 0 },
  }
}

describe('buildPeekMustEatMap', () => {
  it('prefers a face-up must-eat over a lower-order covered card', () => {
    const map = buildPeekMustEatMap(
      [me('covered-primary', 'r1', 2), me('open-secondary', 'r1', 13)],
      new Set(['open-secondary']),
    )

    expect(map.get('r1')?._id).toBe('open-secondary')
  })

  it('keeps the lowest-order card when none are face-up', () => {
    const map = buildPeekMustEatMap([me('b', 'r1', 2), me('a', 'r1', 1)], new Set())

    expect(map.get('r1')?._id).toBe('a')
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

  it('returns covered when unlocked but the dish image is empty', () => {
    const noImg = { ...me('m2', 'r1', 1), image: '' }
    expect(resolvePeek(noImg, new Set(['m2']), new Set())).toEqual({ kind: 'covered' })
  })
})
