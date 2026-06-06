import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage:   vi.fn(),
}))

const mocks = vi.hoisted(() => ({
  verifyIdToken:              vi.fn(),
  retrieve:                   vi.fn(),
  assembleAndWriteEntitlement: vi.fn(),
}))

vi.mock('../../../lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken: mocks.verifyIdToken }),
}))

vi.mock('../../../lib/stripe', () => ({
  getStripe: () => ({ checkout: { sessions: { retrieve: mocks.retrieve } } }),
}))

vi.mock('../../../lib/stripe-fulfill', () => ({
  assembleAndWriteEntitlement: mocks.assembleAndWriteEntitlement,
}))

import { POST } from '../../../app/api/stripe/fulfill/route'

function makeReq(body: any, token: string | null) {
  return new Request('http://x/api/stripe/fulfill', {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}`, 'content-type': 'application/json' } : { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mocks.verifyIdToken.mockReset()
  mocks.retrieve.mockReset()
  mocks.assembleAndWriteEntitlement.mockReset()
})

describe('/api/stripe/fulfill', () => {
  it('401 without bearer token', async () => {
    const res = await POST(makeReq({ session_id: 'cs' }, null))
    expect(res.status).toBe(401)
  })

  it('401 on invalid bearer token', async () => {
    mocks.verifyIdToken.mockRejectedValueOnce(new Error('bad'))
    const res = await POST(makeReq({ session_id: 'cs' }, 'bad'))
    expect(res.status).toBe(401)
  })

  it('400 without session_id', async () => {
    mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1' })
    const res = await POST(makeReq({}, 'tok'))
    expect(res.status).toBe(400)
  })

  it('404 when Stripe says session not found', async () => {
    mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1' })
    mocks.retrieve.mockRejectedValueOnce(new Error('No such checkout session'))
    const res = await POST(makeReq({ session_id: 'cs_missing' }, 'tok'))
    expect(res.status).toBe(404)
  })

  it('403 when session metadata.uid does not match caller', async () => {
    mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1' })
    mocks.retrieve.mockResolvedValueOnce({
      id: 'cs', payment_status: 'paid', metadata: { uid: 'OTHER', packId: 'category-pizza' },
    })
    const res = await POST(makeReq({ session_id: 'cs' }, 'tok'))
    expect(res.status).toBe(403)
  })

  it('400 when session has no packId metadata', async () => {
    mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1' })
    mocks.retrieve.mockResolvedValueOnce({
      id: 'cs', payment_status: 'paid', metadata: { uid: 'u1' },
    })
    const res = await POST(makeReq({ session_id: 'cs' }, 'tok'))
    expect(res.status).toBe(400)
  })

  it('202 when session is not yet paid', async () => {
    mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1' })
    mocks.retrieve.mockResolvedValueOnce({
      id: 'cs', payment_status: 'unpaid', metadata: { uid: 'u1', packId: 'category-pizza' },
    })
    const res = await POST(makeReq({ session_id: 'cs' }, 'tok'))
    expect(res.status).toBe(202)
    expect(mocks.assembleAndWriteEntitlement).not.toHaveBeenCalled()
  })

  it('200 + writes entitlement on paid session', async () => {
    mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1' })
    mocks.retrieve.mockResolvedValueOnce({
      id: 'cs', payment_status: 'paid', metadata: { uid: 'u1', packId: 'category-pizza' },
    })
    mocks.assembleAndWriteEntitlement.mockResolvedValueOnce('created')
    const res = await POST(makeReq({ session_id: 'cs' }, 'tok'))
    expect(res.status).toBe(200)
    expect(mocks.assembleAndWriteEntitlement).toHaveBeenCalledWith({
      uid: 'u1', packId: 'category-pizza', stripeSessionId: 'cs',
    })
  })
})
