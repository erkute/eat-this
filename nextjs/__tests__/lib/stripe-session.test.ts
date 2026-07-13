import type Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPack } from '../../lib/stripe-catalog'

const mocks = vi.hoisted(() => ({ retrieve: vi.fn() }))

vi.mock('../../lib/stripe', () => ({
  getStripe: () => ({ checkout: { sessions: { retrieve: mocks.retrieve } } }),
}))

import {
  CheckoutSessionIntegrityError,
  paymentIntentId,
  retrieveVerifiedCheckoutSession,
  verifyCheckoutSession,
} from '../../lib/stripe-session'

function validSession(overrides: Record<string, unknown> = {}): Stripe.Checkout.Session {
  const pack = getPack('category-pizza')!
  return {
    id: 'cs_test',
    mode: 'payment',
    currency: 'eur',
    amount_total: pack.amountCents,
    payment_status: 'paid',
    payment_intent: 'pi_test',
    metadata: {
      uid: 'u1',
      packId: pack.packId,
      type: pack.type,
      slug: pack.slug,
      mode: 'auth',
      locale: 'de',
      checkoutPriceId: pack.stripePriceId,
      checkoutAmountCents: String(pack.amountCents),
    },
    line_items: {
      object: 'list',
      data: [{ quantity: 1, price: { id: pack.stripePriceId }, amount_total: pack.amountCents }],
      has_more: false,
      url: '/v1/checkout/sessions/cs_test/line_items',
    },
    ...overrides,
  } as unknown as Stripe.Checkout.Session
}

beforeEach(() => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_test')
  mocks.retrieve.mockReset()
})

describe('Stripe Checkout session integrity', () => {
  it('accepts a payment session bound to the catalog amount and Price', async () => {
    const verified = await verifyCheckoutSession(validSession())
    expect(verified.pack.packId).toBe('category-pizza')
    expect(verified.uid).toBe('u1')
    expect(verified.mode).toBe('auth')
  })

  it('accepts an immutable checkout snapshot after a later catalog rotation', async () => {
    const session = validSession({
      amount_total: 249,
      line_items: {
        object: 'list',
        data: [{ quantity: 1, price: { id: 'price_previous' }, amount_total: 249 }],
        has_more: false,
        url: '/line_items',
      },
    })
    session.metadata = {
      ...session.metadata,
      checkoutPriceId: 'price_previous',
      checkoutAmountCents: '249',
    }

    await expect(verifyCheckoutSession(session)).resolves.toMatchObject({
      pack: { packId: 'category-pizza' },
    })
  })

  it.each([
    ['wrong mode', { mode: 'subscription' }, 'wrong_mode'],
    ['wrong currency', { currency: 'usd' }, 'wrong_currency'],
    ['wrong amount', { amount_total: 1 }, 'wrong_amount'],
    [
      'wrong Price',
      {
        line_items: {
          object: 'list', data: [{ quantity: 1, price: { id: 'price_other' }, amount_total: 299 }],
          has_more: false, url: '/line_items',
        },
      },
      'wrong_price',
    ],
  ])('rejects %s', async (_label, override, reason) => {
    await expect(verifyCheckoutSession(validSession(override))).rejects.toMatchObject({
      name: 'CheckoutSessionIntegrityError',
      reason,
    })
  })

  it('rejects an auth session without a uid', async () => {
    const session = validSession()
    session.metadata = { ...session.metadata, uid: '' }
    await expect(verifyCheckoutSession(session)).rejects.toBeInstanceOf(
      CheckoutSessionIntegrityError,
    )
  })

  it('retrieves expanded line items before validating', async () => {
    mocks.retrieve.mockResolvedValueOnce(validSession())
    await retrieveVerifiedCheckoutSession('cs_test')
    expect(mocks.retrieve).toHaveBeenCalledWith('cs_test', {
      expand: ['line_items.data.price'],
    })
  })

  it('extracts both string and expanded PaymentIntent IDs', () => {
    expect(paymentIntentId(validSession())).toBe('pi_test')
    expect(paymentIntentId(validSession({ payment_intent: { id: 'pi_expanded' } }))).toBe('pi_expanded')
    expect(paymentIntentId(validSession({ payment_intent: null }))).toBeNull()
  })
})
