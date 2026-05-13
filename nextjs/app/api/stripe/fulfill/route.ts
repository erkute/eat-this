import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getAdminAuth } from '@/lib/firebase/admin'
import { getStripe } from '@/lib/stripe'
import { assembleAndWriteEntitlement } from '@/lib/stripe-fulfill'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Body { session_id?: string }

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let uid: string
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as Body
  if (!body.session_id) return NextResponse.json({ error: 'missing_session_id' }, { status: 400 })

  let session
  try {
    session = await getStripe().checkout.sessions.retrieve(body.session_id)
  } catch (err) {
    return NextResponse.json({ error: 'session_not_found', message: (err as Error).message }, { status: 404 })
  }

  const meta = (session.metadata ?? {}) as { uid?: string; packId?: string }
  if (meta.uid !== uid) return NextResponse.json({ error: 'session_owner_mismatch' }, { status: 403 })
  if (!meta.packId)     return NextResponse.json({ error: 'missing_packId_metadata' }, { status: 400 })

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ status: 'pending', payment_status: session.payment_status }, { status: 202 })
  }

  try {
    const result = await assembleAndWriteEntitlement({ uid, packId: meta.packId, stripeSessionId: session.id })
    return NextResponse.json({ status: result }, { status: 200 })
  } catch (err) {
    Sentry.captureException(err, { extra: { uid, packId: meta.packId, sessionId: session.id } })
    return NextResponse.json({ error: 'fulfill_failed', message: (err as Error).message }, { status: 500 })
  }
}
