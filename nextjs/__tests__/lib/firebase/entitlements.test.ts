import { describe, it, expect, afterEach } from 'vitest'
import {
  reduceEntitlements,
  isAdminEmail,
  isAdminToken,
  ownsCategoryOf,
  type Entitlement,
} from '../../../lib/firebase/entitlements'

describe('reduceEntitlements', () => {
  it('returns empty sets and false flags for no docs', () => {
    const r = reduceEntitlements([])
    expect(r.hasAllBerlin).toBe(false)
    expect(r.categorySlugs.size).toBe(0)
    expect(r.mustEatIds.size).toBe(0)
  })

  it('collects category slugs', () => {
    const docs: Entitlement[] = [
      { type: 'category', slug: 'pizza', mustEatIds: [], purchasedAt: new Date() as any, stripeSessionId: 's1', source: 'stripe' },
      { type: 'category', slug: 'breakfast', mustEatIds: [], purchasedAt: new Date() as any, stripeSessionId: 's2', source: 'stripe' },
    ]
    const r = reduceEntitlements(docs)
    expect([...r.categorySlugs].sort()).toEqual(['breakfast', 'pizza'])
    expect(r.hasAllBerlin).toBe(false)
  })

  it('sets hasAllBerlin when an all-berlin doc is present', () => {
    const docs: Entitlement[] = [
      { type: 'all-berlin', slug: null, mustEatIds: [], purchasedAt: new Date() as any, stripeSessionId: 's3', source: 'stripe' },
    ]
    const r = reduceEntitlements(docs)
    expect(r.hasAllBerlin).toBe(true)
  })

  it('ignores category docs with no slug', () => {
    const docs: Entitlement[] = [
      { type: 'category', slug: null, mustEatIds: [], purchasedAt: new Date() as any, stripeSessionId: null, source: 'manual' },
    ]
    const r = reduceEntitlements(docs)
    expect(r.categorySlugs.size).toBe(0)
  })

  it('combines category + all-berlin into one resolved view', () => {
    const docs: Entitlement[] = [
      { type: 'category', slug: 'pizza', mustEatIds: [], purchasedAt: new Date() as any, stripeSessionId: 's1', source: 'stripe' },
      { type: 'all-berlin', slug: null, mustEatIds: [], purchasedAt: new Date() as any, stripeSessionId: 's2', source: 'stripe' },
    ]
    const r = reduceEntitlements(docs)
    expect(r.hasAllBerlin).toBe(true)
    expect([...r.categorySlugs]).toEqual(['pizza'])
    expect(r.mustEatIds.size).toBe(0)
  })

  it('collects mustEatIds from each doc into one deduped set', () => {
    const docs: Entitlement[] = [
      { type: 'category', slug: 'pizza', mustEatIds: ['me-1', 'me-2'], purchasedAt: new Date() as any, stripeSessionId: 's1', source: 'stripe' },
      { type: 'category', slug: 'breakfast', mustEatIds: ['me-2', 'me-3'], purchasedAt: new Date() as any, stripeSessionId: 's2', source: 'stripe' },
    ]
    const r = reduceEntitlements(docs)
    expect([...r.mustEatIds].sort()).toEqual(['me-1', 'me-2', 'me-3'])
  })

  // Eine Karte ist eine Karte, egal woher: gekauft und eingeladen landen im
  // selben Set, sonst müsste jede Fläche zwei Quellen zusammenrechnen.
  it('unions referral-bonus cards into the resolved set (deduped)', () => {
    const docs: Entitlement[] = [
      { type: 'category', slug: 'pizza', mustEatIds: ['me-1'], purchasedAt: new Date() as any, stripeSessionId: 's1', source: 'stripe' },
    ]
    const bonuses = [{ mustEatIds: ['me-2', 'me-3'] }, { mustEatIds: ['me-1'] }]
    const r = reduceEntitlements(docs, bonuses)
    expect([...r.mustEatIds].sort()).toEqual(['me-1', 'me-2', 'me-3'])
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

describe('isAdminToken', () => {
  const origEnv = process.env.ADMIN_EMAILS

  afterEach(() => {
    process.env.ADMIN_EMAILS = origEnv
  })

  it('grants admin for the `admin` custom claim regardless of email', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com'
    expect(isAdminToken({ admin: true })).toBe(true)
    expect(isAdminToken({ admin: true, email: 'nobody@elsewhere.com', emailVerified: false })).toBe(true)
  })

  it('grants admin for a VERIFIED email in ADMIN_EMAILS', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com'
    expect(isAdminToken({ email: 'admin@example.com', emailVerified: true })).toBe(true)
  })

  it('DENIES admin for an UNVERIFIED email in ADMIN_EMAILS (the vuln)', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com'
    expect(isAdminToken({ email: 'admin@example.com', emailVerified: false })).toBe(false)
    // missing emailVerified is treated as unverified
    expect(isAdminToken({ email: 'admin@example.com' })).toBe(false)
  })

  it('denies admin for a verified non-admin email', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com'
    expect(isAdminToken({ email: 'random@user.com', emailVerified: true })).toBe(false)
  })

  it('denies admin for an empty identity', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com'
    expect(isAdminToken({})).toBe(false)
  })
})

describe('ownsCategoryOf', () => {
  const baseEnt = { categorySlugs: new Set<string>() }

  it('returns true when any category slug matches — one shared tag is enough', () => {
    expect(ownsCategoryOf(
      { categories: [{ slug: 'pizza' }, { slug: 'dinner' }] },
      { categorySlugs: new Set(['pizza']) },
    )).toBe(true)
  })

  it('returns false when no match', () => {
    expect(ownsCategoryOf({ categories: [{ slug: 'pizza' }] }, baseEnt)).toBe(false)
  })

  it('handles undefined categories array', () => {
    expect(ownsCategoryOf({}, baseEnt)).toBe(false)
  })
})
