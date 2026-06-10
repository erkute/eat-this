import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  assembleAndWriteEntitlement: vi.fn(),
  findOrCreateUserByEmail: vi.fn(),
  sendMagicLinkEmail: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}))

vi.mock('../../../lib/stripe', () => ({
  getStripe: () => ({ webhooks: { constructEvent: mocks.constructEvent } }),
}))

vi.mock('../../../lib/stripe-fulfill', () => ({
  assembleAndWriteEntitlement: mocks.assembleAndWriteEntitlement,
  findOrCreateUserByEmail: mocks.findOrCreateUserByEmail,
}))

vi.mock('../../../lib/auth/sendMagicLink', () => ({
  sendMagicLinkEmail: mocks.sendMagicLinkEmail,
}))

vi.mock('@sentry/nextjs', () => ({
  captureMessage:   mocks.captureMessage,
  captureException: mocks.captureException,
}))

import { POST } from '../../../app/api/stripe/webhook/route'

function makeReq(body: string, sig: string | null) {
  return new Request('http://x/api/stripe/webhook', {
    method:  'POST',
    headers: sig ? { 'stripe-signature': sig } : {},
    body,
  })
}

beforeEach(() => {
  mocks.constructEvent.mockReset()
  mocks.assembleAndWriteEntitlement.mockReset()
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

  it('writes entitlement on checkout.session.completed', async () => {
    mocks.constructEvent.mockReturnValueOnce({
      id:   'evt_1',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test', metadata: { uid: 'u1', packId: 'category-pizza' } } },
    })
    mocks.assembleAndWriteEntitlement.mockResolvedValueOnce('created')
    const res = await POST(makeReq('raw', 'sig'))
    expect(res.status).toBe(200)
    expect(mocks.assembleAndWriteEntitlement).toHaveBeenCalledWith({
      uid: 'u1', packId: 'category-pizza', stripeSessionId: 'cs_test',
    })
  })

  it('returns 200 (no-op) on unrelated event types', async () => {
    mocks.constructEvent.mockReturnValueOnce({ id: 'evt_2', type: 'invoice.paid' })
    const res = await POST(makeReq('raw', 'sig'))
    expect(res.status).toBe(200)
    expect(mocks.assembleAndWriteEntitlement).not.toHaveBeenCalled()
  })

  it('returns 200 when entitlement already exists (idempotent)', async () => {
    mocks.constructEvent.mockReturnValueOnce({
      id:   'evt_3',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test', metadata: { uid: 'u1', packId: 'category-pizza' } } },
    })
    mocks.assembleAndWriteEntitlement.mockResolvedValueOnce('exists')
    const res = await POST(makeReq('raw', 'sig'))
    expect(res.status).toBe(200)
  })

  it('returns 400 when metadata is missing', async () => {
    mocks.constructEvent.mockReturnValueOnce({
      id:   'evt_4',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test', metadata: {} } },
    })
    const res = await POST(makeReq('raw', 'sig'))
    expect(res.status).toBe(400)
    expect(mocks.captureMessage).toHaveBeenCalled()
  })

  it('returns 500 when fulfill throws', async () => {
    mocks.constructEvent.mockReturnValueOnce({
      id:   'evt_5',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test', metadata: { uid: 'u1', packId: 'category-pizza' } } },
    })
    mocks.assembleAndWriteEntitlement.mockRejectedValueOnce(new Error('sanity down'))
    const res = await POST(makeReq('raw', 'sig'))
    expect(res.status).toBe(500)
    expect(mocks.captureException).toHaveBeenCalled()
  })

  it('awaits the guest magic-link send and uses the configured app URL', async () => {
    mocks.constructEvent.mockReturnValueOnce({
      id: 'evt_guest',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_guest',
          customer_details: { email: 'guest@example.com' },
          metadata: { packId: 'category-pizza', mode: 'guest', locale: 'en' },
        },
      },
    })
    mocks.findOrCreateUserByEmail.mockResolvedValueOnce('guest-uid')
    mocks.assembleAndWriteEntitlement.mockResolvedValueOnce('created')
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
    })
  })
})
