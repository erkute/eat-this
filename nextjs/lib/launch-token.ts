import { createHmac, timingSafeEqual } from 'node:crypto'

/* HMAC-signed, stateless launch-signup confirmation tokens.
 *
 *   token = base64url(payload) + "." + base64url(HMAC-SHA256(payload, SECRET))
 *
 * Payload is `{ email, locale, ts }` (ts = unix ms at signup). The 7-day
 * expiry is checked at verify time, so we don't need to store anything
 * server-side — token is self-validating. */

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface LaunchTokenPayload {
  email: string
  locale: 'de' | 'en'
  ts: number
}

function b64urlEncode(s: string): string {
  return Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64').toString('utf8')
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function createLaunchToken(payload: LaunchTokenPayload, secret: string): string {
  const body = JSON.stringify(payload)
  const encoded = b64urlEncode(body)
  const sig = sign(encoded, secret)
  return `${encoded}.${sig}`
}

export type VerifyResult =
  | { ok: true; payload: LaunchTokenPayload }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' | 'invalid_payload' }

export function verifyLaunchToken(token: string, secret: string): VerifyResult {
  const parts = token.split('.')
  if (parts.length !== 2) return { ok: false, reason: 'malformed' }
  const [encoded, sig] = parts

  const expected = sign(encoded, secret)
  // Constant-time compare. timingSafeEqual throws on different-length inputs.
  if (expected.length !== sig.length) return { ok: false, reason: 'bad_signature' }
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    return { ok: false, reason: 'bad_signature' }
  }

  let parsed: LaunchTokenPayload
  try {
    parsed = JSON.parse(b64urlDecode(encoded))
  } catch {
    return { ok: false, reason: 'malformed' }
  }

  if (
    typeof parsed.email !== 'string' ||
    (parsed.locale !== 'de' && parsed.locale !== 'en') ||
    typeof parsed.ts !== 'number'
  ) {
    return { ok: false, reason: 'invalid_payload' }
  }

  if (Date.now() - parsed.ts > TOKEN_TTL_MS) {
    return { ok: false, reason: 'expired' }
  }

  return { ok: true, payload: parsed }
}
