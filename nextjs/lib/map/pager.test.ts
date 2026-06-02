import { describe, it, expect } from 'vitest'
import { resolveAdjacent } from './pager'

type R = { _id: string }
const list: R[] = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]

describe('resolveAdjacent', () => {
  it('returns prev+next around a middle item', () => {
    const r = resolveAdjacent(list, 'b')
    expect(r.index).toBe(1)
    expect(r.prev?._id).toBe('a')
    expect(r.next?._id).toBe('c')
  })
  it('has no prev at the first item', () => {
    const r = resolveAdjacent(list, 'a')
    expect(r.prev).toBeNull()
    expect(r.next?._id).toBe('b')
  })
  it('has no next at the last item', () => {
    const r = resolveAdjacent(list, 'c')
    expect(r.prev?._id).toBe('b')
    expect(r.next).toBeNull()
  })
  it('returns all null when the id is not in the list', () => {
    const r = resolveAdjacent(list, 'x')
    expect(r.index).toBe(-1)
    expect(r.prev).toBeNull()
    expect(r.next).toBeNull()
  })
  it('handles an empty list', () => {
    const r = resolveAdjacent([], 'a')
    expect(r).toEqual({ index: -1, prev: null, next: null })
  })
})
