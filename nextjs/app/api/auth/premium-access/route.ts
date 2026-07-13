import { NextResponse } from 'next/server'

import { getAdminAuth } from '@/lib/firebase/admin'
import { clearPremiumAccessCookie } from '@/lib/must-eat/premium-access'
import {
  clearPremiumSessionCookie,
  setPremiumSessionCookie,
} from '@/lib/must-eat/premium-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!idToken) {
    return NextResponse.json({ error: 'auth required' }, { status: 401 })
  }

  try {
    await getAdminAuth().verifyIdToken(idToken)
    const response = NextResponse.json({ ok: true })
    response.headers.set('Cache-Control', 'private, no-store')
    // Identity transition is atomic from the browser's perspective: remove
    // the prior user's capability while replacing the verified session.
    clearPremiumAccessCookie(response)
    await setPremiumSessionCookie(response, idToken)
    return response
  } catch {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.headers.set('Cache-Control', 'private, no-store')
  clearPremiumAccessCookie(response)
  clearPremiumSessionCookie(response)
  return response
}
