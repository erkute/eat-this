import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const warmMustEatImages = vi.fn()
vi.mock('@/lib/must-eat/warmup', () => ({
  warmMustEatImages: () => warmMustEatImages(),
}))

import { POST } from '@/app/api/warmup/route'
import { scheduleSelfWarmup, warmupToken } from '@/lib/warmup/selfWarmup'

function request(token?: string) {
  return new NextRequest('http://127.0.0.1:3000/api/warmup', {
    method: 'POST',
    headers: token ? { 'x-warmup-token': token } : {},
  })
}

describe('/api/warmup', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    warmMustEatImages.mockReset()
  })

  // Die Route laedt Bucket-Bytes ohne Riegel — von aussen darf sie nichts tun.
  it('antwortet ohne den Token des eigenen Prozesses mit 404 und waermt nichts', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    scheduleSelfWarmup()

    expect((await POST(request())).status).toBe(404)
    expect((await POST(request('geraten'))).status).toBe(404)
    expect(warmMustEatImages).not.toHaveBeenCalled()
  })

  it('waermt mit dem Token, den scheduleSelfWarmup mitschickt', async () => {
    const fetch = vi.fn(() => new Promise(() => {}))
    vi.stubGlobal('fetch', fetch)
    vi.useFakeTimers()
    scheduleSelfWarmup()
    vi.runOnlyPendingTimers()
    vi.useRealTimers()

    const token = warmupToken()!
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+\/api\/warmup$/),
      expect.objectContaining({ headers: { 'x-warmup-token': token } })
    )

    warmMustEatImages.mockResolvedValue({ cards: 26, failedRenders: 0 })
    expect((await POST(request(token))).status).toBe(204)
    expect(warmMustEatImages).toHaveBeenCalledTimes(1)
  })
})
