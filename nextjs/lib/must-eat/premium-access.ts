import 'server-only'

import crypto from 'node:crypto'
import type { NextResponse } from 'next/server'

const PRODUCTION_COOKIE = '__Host-eatthis_premium_access'
const DEVELOPMENT_COOKIE = 'eatthis_premium_access'
const DEFAULT_TTL_SECONDS = 30 * 60

interface PremiumAccessPayload {
  v: 1
  exp: number
  sub: string
  ids: string[]
}

function secret(): string {
  const value = process.env.PREMIUM_ACCESS_SIGNING_KEY
  if (!value) throw new Error('PREMIUM_ACCESS_SIGNING_KEY is not configured')
  return value
}

function signature(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
}

function timingSafeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function premiumAccessCookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? PRODUCTION_COOKIE
    : DEVELOPMENT_COOKIE
}

export function createPremiumAccessToken(
  ids: Iterable<string>,
  subject: string,
  options: { nowMs?: number; ttlSeconds?: number } = {},
): string {
  const nowMs = options.nowMs ?? Date.now()
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS
  const payload: PremiumAccessPayload = {
    v: 1,
    exp: Math.floor(nowMs / 1000) + ttlSeconds,
    sub: subject,
    ids: [...new Set(ids)].sort(),
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${signature(encoded)}`
}

export function readPremiumAccessToken(
  token: string | undefined,
  expectedSubject: string,
  nowMs = Date.now(),
): Set<string> {
  if (!token) return new Set()
  const [encoded, providedSignature, extra] = token.split('.')
  if (!encoded || !providedSignature || extra) return new Set()
  if (!timingSafeEqual(providedSignature, signature(encoded))) return new Set()

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as Partial<PremiumAccessPayload>
    if (
      payload.v !== 1 ||
      typeof payload.exp !== 'number' ||
      payload.exp < Math.floor(nowMs / 1000) ||
      payload.sub !== expectedSubject ||
      !Array.isArray(payload.ids) ||
      payload.ids.some((id) => typeof id !== 'string')
    ) {
      return new Set()
    }
    return new Set(payload.ids)
  } catch {
    return new Set()
  }
}

export function setPremiumAccessCookie(
  response: NextResponse,
  ids: Iterable<string>,
  subject: string,
): void {
  response.cookies.set(premiumAccessCookieName(), createPremiumAccessToken(ids, subject), {
    path: '/',
    maxAge: DEFAULT_TTL_SECONDS,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
}

export function clearPremiumAccessCookie(response: NextResponse): void {
  response.cookies.set(premiumAccessCookieName(), '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
}
