import { describe, it, expect } from 'vitest'
import { CATALOG, getPack, allPackIds } from '../../lib/stripe-catalog'

describe('stripe-catalog', () => {
  it('contains 9 category packs and 1 all-berlin pack', () => {
    expect(allPackIds()).toHaveLength(10)
  })

  it('every category pack costs 299 cents (€2,99)', () => {
    const cats = Object.values(CATALOG).filter((p) => p.type === 'category')
    expect(cats).toHaveLength(9)
    for (const p of cats) expect(p.amountCents).toBe(299)
  })

  it('all-berlin pack costs 2000 cents (€20)', () => {
    expect(CATALOG['all-berlin'].amountCents).toBe(2000)
  })

  it('every category pack has a non-empty slug matching its packId suffix', () => {
    for (const p of Object.values(CATALOG)) {
      if (p.type === 'category') {
        expect(p.slug).toBeTruthy()
        expect(`category-${p.slug}`).toBe(p.packId)
      }
    }
  })

  it('getPack returns the pack for a known id and null for unknown', () => {
    expect(getPack('category-pizza')?.slug).toBe('pizza')
    expect(getPack('not-a-real-pack')).toBeNull()
  })
})
