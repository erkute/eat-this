import { describe, it, expect } from 'vitest'
import { cosine } from './voyage'
import { applySemanticOrder } from './semanticSearch'

describe('cosine', () => {
  it('is 1 for identical direction, 0 for orthogonal, -1 for opposite', () => {
    expect(cosine([1, 0], [2, 0])).toBeCloseTo(1)
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0)
    expect(cosine([1, 0], [-1, 0])).toBeCloseTo(-1)
  })
  it('returns 0 for a zero vector instead of NaN', () => {
    expect(cosine([0, 0], [1, 1])).toBe(0)
  })
})

describe('applySemanticOrder', () => {
  const cands = [
    { slug: 'a', name: 'A' },
    { slug: 'b', name: 'B' },
    { slug: 'c', name: 'C' },
  ]

  it('reorders candidates by semantic rank', () => {
    const semantic = [
      { slug: 'c', score: 0.9 },
      { slug: 'a', score: 0.5 },
      { slug: 'b', score: 0.1 },
    ]
    expect(applySemanticOrder(cands, semantic).map((c) => c.slug)).toEqual(['c', 'a', 'b'])
  })

  it('is a no-op when semantic is null (fallback to keyword order)', () => {
    expect(applySemanticOrder(cands, null).map((c) => c.slug)).toEqual(['a', 'b', 'c'])
  })

  it('keeps candidates absent from the index at the end, in original order', () => {
    // Only 'b' is ranked; 'a' and 'c' aren't in the semantic result.
    const semantic = [{ slug: 'b', score: 0.8 }]
    expect(applySemanticOrder(cands, semantic).map((c) => c.slug)).toEqual(['b', 'a', 'c'])
  })

  it('is stable for equally-unranked items', () => {
    const semantic = [{ slug: 'zzz', score: 0.5 }] // matches none
    expect(applySemanticOrder(cands, semantic).map((c) => c.slug)).toEqual(['a', 'b', 'c'])
  })
})
