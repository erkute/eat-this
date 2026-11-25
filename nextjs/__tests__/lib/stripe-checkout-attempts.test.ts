import { Timestamp } from 'firebase-admin/firestore'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fake = vi.hoisted(() => {
  let data: Record<string, unknown> | null = null
  const ref = { path: 'users/u1/stripeCheckoutAttempts/category-pizza' }
  const tx = {
    get: vi.fn(async () => ({
      get exists() { return data !== null },
      data: () => data,
    })),
    set: vi.fn((_ref: unknown, value: Record<string, unknown>) => { data = value }),
    update: vi.fn((_ref: unknown, value: Record<string, unknown>) => {
      data = { ...(data ?? {}), ...value }
    }),
  }
  const db = {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        collection: vi.fn(() => ({ doc: vi.fn(() => ref) })),
      })),
    })),
    runTransaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
  }
  return {
    db,
    tx,
    getData: () => data,
    setData: (value: Record<string, unknown> | null) => { data = value },
  }
})

vi.mock('../../lib/firebase/admin', () => ({
  getAdminFirestore: () => fake.db,
}))

import {
  reserveCheckoutAttempt,
  saveCheckoutAttempt,
} from '../../lib/stripe-checkout-attempts'

beforeEach(() => {
  fake.setData(null)
  fake.tx.get.mockClear()
  fake.tx.set.mockClear()
  fake.tx.update.mockClear()
})

describe('authenticated Stripe Checkout attempts', () => {
  it('reuses the in-flight attempt and its original locale after a language change', async () => {
    const first = await reserveCheckoutAttempt('u1', 'category-pizza', 'en')
    const second = await reserveCheckoutAttempt('u1', 'category-pizza', 'de')

    expect(first).toMatchObject({ kind: 'create', locale: 'en' })
    expect(fake.getData()).toMatchObject({ locale: 'en' })
    expect(second).toEqual(first)
    expect(fake.tx.set).toHaveBeenCalledTimes(1)
  })

  it('reuses the stored Hosted Checkout URL after a language change', async () => {
    const attempt = await reserveCheckoutAttempt('u1', 'category-pizza', 'en')
    expect(attempt.kind).toBe('create')
    if (attempt.kind !== 'create') throw new Error('unexpected attempt')

    await saveCheckoutAttempt(
      'u1', 'category-pizza', attempt.attemptId,
      'cs_test', 'https://checkout.stripe.com/test',
    )
    const reused = await reserveCheckoutAttempt('u1', 'category-pizza', 'de')

    expect(reused).toEqual({ kind: 'reuse', url: 'https://checkout.stripe.com/test' })
  })

  it('replaces an expired attempt', async () => {
    fake.setData({
      attemptId: 'expired',
      expiresAt: Timestamp.fromMillis(Date.now() - 60_000),
      sessionUrl: 'https://checkout.stripe.com/expired',
    })

    const next = await reserveCheckoutAttempt('u1', 'category-pizza', 'de')

    expect(next).toMatchObject({ kind: 'create', locale: 'de' })
    if (next.kind === 'create') expect(next.attemptId).not.toBe('expired')
    expect(fake.tx.set).toHaveBeenCalledOnce()
  })

  it('replaces an unfinished attempt too close to Stripe\'s minimum expiry', async () => {
    fake.setData({
      attemptId: 'too-close',
      locale: 'en',
      expiresAt: Timestamp.fromMillis(Date.now() + 25 * 60_000),
    })

    const next = await reserveCheckoutAttempt('u1', 'category-pizza', 'de')

    expect(next.kind).toBe('create')
    if (next.kind === 'create') expect(next.attemptId).not.toBe('too-close')
    expect(fake.tx.set).toHaveBeenCalledOnce()
  })

  it('waits for the URL or expiry if a pending attempt has no stored locale', async () => {
    fake.setData({
      attemptId: 'pending',
      expiresAt: Timestamp.fromMillis(Date.now() + 25 * 60_000),
    })

    expect(await reserveCheckoutAttempt('u1', 'category-pizza', 'de'))
      .toEqual({ kind: 'pending' })
    expect(fake.tx.set).not.toHaveBeenCalled()

    await saveCheckoutAttempt(
      'u1', 'category-pizza', 'pending',
      'cs_test', 'https://checkout.stripe.com/pending',
    )
    expect(await reserveCheckoutAttempt('u1', 'category-pizza', 'en'))
      .toEqual({ kind: 'reuse', url: 'https://checkout.stripe.com/pending' })
  })

  it('does not let a stale Stripe response overwrite a newer attempt', async () => {
    fake.setData({
      attemptId: 'new-attempt',
      expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
    })

    await saveCheckoutAttempt(
      'u1', 'category-pizza', 'old-attempt',
      'cs_old', 'https://checkout.stripe.com/old',
    )

    expect(fake.tx.update).not.toHaveBeenCalled()
    expect(fake.getData()).not.toHaveProperty('sessionUrl')
  })
})
