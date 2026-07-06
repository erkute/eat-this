// nextjs/app/api/buddy/route.ts
import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { checkRateLimit, sessionLimitsFromEnv, ipLimitsFromEnv } from '@/lib/buddy/rateLimit'
import { createAnthropicLlmClient, runBuddyTurn } from '@/lib/buddy/orchestrator'
import { searchSpots, searchArticles } from '@/lib/buddy/retrieval'
import { clientIpFromXff } from '@/lib/clientIp'
import { encodeBuddyEvent } from '@/lib/buddy/stream'
import type { ChatMessage, Locale } from '@/lib/buddy/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const MAX_MESSAGES = 20
const MAX_CONTENT = 2000

function parseBody(body: unknown):
  | { ok: true; sessionId: string; messages: ChatMessage[]; locale: Locale; geo?: { lat: number; lng: number } }
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
  let geo: { lat: number; lng: number } | undefined
  if (typeof b.geo === 'object' && b.geo !== null) {
    const g = b.geo as Record<string, unknown>
    if (
      typeof g.lat === 'number' && typeof g.lng === 'number' &&
      g.lat >= -90 && g.lat <= 90 && g.lng >= -180 && g.lng <= 180
    ) {
      geo = { lat: g.lat, lng: g.lng }
    }
  }
  return { ok: true, sessionId, messages, locale, geo }
}

// Hashed before use so no raw IP is ever stored (rate-limit bucketing only).
// IP-hop selection (which x-forwarded-for hop is the real client) lives in
// lib/clientIp — route files can't carry extra exports.
function clientIpHash(request: Request): string | null {
  const ip = clientIpFromXff(
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip'),
  )
  if (!ip) return null
  const salt = process.env.BUDDY_IP_SALT
  if (!salt) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('BUDDY_IP_SALT is required in production')
    }
    return createHash('sha256').update(`${ip}:eat-this-buddy-dev`).digest('hex').slice(0, 40)
  }
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
  const abortController = new AbortController()
  const abort = () => abortController.abort()
  request.signal.addEventListener('abort', abort, { once: true })

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of runBuddyTurn(
          { messages: parsed.messages, locale: parsed.locale, geo: parsed.geo },
          { llm, searchSpots, searchArticles },
          { signal: abortController.signal },
        )) {
          if (abortController.signal.aborted) return
          controller.enqueue(encoder.encode(encodeBuddyEvent(event)))
        }
      } catch {
        if (!abortController.signal.aborted) {
          controller.enqueue(
            encoder.encode(encodeBuddyEvent({ type: 'error', value: 'buddy_failed' })),
          )
        }
      } finally {
        request.signal.removeEventListener('abort', abort)
        if (!abortController.signal.aborted) controller.close()
      }
    },
    cancel() {
      abortController.abort()
      request.signal.removeEventListener('abort', abort)
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
