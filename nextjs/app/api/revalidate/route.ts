import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'
import crypto from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Sanity signs every webhook with header "sanity-webhook-signature"
// in the form "t=<unix-seconds>,v1=<hex-hmac>". The HMAC is computed over
// `${t}.${rawBody}` using the shared secret.
function isValidSanitySignature(
  rawBody: string,
  sigHeader: string | null,
  secret: string,
): boolean {
  if (!sigHeader) return false
  const parts: Record<string, string> = {}
  for (const part of sigHeader.split(',')) {
    const [k, v] = part.split('=')
    if (k && v) parts[k.trim()] = v.trim()
  }
  const t = parts.t
  const v1 = parts.v1
  if (!t || !v1) return false

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${t}.${rawBody}`)
    .digest('hex')

  const a = Buffer.from(v1, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'secret_missing' }, { status: 500 })
  }

  const rawBody = await req.text()
  const sig = req.headers.get('sanity-webhook-signature')

  if (!isValidSanitySignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  let doc: { _type?: string; slug?: { current?: string }; _id?: string } = {}
  try {
    doc = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const type = doc._type
  const slug = doc.slug?.current
  const revalidated: string[] = []

  switch (type) {
    case 'newsArticle':
      revalidateTag('news')
      revalidateTag('sitemap-articles')
      revalidatePath('/sitemap.xml')
      revalidatePath('/news-sitemap.xml')
      revalidated.push('tag:news', 'tag:sitemap-articles', 'path:/sitemap.xml', 'path:/news-sitemap.xml')
      if (slug) {
        revalidateTag(`article:${slug}`)
        revalidatePath(`/news/${slug}`)
        revalidatePath(`/en/news/${slug}`)
        revalidated.push(`tag:article:${slug}`, `path:/news/${slug}`)
      }
      break
    case 'restaurant':
      revalidateTag('sitemap-restaurants')
      revalidatePath('/sitemap.xml')
      revalidated.push('tag:sitemap-restaurants', 'path:/sitemap.xml')
      if (slug) {
        revalidateTag(`restaurant:${slug}`)
        revalidatePath(`/restaurant/${slug}`)
        revalidatePath(`/en/restaurant/${slug}`)
        revalidated.push(`tag:restaurant:${slug}`, `path:/restaurant/${slug}`)
      }
      // Restaurant changes can shift bezirk membership/order — flush bezirk pages too
      revalidateTag('bezirk')
      revalidated.push('tag:bezirk')
      break
    case 'bezirk':
      revalidateTag('bezirk')
      revalidateTag('sitemap-bezirke')
      revalidatePath('/bezirk')
      revalidatePath('/en/bezirk')
      revalidatePath('/sitemap.xml')
      revalidated.push('tag:bezirk', 'tag:sitemap-bezirke', 'path:/bezirk', 'path:/sitemap.xml')
      if (slug) {
        revalidateTag(`bezirk:${slug}`)
        revalidatePath(`/bezirk/${slug}`)
        revalidatePath(`/en/bezirk/${slug}`)
        revalidated.push(`tag:bezirk:${slug}`, `path:/bezirk/${slug}`)
      }
      break
    case 'mustEat':
      revalidateTag('mustEat')
      revalidated.push('tag:mustEat')
      break
    case 'staticPage':
      revalidateTag('staticPage')
      revalidated.push('tag:staticPage')
      break
  }

  return NextResponse.json({ ok: true, type, slug, revalidated })
}

export async function GET() {
  return NextResponse.json({ ok: true, route: 'revalidate' })
}
