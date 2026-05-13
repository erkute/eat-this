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

  it('every category pack has a non-empty slug (matches Sanity category slug)', () => {
    // The slug is what we query Sanity with — Sanity uses hyphenated form
    // (e.g. 'fine-dining', 'fast-food'), packId uses the concatenated form
    // (e.g. 'category-finedining'). The two intentionally differ for the
    // two-word categories.
    const slugs = new Set<string>()
    for (const p of Object.values(CATALOG)) {
      if (p.type === 'category') {
        expect(p.slug).toBeTruthy()
        expect(slugs.has(p.slug!)).toBe(false)
        slugs.add(p.slug!)
      }
    }
    expect(slugs.size).toBe(9)
  })

  it('getPack returns the pack for a known id and null for unknown', () => {
    expect(getPack('category-pizza')?.slug).toBe('pizza')
    expect(getPack('not-a-real-pack')).toBeNull()
  })

  it('every pack has a non-empty description (rendered in ProfileBooster + Stripe Dashboard)', () => {
    for (const p of Object.values(CATALOG)) {
      expect(p.description).toBeTruthy()
      expect(p.description.length).toBeGreaterThan(20)
    }
  })
})
