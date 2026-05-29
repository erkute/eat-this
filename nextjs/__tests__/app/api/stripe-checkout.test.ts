import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage:   vi.fn(),
}))

const mocks = vi.hoisted(() => ({
  verifyIdToken:    vi.fn(),
  sessionsCreate:   vi.fn(),
  entitlementDocs:  new Map<string, { exists: boolean }>(),
}))

vi.mock('../../../lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken: mocks.verifyIdToken }),
  getAdminFirestore: () => ({
    collection: () => ({
      doc: () => ({
        collection: () => ({
          doc: (id: string) => ({
            get: async () => mocks.entitlementDocs.get(id) ?? { exists: false },
          }),
        }),
      }),
    }),
  }),
}))

vi.mock('../../../lib/stripe', () => ({
  getStripe: () => ({ checkout: { sessions: { create: mocks.sessionsCreate } } }),
}))

import { POST } from '../../../app/api/stripe/checkout/route'

function makeReq(body: any, token: string | null) {
  return new Request('http://x/api/stripe/checkout', {
    method:  'POST',
    headers: token ? { authorization: `Bearer ${token}`, 'content-type': 'application/json' } : { 'content-type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

beforeEach(() => {
  mocks.verifyIdToken.mockReset()
  mocks.sessionsCreate.mockReset()
  mocks.sessionsCreate.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com/test' })
  mocks.entitlementDocs.clear()
})

describe('/api/stripe/checkout', () => {
  it('proceeds as guest checkout when no bearer token (SP4.5)', async () => {
    const res = await POST(makeReq({ packId: 'category-pizza' }, null))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toContain('checkout.stripe.com')
    // Guest: no token verification, no already-owned check, empty uid + guest mode.
    expect(mocks.verifyIdToken).not.toHaveBeenCalled()
    const args = mocks.sessionsCreate.mock.calls[0][0]
    expect(args.metadata.uid).toBe('')
    expect(args.metadata.mode).toBe('guest')
    // Guests don't pre-fill customer_email — Stripe collects it on the form.
    expect(args.customer_email).toBeUndefined()
  })

  it('returns 401 when token is invalid', async () => {
    mocks.verifyIdToken.mockRejectedValueOnce(new Error('bad'))
    const res = await POST(makeReq({ packId: 'category-pizza' }, 'bad'))
    expect(res.status).toBe(401)
  })

  it('returns 400 for unknown packId', async () => {
    mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'u@x.com' })
    const res = await POST(makeReq({ packId: 'not-real' }, 'good'))
    expect(res.status).toBe(400)
  })

  it('returns 409 when entitlement already exists', async () => {
    mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'u@x.com' })
    mocks.entitlementDocs.set('category-pizza', { exists: true })
    const res = await POST(makeReq({ packId: 'category-pizza' }, 'good'))
    expect(res.status).toBe(409)
    expect(mocks.sessionsCreate).not.toHaveBeenCalled()
  })

  it('returns 409 for a category pack when all-berlin already owned', async () => {
    mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'u@x.com' })
    mocks.entitlementDocs.set('all-berlin', { exists: true })
    const res = await POST(makeReq({ packId: 'category-pizza' }, 'good'))
    expect(res.status).toBe(409)
    expect(mocks.sessionsCreate).not.toHaveBeenCalled()
  })

  it('does NOT check all-berlin when the requested pack IS all-berlin (no implicit-self-ownership cross-check)', async () => {
    mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'u@x.com' })
    // No entitlement docs set → all-berlin purchase proceeds normally
    const res = await POST(makeReq({ packId: 'all-berlin' }, 'good'))
    expect(res.status).toBe(200)
  })

  it('returns 200 + url on success', async () => {
    mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'u@x.com' })
    const res = await POST(makeReq({ packId: 'category-pizza' }, 'good'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toContain('checkout.stripe.com')
    expect(mocks.sessionsCreate).toHaveBeenCalledOnce()
    const args = mocks.sessionsCreate.mock.calls[0][0]
    expect(args.metadata.uid).toBe('u1')
    expect(args.metadata.packId).toBe('category-pizza')
    expect(args.metadata.type).toBe('category')
    expect(args.metadata.slug).toBe('pizza')
    // Resolve the actual price ID via the catalog — keeps the test green
    // when the placeholder is rotated to a Stripe Dashboard ID (or back).
    const { getPack } = await import('../../../lib/stripe-catalog')
    expect(args.line_items[0].price).toBe(getPack('category-pizza')!.stripePriceId)
    expect(args.success_url).toContain('/checkout/success')
    expect(args.cancel_url).toContain('booster=canceled')
  })
})
