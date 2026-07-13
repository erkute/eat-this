import 'server-only'

import type { NextResponse } from 'next/server'

import { getAdminAuth } from '@/lib/firebase/admin'

const PRODUCTION_COOKIE = '__Host-eatthis_premium_session'
const DEVELOPMENT_COOKIE = 'eatthis_premium_session'
const SESSION_TTL_SECONDS = 60 * 60

export function premiumSessionCookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? PRODUCTION_COOKIE
    : DEVELOPMENT_COOKIE
}

export async function setPremiumSessionCookie(
  response: NextResponse,
  idToken: string,
): Promise<void> {
  const session = await getAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_TTL_SECONDS * 1000,
  })
  response.cookies.set(premiumSessionCookieName(), session, {
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
}

export async function readPremiumSessionUid(
  sessionCookie: string | undefined,
): Promise<string | null> {
  if (!sessionCookie) return null
  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie)
    return decoded.uid
  } catch {
    return null
  }
}

export function clearPremiumSessionCookie(response: NextResponse): void {
  response.cookies.set(premiumSessionCookieName(), '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
}
