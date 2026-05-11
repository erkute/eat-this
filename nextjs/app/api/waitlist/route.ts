import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

const writeToken = process.env.SANITY_API_WRITE_TOKEN

const sanityWriteClient = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: writeToken,
  useCdn: false,
})

const VALID_PACK_TYPES = new Set(['category', 'complete'])
const VALID_LOCALES = new Set(['de', 'en'])
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  if (!writeToken) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const { email, packType, locale } = (body || {}) as Record<string, unknown>

  if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }
  if (typeof packType !== 'string' || !VALID_PACK_TYPES.has(packType)) {
    return NextResponse.json({ error: 'invalid_pack_type' }, { status: 400 })
  }
  if (typeof locale !== 'string' || !VALID_LOCALES.has(locale)) {
    return NextResponse.json({ error: 'invalid_locale' }, { status: 400 })
  }

  const userAgent = req.headers.get('user-agent') || ''

  try {
    await sanityWriteClient.create({
      _type: 'waitlistSignup',
      email,
      packType,
      locale,
      userAgent,
      createdAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[waitlist] sanity create failed:', err)
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 })
  }

  // Resend integration is a follow-up. For now, log so we can see successful
  // signups in the server console during dev/staging.
  console.log('[waitlist] signup:', { email, packType, locale })

  return NextResponse.json({ ok: true })
}
