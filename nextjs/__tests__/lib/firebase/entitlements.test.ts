import { describe, it, expect, afterEach } from 'vitest'
import {
  reduceEntitlements,
  isAdminEmail,
  isRestaurantVisible,
  type Entitlement,
} from '../../../lib/firebase/entitlements'

describe('reduceEntitlements', () => {
  it('returns empty sets and false flags for no docs', () => {
    const r = reduceEntitlements([])
    expect(r.hasAllBerlin).toBe(false)
    expect(r.categorySlugs.size).toBe(0)
    expect(r.restaurantIds.size).toBe(0)
    expect(r.mustEatIds.size).toBe(0)
  })

  it('collects category slugs', () => {
    const docs: Entitlement[] = [
      { type: 'category', slug: 'pizza', restaurantIds: [], mustEatIds: [], purchasedAt: new Date() as any, stripeSessionId: 's1', source: 'stripe' },
      { type: 'category', slug: 'breakfast', restaurantIds: [], mustEatIds: [], purchasedAt: new Date() as any, stripeSessionId: 's2', source: 'stripe' },
    ]
    const r = reduceEntitlements(docs)
    expect([...r.categorySlugs].sort()).toEqual(['breakfast', 'pizza'])
    expect(r.hasAllBerlin).toBe(false)
  })

  it('sets hasAllBerlin when an all-berlin doc is present', () => {
    const docs: Entitlement[] = [
      { type: 'all-berlin', slug: null, restaurantIds: [], mustEatIds: [], purchasedAt: new Date() as any, stripeSessionId: 's3', source: 'stripe' },
    ]
    const r = reduceEntitlements(docs)
    expect(r.hasAllBerlin).toBe(true)
  })

  it('ignores category docs with no slug', () => {
    const docs: Entitlement[] = [
      { type: 'category', slug: null, restaurantIds: [], mustEatIds: [], purchasedAt: new Date() as any, stripeSessionId: null, source: 'manual' },
    ]
    const r = reduceEntitlements(docs)
    expect(r.categorySlugs.size).toBe(0)
  })

  it('combines category + all-berlin into one resolved view', () => {
    const docs: Entitlement[] = [
      { type: 'category', slug: 'pizza', restaurantIds: [], mustEatIds: [], purchasedAt: new Date() as any, stripeSessionId: 's1', source: 'stripe' },
      { type: 'all-berlin', slug: null, restaurantIds: [], mustEatIds: [], purchasedAt: new Date() as any, stripeSessionId: 's2', source: 'stripe' },
    ]
    const r = reduceEntitlements(docs)
    expect(r.hasAllBerlin).toBe(true)
    expect([...r.categorySlugs]).toEqual(['pizza'])
    expect(r.restaurantIds.size).toBe(0)
    expect(r.mustEatIds.size).toBe(0)
  })

  it('collects restaurantIds and mustEatIds from each doc into deduped sets', () => {
    const docs: Entitlement[] = [
      { type: 'category', slug: 'pizza', restaurantIds: ['rest-A', 'rest-B'], mustEatIds: ['me-1', 'me-2'], purchasedAt: new Date() as any, stripeSessionId: 's1', source: 'stripe' },
      { type: 'category', slug: 'breakfast', restaurantIds: ['rest-B', 'rest-C'], mustEatIds: ['me-2', 'me-3'], purchasedAt: new Date() as any, stripeSessionId: 's2', source: 'stripe' },
    ]
    const r = reduceEntitlements(docs)
    expect([...r.restaurantIds].sort()).toEqual(['rest-A', 'rest-B', 'rest-C'])
    expect([...r.mustEatIds].sort()).toEqual(['me-1', 'me-2', 'me-3'])
  })

  it('unions referral-bonus restaurantIds into the resolved set (deduped)', () => {
    const docs: Entitlement[] = [
      { type: 'category', slug: 'pizza', restaurantIds: ['rest-A'], mustEatIds: [], purchasedAt: new Date() as any, stripeSessionId: 's1', source: 'stripe' },
    ]
    const bonuses = [{ restaurantIds: ['rest-B', 'rest-C'] }, { restaurantIds: ['rest-A'] }]
    const r = reduceEntitlements(docs, bonuses)
    expect([...r.restaurantIds].sort()).toEqual(['rest-A', 'rest-B', 'rest-C'])
  })
})

describe('isAdminEmail', () => {
  const origEnv = process.env.ADMIN_EMAILS

  afterEach(() => {
    process.env.ADMIN_EMAILS = origEnv
  })

  it('returns false for null email', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com'
    expect(isAdminEmail(null)).toBe(false)
  })

  it('returns false when env var is unset', () => {
    delete process.env.ADMIN_EMAILS
    expect(isAdminEmail('admin@example.com')).toBe(false)
  })

  it('matches case-insensitively', () => {
    process.env.ADMIN_EMAILS = 'Admin@Example.com'
    expect(isAdminEmail('admin@EXAMPLE.com')).toBe(true)
  })

  it('handles comma-separated list with whitespace', () => {
    process.env.ADMIN_EMAILS = ' a@x.com , b@y.com '
    expect(isAdminEmail('b@y.com')).toBe(true)
    expect(isAdminEmail('c@z.com')).toBe(false)
  })
})

describe('isRestaurantVisible', () => {
  const baseEnt = {
    isAdmin: false,
    hasAllBerlin: false,
    categorySlugs: new Set<string>(),
    restaurantIds: new Set<string>(),
    mustEatIds: new Set<string>(),
  }

  it('returns true for admin regardless of categories', () => {
    expect(isRestaurantVisible({ _id: 'r1', categories: [] }, { ...baseEnt, isAdmin: true })).toBe(true)
  })

  it('returns true when hasAllBerlin', () => {
    expect(isRestaurantVisible({ _id: 'r1', categories: [] }, { ...baseEnt, hasAllBerlin: true })).toBe(true)
  })

  it('returns true when restaurant id is in explicit set', () => {
    expect(isRestaurantVisible({ _id: 'r1', categories: [] }, { ...baseEnt, restaurantIds: new Set(['r1']) })).toBe(true)
  })

  it('returns true when any category slug matches', () => {
    expect(isRestaurantVisible(
      { _id: 'r1', categories: [{ slug: 'pizza' }, { slug: 'dinner' }] as any },
      { ...baseEnt, categorySlugs: new Set(['pizza']) },
    )).toBe(true)
  })

  it('returns false when no match', () => {
    expect(isRestaurantVisible({ _id: 'r1', categories: [{ slug: 'pizza' }] as any }, baseEnt)).toBe(false)
  })

  it('handles undefined categories array', () => {
    expect(isRestaurantVisible({ _id: 'r1' } as any, baseEnt)).toBe(false)
  })
})

