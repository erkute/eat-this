// nextjs/app/api/buddy/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/buddy/rateLimit', () => ({
  checkRateLimit: vi.fn(),
  sessionLimitsFromEnv: () => ({ perMinute: 10, perDay: 100 }),
  ipLimitsFromEnv: () => ({ perMinute: 30, perDay: 400 }),
}))
vi.mock('@/lib/buddy/orchestrator', () => ({
  createAnthropicLlmClient: () => ({ runTurn: () => ({}) }),
  runBuddyTurn: async function* () {
    yield { type: 'text', value: 'hi' }
    yield { type: 'done' }
  },
}))
vi.mock('@/lib/buddy/retrieval', () => ({ searchSpots: vi.fn(), searchArticles: vi.fn() }))

import { POST } from './route'
import { checkRateLimit } from '@/lib/buddy/rateLimit'

function req(body: unknown): Request {
  return new Request('http://localhost/api/buddy', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/buddy', () => {
  beforeEach(() => vi.clearAllMocks())

  it('400s on a missing sessionId', async () => {
    const res = await POST(req({ messages: [{ role: 'user', content: 'hi' }], locale: 'de' }))
    expect(res.status).toBe(400)
  })

  it('429s when rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, reason: 'per_minute', state: { minuteStart: 0, minuteCount: 1, dayStart: 0, dayCount: 1 } })
    const res = await POST(
      req({ sessionId: 's1', messages: [{ role: 'user', content: 'hi' }], locale: 'de' }),
    )
    expect(res.status).toBe(429)
  })

  it('400s on a sessionId containing a slash', async () => {
    const res = await POST(
      req({ sessionId: 'a/b', messages: [{ role: 'user', content: 'hi' }], locale: 'de' }),
    )
    expect(res.status).toBe(400)
  })

  it('400s on an overlong sessionId', async () => {
    const res = await POST(
      req({ sessionId: 'x'.repeat(200), messages: [{ role: 'user', content: 'hi' }], locale: 'de' }),
    )
    expect(res.status).toBe(400)
  })

  it('streams NDJSON when allowed', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, state: { minuteStart: 0, minuteCount: 1, dayStart: 0, dayCount: 1 } })
    const res = await POST(
      req({ sessionId: 's1', messages: [{ role: 'user', content: 'hi' }], locale: 'de' }),
    )
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('"type":"text"')
    expect(text).toContain('"type":"done"')
  })

  function ipReq(xff: string): Request {
    return new Request('http://localhost/api/buddy', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': xff },
      body: JSON.stringify({ sessionId: 's1', messages: [{ role: 'user', content: 'hi' }], locale: 'de' }),
    })
  }

  it('applies a per-IP limit (hashed) before the session limit', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, state: { minuteStart: 0, minuteCount: 1, dayStart: 0, dayCount: 1 } })
    await POST(ipReq('203.0.113.7, 10.0.0.1'))
    const keys = vi.mocked(checkRateLimit).mock.calls.map((c) => c[0])
    // first call is the IP bucket (hashed, never the raw IP), then the session
    expect(keys[0]).toMatch(/^ip:[a-f0-9]{40}$/)
    expect(keys[0]).not.toContain('10.0.0.1')
    expect(keys).toContain('s:s1')
  })

  it('uses the platform-appended (rightmost) IP, ignoring a spoofed leftmost one', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, state: { minuteStart: 0, minuteCount: 1, dayStart: 0, dayCount: 1 } })
    // same real client IP (rightmost), different spoofed leftmost values
    await POST(ipReq('1.1.1.1, 10.0.0.1'))
    await POST(ipReq('9.9.9.9, 10.0.0.1'))
    const ipKeys = vi.mocked(checkRateLimit).mock.calls.map((c) => c[0]).filter((k) => k.startsWith('ip:'))
    // both requests must land in the SAME bucket — the spoofable leftmost is ignored
    expect(ipKeys[0]).toBe(ipKeys[1])
  })
})
