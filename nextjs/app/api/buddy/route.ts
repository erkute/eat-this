// nextjs/app/api/buddy/route.ts
import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { checkRateLimit, sessionLimitsFromEnv, ipLimitsFromEnv } from '@/lib/buddy/rateLimit'
import { createAnthropicLlmClient, runBuddyTurn } from '@/lib/buddy/orchestrator'
import { searchSpots, searchArticles } from '@/lib/buddy/retrieval'
import { encodeBuddyEvent } from '@/lib/buddy/stream'
import type { ChatMessage, Locale } from '@/lib/buddy/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const MAX_MESSAGES = 20
const MAX_CONTENT = 2000

function parseBody(body: unknown):
  | { ok: true; sessionId: string; messages: ChatMessage[]; locale: Locale }
  | { ok: false } {
  if (typeof body !== 'object' || body === null) return { ok: false }
  const b = body as Record<string, unknown>
  const sessionId = typeof b.sessionId === 'string' ? b.sessionId.trim() : ''
  if (!sessionId) return { ok: false }
  if (sessionId.length > 128 || sessionId.includes('/') || sessionId === '.' || sessionId === '..') return { ok: false }
  if (!Array.isArray(b.messages) || b.messages.length === 0) return { ok: false }
  const messages: ChatMessage[] = []
  for (const m of b.messages.slice(-MAX_MESSAGES)) {
    if (typeof m !== 'object' || m === null) return { ok: false }
    const msg = m as Record<string, unknown>
    const role = msg.role
    const content = msg.content
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return { ok: false }
    messages.push({ role, content: content.slice(0, MAX_CONTENT) })
  }
  const locale: Locale = b.locale === 'en' ? 'en' : 'de'
  return { ok: true, sessionId, messages, locale }
}

// Real client IP behind Firebase App Hosting / Cloud Run. The LEFTMOST entries
// of x-forwarded-for are client-supplied and spoofable; the platform appends the
// actual connecting IP as the RIGHTMOST hop, so read that. Hashed before use so
// no raw IP is ever stored (rate-limit bucketing only).
function clientIpHash(request: Request): string | null {
  const xff = request.headers.get('x-forwarded-for')
  const hops = xff ? xff.split(',').map((h) => h.trim()).filter(Boolean) : []
  const ip = hops.length > 0 ? hops[hops.length - 1] : (request.headers.get('x-real-ip') ?? '').trim()
  if (!ip) return null
  const salt = process.env.BUDDY_IP_SALT ?? 'eat-this-buddy'
  return createHash('sha256').update(ip + salt).digest('hex').slice(0, 40)
}

export async function POST(request: Request) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const parsed = parseBody(raw)
  if (!parsed.ok) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  // IP limit first (the real abuse guard — sessionId is client-controlled),
  // then the per-session limit. Either tripping returns 429 before any LLM work.
  const ipHash = clientIpHash(request)
  if (ipHash) {
    const ipLimit = await checkRateLimit(`ip:${ipHash}`, ipLimitsFromEnv())
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: 'rate_limited', reason: ipLimit.reason }, { status: 429 })
    }
  }
  const limit = await checkRateLimit(`s:${parsed.sessionId}`, sessionLimitsFromEnv())
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate_limited', reason: limit.reason }, { status: 429 })
  }

  const llm = createAnthropicLlmClient()
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of runBuddyTurn(
          { messages: parsed.messages, locale: parsed.locale },
          { llm, searchSpots, searchArticles },
        )) {
          controller.enqueue(encoder.encode(encodeBuddyEvent(event)))
        }
      } catch {
        controller.enqueue(
          encoder.encode(encodeBuddyEvent({ type: 'error', value: 'buddy_failed' })),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  })
}
