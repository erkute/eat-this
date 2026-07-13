import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  retrieveVerified: vi.fn(),
  refundsCreate: vi.fn(),
  assembleAndWriteEntitlement: vi.fn(),
  markGuestMagicLinkSent: vi.fn(),
  findOrCreateUserByEmail: vi.fn(),
  sendMagicLinkEmail: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}))

vi.mock('../../../lib/stripe', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mocks.constructEvent },
    refunds: { create: mocks.refundsCreate },
  }),
}))

vi.mock('../../../lib/stripe-session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/stripe-session')>()
  return {
    ...actual,
    retrieveVerifiedCheckoutSession: mocks.retrieveVerified,
  }
})

vi.mock('../../../lib/stripe-fulfill', () => ({
  assembleAndWriteEntitlement: mocks.assembleAndWriteEntitlement,
  findOrCreateUserByEmail: mocks.findOrCreateUserByEmail,
  markGuestMagicLinkSent: mocks.markGuestMagicLinkSent,
}))

vi.mock('../../../lib/auth/sendMagicLink', () => ({
  sendMagicLinkEmail: mocks.sendMagicLinkEmail,
}))

vi.mock('@sentry/nextjs', () => ({
  captureMessage:   mocks.captureMessage,
  captureException: mocks.captureException,
}))

import { POST } from '../../../app/api/stripe/webhook/route'
import { CheckoutSessionIntegrityError } from '../../../lib/stripe-session'

function makeReq(body: string, sig: string | null) {
  return new Request('http://x/api/stripe/webhook', {
    method:  'POST',
    headers: sig ? { 'stripe-signature': sig } : {},
    body,
  })
}

function event(id = 'cs_test', type = 'checkout.session.completed') {
  return { id: `evt_${id}`, type, data: { object: { id } } }
}

function verifiedSession({
  id = 'cs_test',
  paymentStatus = 'paid',
  mode = 'auth',
  uid = 'u1' as string | null,
  email = null as string | null,
  locale = 'de',
} = {}) {
  return {
    session: {
      id,
      payment_status: paymentStatus,
      payment_intent: `pi_${id}`,
      customer_details: email ? { email } : null,
    },
    pack: { packId: 'category-pizza' },
    mode,
    locale,
    uid,
  }
}

beforeEach(() => {
  mocks.constructEvent.mockReset()
  mocks.retrieveVerified.mockReset()
  mocks.retrieveVerified.mockImplementation(async (id: string) => verifiedSession({ id }))
  mocks.refundsCreate.mockReset()
  mocks.refundsCreate.mockResolvedValue({ id: 're_test' })
  mocks.assembleAndWriteEntitlement.mockReset()
  mocks.assembleAndWriteEntitlement.mockResolvedValue({ status: 'created' })
  mocks.markGuestMagicLinkSent.mockReset()
  mocks.markGuestMagicLinkSent.mockResolvedValue(undefined)
  mocks.captureMessage.mockReset()
  mocks.captureException.mockReset()
  mocks.findOrCreateUserByEmail.mockReset()
  mocks.sendMagicLinkEmail.mockReset()
  mocks.sendMagicLinkEmail.mockResolvedValue({ ok: true })
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_xxx'
  process.env.NEXT_PUBLIC_APP_URL = 'https://trusted.example'
})

describe('/api/stripe/webhook', () => {
  it('returns 400 on missing signature', async () => {
    const res = await POST(makeReq('raw', null))
    expect(res.status).toBe(400)
  })

  it('returns 400 on invalid signature', async () => {
    mocks.constructEvent.mockImplementationOnce(() => { throw new Error('bad sig') })
    const res = await POST(makeReq('raw', 't=1,v1=bad'))
    expect(res.status).toBe(400)
  })

  it('writes entitlement from a catalog-verified paid session', async () => {
    mocks.constructEvent.mockReturnValueOnce(event())
    const res = await POST(makeReq('raw', 'sig'))
    expect(res.status).toBe(200)
    expect(mocks.retrieveVerified).toHaveBeenCalledWith('cs_test')
    expect(mocks.assembleAndWriteEntitlement).toHaveBeenCalledWith({
      uid: 'u1', packId: 'category-pizza', stripeSessionId: 'cs_test',
    })
  })

  it('returns 200 (no-op) on unrelated event types', async () => {
    mocks.constructEvent.mockReturnValueOnce({ id: 'evt_2', type: 'invoice.paid' })
    const res = await POST(makeReq('raw', 'sig'))
    expect(res.status).toBe(200)
    expect(mocks.retrieveVerified).not.toHaveBeenCalled()
    expect(mocks.assembleAndWriteEntitlement).not.toHaveBeenCalled()
  })

  it('does not fulfill an unpaid session', async () => {
    mocks.constructEvent.mockReturnValueOnce(event('cs_async'))
    mocks.retrieveVerified.mockResolvedValueOnce(verifiedSession({
      id: 'cs_async', paymentStatus: 'unpaid',
    }))
    const res = await POST(makeReq('raw', 'sig'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ pending: 'unpaid' })
    expect(mocks.assembleAndWriteEntitlement).not.toHaveBeenCalled()
  })

  it('fulfills on checkout.session.async_payment_succeeded once paid', async () => {
    mocks.constructEvent.mockReturnValueOnce(event(
      'cs_async', 'checkout.session.async_payment_succeeded',
    ))
    const res = await POST(makeReq('raw', 'sig'))
    expect(res.status).toBe(200)
    expect(mocks.assembleAndWriteEntitlement).toHaveBeenCalledWith({
      uid: 'u1', packId: 'category-pizza', stripeSessionId: 'cs_async',
    })
  })

  it('does not refund or resend guest mail once its outbox marker exists', async () => {
    mocks.constructEvent.mockReturnValueOnce(event('cs_guest_retry'))
    mocks.retrieveVerified.mockResolvedValueOnce(verifiedSession({
      id: 'cs_guest_retry', mode: 'guest', uid: null, email: 'guest@example.com',
    }))
    mocks.findOrCreateUserByEmail.mockResolvedValueOnce('guest-uid')
    mocks.assembleAndWriteEntitlement.mockResolvedValueOnce({
      status: 'exists',
      existingPackId: 'category-pizza',
      existingStripeSessionId: 'cs_guest_retry',
      guestMagicLinkSent: true,
    })
    const res = await POST(makeReq('raw', 'sig'))
    expect(res.status).toBe(200)
    expect(mocks.refundsCreate).not.toHaveBeenCalled()
    expect(mocks.sendMagicLinkEmail).not.toHaveBeenCalled()
  })

  it('retries a failed same-session guest mail with the stable idempotency key', async () => {
    mocks.constructEvent.mockReturnValueOnce(event('cs_guest_retry'))
    mocks.retrieveVerified.mockResolvedValueOnce(verifiedSession({
      id: 'cs_guest_retry', mode: 'guest', uid: null, email: 'guest@example.com',
    }))
    mocks.findOrCreateUserByEmail.mockResolvedValueOnce('guest-uid')
    mocks.assembleAndWriteEntitlement.mockResolvedValueOnce({
      status: 'exists',
      existingPackId: 'category-pizza',
      existingStripeSessionId: 'cs_guest_retry',
      guestMagicLinkSent: false,
    })

    const res = await POST(makeReq('raw', 'sig'))

    expect(res.status).toBe(200)
    expect(mocks.sendMagicLinkEmail).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: 'stripe-guest-magic-link/cs_guest_retry',
    }))
    expect(mocks.markGuestMagicLinkSent).toHaveBeenCalledWith({
      uid: 'guest-uid',
      packId: 'category-pizza',
      stripeSessionId: 'cs_guest_retry',
    })
  })

  it('refunds a different paid session for an existing entitlement', async () => {
    mocks.constructEvent.mockReturnValueOnce(event('cs_duplicate'))
    mocks.assembleAndWriteEntitlement.mockResolvedValueOnce({
      status: 'exists',
      existingPackId: 'category-pizza',
      existingStripeSessionId: 'cs_original',
      guestMagicLinkSent: true,
    })

    const res = await POST(makeReq('raw', 'sig'))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ result: 'duplicate_refunded' })
    expect(mocks.refundsCreate).toHaveBeenCalledWith(
      {
        payment_intent: 'pi_cs_duplicate',
        reason: 'duplicate',
        metadata: {
          reason: 'duplicate_entitlement',
          checkoutSessionId: 'cs_duplicate',
          existingPackId: 'category-pizza',
        },
      },
      { idempotencyKey: 'duplicate-entitlement-refund:cs_duplicate' },
    )
  })

  it('acknowledges and rejects a session that fails catalog integrity', async () => {
    mocks.constructEvent.mockReturnValueOnce(event('cs_bad'))
    mocks.retrieveVerified.mockRejectedValueOnce(
      new CheckoutSessionIntegrityError('wrong_amount'),
    )
    const res = await POST(makeReq('raw', 'sig'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ rejected: 'session_integrity' })
    expect(mocks.assembleAndWriteEntitlement).not.toHaveBeenCalled()
    expect(mocks.captureMessage).toHaveBeenCalled()
  })

  it('returns 500 when session retrieval fails transiently', async () => {
    mocks.constructEvent.mockReturnValueOnce(event('cs_retry'))
    mocks.retrieveVerified.mockRejectedValueOnce(new Error('Stripe timeout'))
    const res = await POST(makeReq('raw', 'sig'))
    expect(res.status).toBe(500)
    expect(mocks.captureException).toHaveBeenCalled()
  })

  it('returns 500 when fulfillment throws', async () => {
    mocks.constructEvent.mockReturnValueOnce(event())
    mocks.assembleAndWriteEntitlement.mockRejectedValueOnce(new Error('sanity down'))
    const res = await POST(makeReq('raw', 'sig'))
    expect(res.status).toBe(500)
    expect(mocks.captureException).toHaveBeenCalled()
  })

  it('awaits the first guest magic-link send and uses the configured app URL', async () => {
    mocks.constructEvent.mockReturnValueOnce(event('cs_guest'))
    mocks.retrieveVerified.mockResolvedValueOnce(verifiedSession({
      id: 'cs_guest', mode: 'guest', uid: null,
      email: 'guest@example.com', locale: 'en',
    }))
    mocks.findOrCreateUserByEmail.mockResolvedValueOnce('guest-uid')
    let finishSend: (() => void) | undefined
    mocks.sendMagicLinkEmail.mockReturnValueOnce(
      new Promise((resolve) => {
        finishSend = () => resolve({ ok: true })
      }),
    )

    let settled = false
    const responsePromise = POST(makeReq('raw', 'sig')).then((response) => {
      settled = true
      return response
    })
    await Promise.resolve()
    expect(settled).toBe(false)
    finishSend?.()
    const res = await responsePromise

    expect(res.status).toBe(200)
    expect(mocks.sendMagicLinkEmail).toHaveBeenCalledWith({
      email: 'guest@example.com',
      continueUrl: 'https://trusted.example/en/profile',
      appUrl: 'https://trusted.example',
      idempotencyKey: 'stripe-guest-magic-link/cs_guest',
    })
    expect(mocks.markGuestMagicLinkSent).toHaveBeenCalledWith({
      uid: 'guest-uid',
      packId: 'category-pizza',
      stripeSessionId: 'cs_guest',
    })
  })

  it('returns 500 and leaves the guest outbox pending when email delivery fails', async () => {
    mocks.constructEvent.mockReturnValueOnce(event('cs_guest_fail'))
    mocks.retrieveVerified.mockResolvedValueOnce(verifiedSession({
      id: 'cs_guest_fail', mode: 'guest', uid: null, email: 'guest@example.com',
    }))
    mocks.findOrCreateUserByEmail.mockResolvedValueOnce('guest-uid')
    mocks.sendMagicLinkEmail.mockResolvedValueOnce({ ok: false, error: 'send-failed' })

    const res = await POST(makeReq('raw', 'sig'))

    expect(res.status).toBe(500)
    expect(mocks.markGuestMagicLinkSent).not.toHaveBeenCalled()
  })
})
