import { describe, it, expect } from 'vitest'
import { resolveUnlockedMustEatIds } from './unlockedMustEats'

describe('resolveUnlockedMustEatIds', () => {
  it('anon: exactly the server-revealed set (curated 10 + spot-of-day)', () => {
    const out = resolveUnlockedMustEatIds({
      uid: null,
      storedUnlockedIds: new Set(),
      revealedMustEatIds: new Set(['m1', 'm2', 'm3']),
    })
    expect(out).toEqual(new Set(['m1', 'm2', 'm3']))
  })

  it('anon: storedUnlockedIds are ignored (nothing to persist without a uid)', () => {
    const out = resolveUnlockedMustEatIds({
      uid: null,
      storedUnlockedIds: new Set(['stored-a']),
      revealedMustEatIds: new Set(['m1']),
    })
    expect(out).toEqual(new Set(['m1']))
  })

  it('signed-in: stored ∪ revealed', () => {
    const out = resolveUnlockedMustEatIds({
      uid: 'user-1',
      storedUnlockedIds: new Set(['stored-a', 'stored-b']),
      revealedMustEatIds: new Set(['revealed-x']),
    })
    expect(out).toEqual(new Set(['stored-a', 'stored-b', 'revealed-x']))
  })

  it('signed-in: publicFaceUpIds are unioned in (publicly face-up ⇒ face-up everywhere)', () => {
    const out = resolveUnlockedMustEatIds({
      uid: 'user-1',
      storedUnlockedIds: new Set(['stored-a']),
      // Signed-in /api/map-data ships an empty revealed set …
      revealedMustEatIds: new Set(),
      // … so the anon public set is folded in explicitly.
      publicFaceUpIds: new Set(['m3']),
    })
    expect(out).toEqual(new Set(['stored-a', 'm3']))
  })

  it('anon: publicFaceUpIds fold in (inert when equal to the revealed set)', () => {
    const out = resolveUnlockedMustEatIds({
      uid: null,
      storedUnlockedIds: new Set(),
      revealedMustEatIds: new Set(['m1']),
      publicFaceUpIds: new Set(['m1', 'm2']),
    })
    expect(out).toEqual(new Set(['m1', 'm2']))
  })

  it('empty inputs → empty set (both branches)', () => {
    for (const uid of ['u', null]) {
      expect(
        resolveUnlockedMustEatIds({
          uid,
          storedUnlockedIds: new Set(),
          revealedMustEatIds: new Set(),
        }),
      ).toEqual(new Set())
    }
  })
})
