// nextjs/app/api/buddy/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/buddy/rateLimit', () => ({
  checkRateLimit: vi.fn(),
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
    ;(checkRateLimit as any).mockResolvedValue({ allowed: false, reason: 'per_minute', state: {} })
    const res = await POST(
      req({ sessionId: 's1', messages: [{ role: 'user', content: 'hi' }], locale: 'de' }),
    )
    expect(res.status).toBe(429)
  })

  it('streams NDJSON when allowed', async () => {
    ;(checkRateLimit as any).mockResolvedValue({ allowed: true, state: {} })
    const res = await POST(
      req({ sessionId: 's1', messages: [{ role: 'user', content: 'hi' }], locale: 'de' }),
    )
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('"type":"text"')
    expect(text).toContain('"type":"done"')
  })
})
