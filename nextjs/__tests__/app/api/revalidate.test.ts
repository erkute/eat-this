import { beforeEach, describe, expect, it, vi } from 'vitest'
import crypto from 'node:crypto'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidateTag: mocks.revalidateTag,
  revalidatePath: mocks.revalidatePath,
}))

import { POST } from '@/app/api/revalidate/route'

const SECRET = 'test-revalidate-secret'

function signature(rawBody: string, timestamp: number, secret = SECRET): string {
  const v1 = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')
  return `t=${timestamp},v1=${v1}`
}

function mkReq(rawBody: string, sig: string | null): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (sig) headers.set('sanity-webhook-signature', sig)
  return new Request('https://www.eatthisdot.com/api/revalidate', {
    method: 'POST',
    headers,
    body: rawBody,
  }) as NextRequest
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.SANITY_REVALIDATE_SECRET = SECRET
  process.env.SANITY_WEBHOOK_TOLERANCE_SECONDS = '300'
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-06T10:00:00.000Z'))
})

describe('/api/revalidate', () => {
  it('accepts a fresh valid signature and revalidates the matching content', async () => {
    const raw = JSON.stringify({ _type: 'restaurant', slug: { current: 'test-spot' } })
    const ts = Math.floor(Date.now() / 1000)

    const res = await POST(mkReq(raw, signature(raw, ts)))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(expect.objectContaining({ ok: true, type: 'restaurant', slug: 'test-spot' }))
    expect(mocks.revalidateTag).toHaveBeenCalledWith('restaurant:test-spot')
    expect(mocks.revalidateTag).toHaveBeenCalledWith('map-data')
    expect(mocks.revalidateTag).toHaveBeenCalledWith('free-surface')
    expect(mocks.revalidateTag).toHaveBeenCalledWith('restaurant-siblings')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/restaurant/test-spot')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/map')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en/map')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/must-eats')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en/must-eats')
  })

  it('rejects a correctly signed but stale webhook timestamp', async () => {
    const raw = JSON.stringify({ _type: 'restaurant', slug: { current: 'test-spot' } })
    const staleTs = Math.floor(Date.now() / 1000) - 301

    const res = await POST(mkReq(raw, signature(raw, staleTs)))

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'invalid_signature' })
    expect(mocks.revalidateTag).not.toHaveBeenCalled()
  })

  it('rejects a bad signature', async () => {
    const raw = JSON.stringify({ _type: 'restaurant' })
    const ts = Math.floor(Date.now() / 1000)

    const res = await POST(mkReq(raw, signature(raw, ts, 'wrong-secret')))

    expect(res.status).toBe(401)
    expect(mocks.revalidateTag).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON after the signature passes', async () => {
    const raw = '{nope'
    const ts = Math.floor(Date.now() / 1000)

    const res = await POST(mkReq(raw, signature(raw, ts)))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_json' })
    expect(mocks.revalidateTag).not.toHaveBeenCalled()
  })

  it('revalidates both localized map and must-eat pages for must-eat changes', async () => {
    const raw = JSON.stringify({ _type: 'mustEat' })
    const ts = Math.floor(Date.now() / 1000)

    const res = await POST(mkReq(raw, signature(raw, ts)))

    expect(res.status).toBe(200)
    expect(mocks.revalidateTag).toHaveBeenCalledWith('mustEat')
    expect(mocks.revalidateTag).toHaveBeenCalledWith('map-data')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/map')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en/map')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/must-eats')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en/must-eats')
  })

  it('invalidates the free-surface cache and map pages for home-week changes', async () => {
    const raw = JSON.stringify({ _type: 'homeWeek' })
    const ts = Math.floor(Date.now() / 1000)

    const res = await POST(mkReq(raw, signature(raw, ts)))

    expect(res.status).toBe(200)
    expect(mocks.revalidateTag).toHaveBeenCalledWith('free-surface')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/map')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en/map')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/must-eats')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en/must-eats')
  })

  it('revalidates must-eat pages when news changes the free surface', async () => {
    const raw = JSON.stringify({
      _type: 'newsArticle',
      slug: { current: 'new-guide' },
    })
    const ts = Math.floor(Date.now() / 1000)

    const res = await POST(mkReq(raw, signature(raw, ts)))

    expect(res.status).toBe(200)
    expect(mocks.revalidateTag).toHaveBeenCalledWith('free-surface')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/must-eats')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en/must-eats')
  })
})
