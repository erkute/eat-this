import { describe, it, expect } from 'vitest'
import { pickSpotOfDay, type SpotCandidate } from './pickSpotOfDay'

const r = (id: string, o: Partial<SpotCandidate> = {}): SpotCandidate => ({
  _id: id, featuredOnDate: null, featured: false, mustEatCount: 0, ...o,
})

describe('pickSpotOfDay', () => {
  it('prefers a restaurant whose featuredOnDate equals today', () => {
    const today = '2026-06-01'
    const list = [r('a', { mustEatCount: 9 }), r('b', { featuredOnDate: today }), r('c', { featured: true })]
    expect(pickSpotOfDay(list, today)?._id).toBe('b')
  })
  it('ignores featuredOnDate that is not today', () => {
    const list = [r('a', { featuredOnDate: '2026-05-30' }), r('b', { featured: true })]
    expect(pickSpotOfDay(list, '2026-06-01')?._id).toBe('b')
  })
  it('falls back to a featured restaurant when no dated match', () => {
    const list = [r('a', { mustEatCount: 5 }), r('b', { featured: true, mustEatCount: 1 })]
    expect(pickSpotOfDay(list, '2026-06-01')?._id).toBe('b')
  })
  it('falls back to the highest mustEatCount when none are featured', () => {
    const list = [r('a', { mustEatCount: 3 }), r('b', { mustEatCount: 7 }), r('c', { mustEatCount: 5 })]
    expect(pickSpotOfDay(list, '2026-06-01')?._id).toBe('b')
  })
  it('returns null for an empty list', () => {
    expect(pickSpotOfDay([], '2026-06-01')).toBeNull()
  })
})
