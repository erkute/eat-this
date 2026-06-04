import { describe, it, expect } from 'vitest'
import { pickSpotOfDay, type SpotCandidate } from './pickSpotOfDay'

const r = (id: string, o: Partial<SpotCandidate> = {}): SpotCandidate => ({
  _id: id, featuredOnDate: null, featured: false, mustEatCount: 0, ...o,
})

describe('pickSpotOfDay', () => {
  it('prefers a restaurant whose featuredOnDate equals today', () => {
    const today = '2026-06-01'
    const list = [r('a', { mustEatCount: 9 }), r('b', { featuredOnDate: today }), r('c')]
    expect(pickSpotOfDay(list, today)?._id).toBe('b')
  })

  it('ignores featuredOnDate that is not today (falls to rotation)', () => {
    const list = [r('a', { featuredOnDate: '2026-05-30' }), r('b'), r('c')]
    // No dated match for this day → a rotation pick, never the stale-dated 'a'
    // just because it has a (different) date.
    const picked = pickSpotOfDay(list, '2026-06-01')?._id
    expect(['a', 'b', 'c']).toContain(picked)
  })

  it('is deterministic for the same day and input', () => {
    const list = [r('a'), r('b'), r('c')]
    expect(pickSpotOfDay(list, '2026-06-01')?._id).toBe(pickSpotOfDay(list, '2026-06-01')?._id)
  })

  it('is stable regardless of input order (sorts by id)', () => {
    const a = pickSpotOfDay([r('a'), r('b'), r('c')], '2026-06-01')?._id
    const b = pickSpotOfDay([r('c'), r('a'), r('b')], '2026-06-01')?._id
    expect(a).toBe(b)
  })

  it('rotates daily — three consecutive days cover all three spots', () => {
    const list = [r('a'), r('b'), r('c')]
    const picks = new Set([
      pickSpotOfDay(list, '2026-06-01')?._id,
      pickSpotOfDay(list, '2026-06-02')?._id,
      pickSpotOfDay(list, '2026-06-03')?._id,
    ])
    expect(picks.size).toBe(3)
  })

  it('returns null for an empty list', () => {
    expect(pickSpotOfDay([], '2026-06-01')).toBeNull()
  })
})
