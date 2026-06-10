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
import { clientIpFromXff } from '@/lib/clientIp'
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
    // <real client>, <App Hosting ingress>, <GFE> — the real client is 3rd-from-right
    await POST(ipReq('203.0.113.7, 35.219.200.29, 66.102.6.195'))
    const keys = vi.mocked(checkRateLimit).mock.calls.map((c) => c[0])
    // first call is the IP bucket (hashed, never the raw IP), then the session
    expect(keys[0]).toMatch(/^ip:[a-f0-9]{40}$/)
    expect(keys[0]).not.toContain('203.0.113.7')
    expect(keys).toContain('s:s1')
  })

  it('buckets by the real client IP, ignoring spoofed leftmost values and rotating GFE hop', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, state: { minuteStart: 0, minuteCount: 1, dayStart: 0, dayCount: 1 } })
    // Same real client (203.0.113.7), different spoofed prefixes AND a rotating
    // rightmost GFE IP — both must still land in the SAME bucket.
    await POST(ipReq('1.1.1.1, 203.0.113.7, 35.219.200.29, 66.102.6.195'))
    await POST(ipReq('9.9.9.9, 203.0.113.7, 35.219.200.29, 74.125.212.169'))
    const ipKeys = vi.mocked(checkRateLimit).mock.calls.map((c) => c[0]).filter((k) => k.startsWith('ip:'))
    expect(ipKeys[0]).toBe(ipKeys[1])
  })
})

// Hop selection verified against headers captured from a live Firebase App
// Hosting staging probe (2026-06-09).
describe('clientIpFromXff', () => {
  it('picks the 3rd-from-right hop (real client) for the real App Hosting shapes', () => {
    // no spoof: <client>, <ingress>, <gfe>
    expect(clientIpFromXff('78.54.222.218,35.219.200.29,66.102.6.195')).toBe('78.54.222.218')
    // 1 spoofed value prepended
    expect(clientIpFromXff('9.9.9.9,78.54.222.218,35.219.200.29,74.125.212.169')).toBe('78.54.222.218')
    // 2 spoofed values prepended
    expect(clientIpFromXff('1.1.1.1, 2.2.2.2,78.54.222.218,35.219.200.29,74.125.212.69')).toBe('78.54.222.218')
  })

  it('falls back to leftmost / x-real-ip / null for shorter shapes', () => {
    expect(clientIpFromXff('203.0.113.7, 10.0.0.1')).toBe('203.0.113.7') // <3 hops → leftmost
    expect(clientIpFromXff('203.0.113.7')).toBe('203.0.113.7')
    expect(clientIpFromXff(null, '198.51.100.4')).toBe('198.51.100.4')
    expect(clientIpFromXff(null)).toBeNull()
    expect(clientIpFromXff('')).toBeNull()
  })
})
