import { describe, it, expect } from 'vitest'
import { computeReferralPools, sampleN } from '@/lib/referral/pools'

describe('computeReferralPools', () => {
  const allIds = ['r1', 'r2', 'r3', 'r4', 'r5']

  it('friendPool = all minus (anon ∪ signed)', () => {
    const { friendPool } = computeReferralPools({
      allIds,
      anonIds: new Set(['r1']),
      signedIds: new Set(['r2']),
      inviterEntitledIds: new Set(['r3']),
    })
    expect([...friendPool].sort()).toEqual(['r3', 'r4', 'r5'])
  })

  it('inviterPool also subtracts inviter entitlements', () => {
    const { inviterPool } = computeReferralPools({
      allIds,
      anonIds: new Set(['r1']),
      signedIds: new Set(['r2']),
      inviterEntitledIds: new Set(['r3']),
    })
    expect([...inviterPool].sort()).toEqual(['r4', 'r5'])
  })

  it('all-berlin inviter (sees everything) → empty inviterPool', () => {
    const { inviterPool } = computeReferralPools({
      allIds,
      anonIds: new Set(),
      signedIds: new Set(),
      inviterEntitledIds: new Set(allIds),
    })
    expect(inviterPool).toEqual([])
  })
})

describe('sampleN', () => {
  it('returns at most n items', () => {
    expect(sampleN(['a', 'b', 'c'], 2)).toHaveLength(2)
  })
  it('returns the whole pool when smaller than n', () => {
    expect(sampleN(['a', 'b'], 5).sort()).toEqual(['a', 'b'])
  })
  it('empty pool → []', () => {
    expect(sampleN([], 5)).toEqual([])
  })
  it('returns only pool items, no duplicates', () => {
    const pool = ['a', 'b', 'c', 'd', 'e']
    const out = sampleN(pool, 3)
    expect(new Set(out).size).toBe(out.length)
    out.forEach((x) => expect(pool).toContain(x))
  })
})
