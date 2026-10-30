import 'server-only';

import crypto from 'node:crypto';
import type { NextResponse } from 'next/server';

const PRODUCTION_COOKIE = '__Host-eatthis_premium_access';
const DEVELOPMENT_COOKIE = 'eatthis_premium_access';
/** Laufzeit der Capability — und damit auch die laengste Zeit, die ein Browser
 *  ein verdecktes Bild behalten darf (siehe app/api/must-eat-image). */
export const PREMIUM_ACCESS_TTL_SECONDS = 30 * 60;

// Browser verwerfen ein Cookie ueber 4096 Byte stillschweigend — dann waere
// jedes verdeckte Bild ein 403. Volle IDs (~45 Zeichen) reissen diese Grenze
// schon bei rund 90 Karten. Deshalb traegt das Token je Karte nur einen
// 6-Byte-Fingerabdruck der ID, aneinandergehaengt: 8 Zeichen pro Karte, Platz
// fuer weit ueber 300 Karten. Die Signatur schuetzt die Liste; bei 48 Bit ist
// eine zufaellige Kollision zweier Karten-IDs praktisch ausgeschlossen.
const DIGEST_BYTES = 6;
const DIGEST_CHARS = 8;

interface PremiumAccessPayload {
  v: 2;
  exp: number;
  sub: string;
  h: string;
}

export interface PremiumAccess {
  has(id: string): boolean;
}

const NO_ACCESS: PremiumAccess = { has: () => false };

function idDigest(id: string): string {
  return crypto
    .createHash('sha256')
    .update(id)
    .digest()
    .subarray(0, DIGEST_BYTES)
    .toString('base64url');
}

function secret(): string {
  const value = process.env.PREMIUM_ACCESS_SIGNING_KEY;
  if (!value) throw new Error('PREMIUM_ACCESS_SIGNING_KEY is not configured');
  return value;
}

function signature(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

function timingSafeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function premiumAccessCookieName(): string {
  return process.env.NODE_ENV === 'production' ? PRODUCTION_COOKIE : DEVELOPMENT_COOKIE;
}

export function createPremiumAccessToken(
  ids: Iterable<string>,
  subject: string,
  options: { nowMs?: number; ttlSeconds?: number } = {}
): string {
  const nowMs = options.nowMs ?? Date.now();
  const ttlSeconds = options.ttlSeconds ?? PREMIUM_ACCESS_TTL_SECONDS;
  const payload: PremiumAccessPayload = {
    v: 2,
    exp: Math.floor(nowMs / 1000) + ttlSeconds,
    sub: subject,
    h: [...new Set([...ids].map(idDigest))].sort().join(''),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${signature(encoded)}`;
}

export function readPremiumAccessToken(
  token: string | undefined,
  expectedSubject: string,
  nowMs = Date.now()
): PremiumAccess {
  if (!token) return NO_ACCESS;
  const [encoded, providedSignature, extra] = token.split('.');
  if (!encoded || !providedSignature || extra) return NO_ACCESS;
  if (!timingSafeEqual(providedSignature, signature(encoded))) return NO_ACCESS;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as Partial<PremiumAccessPayload>;
    if (
      payload.v !== 2 ||
      typeof payload.exp !== 'number' ||
      payload.exp < Math.floor(nowMs / 1000) ||
      payload.sub !== expectedSubject ||
      typeof payload.h !== 'string' ||
      payload.h.length % DIGEST_CHARS !== 0
    ) {
      return NO_ACCESS;
    }
    const digests = new Set<string>();
    for (let i = 0; i < payload.h.length; i += DIGEST_CHARS) {
      digests.add(payload.h.slice(i, i + DIGEST_CHARS));
    }
    return { has: (id) => digests.has(idDigest(id)) };
  } catch {
    return NO_ACCESS;
  }
}

export function setPremiumAccessCookie(
  response: NextResponse,
  ids: Iterable<string>,
  subject: string
): void {
  response.cookies.set(premiumAccessCookieName(), createPremiumAccessToken(ids, subject), {
    path: '/',
    maxAge: PREMIUM_ACCESS_TTL_SECONDS,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

export function clearPremiumAccessCookie(response: NextResponse): void {
  response.cookies.set(premiumAccessCookieName(), '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}
