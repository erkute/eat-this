import { beforeEach, describe, expect, it, vi } from 'vitest'
import crypto from 'node:crypto'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidateTag: mocks.revalidateTag,
  revalidatePath: mocks.revalidatePath,
}))

import { POST } from '@/app/api/revalidate/route'

const SECRET = 'test-revalidate-secret'

function signature(rawBody: string, timestamp: number, secret = SECRET): string {
  const v1 = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('base64url')
  return `t=${timestamp},v1=${v1}`
}

function mkReq(rawBody: string, sig: string | null): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (sig) headers.set('sanity-webhook-signature', sig)
  return new Request('https://www.eatthisdot.com/api/revalidate', {
    method: 'POST',
    headers,
    body: rawBody,
  }) as NextRequest
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.SANITY_REVALIDATE_SECRET = SECRET
  process.env.SANITY_WEBHOOK_TOLERANCE_SECONDS = '300'
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-06T10:00:00.000Z'))
})

describe('/api/revalidate', () => {
  it('accepts a fresh valid signature and revalidates the matching content', async () => {
    const raw = JSON.stringify({ _type: 'restaurant', slug: { current: 'test-spot' } })
    const ts = Date.now()

    const res = await POST(mkReq(raw, signature(raw, ts)))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(expect.objectContaining({ ok: true, type: 'restaurant', slug: 'test-spot' }))
    expect(mocks.revalidateTag).toHaveBeenCalledWith('restaurant:test-spot')
    expect(mocks.revalidateTag).toHaveBeenCalledWith('map-data')
    expect(mocks.revalidateTag).toHaveBeenCalledWith('free-surface')
    expect(mocks.revalidateTag).toHaveBeenCalledWith('restaurant-siblings')
    // Der Kandidatenpool des Spots des Tages haengt am blanken Tag
    // `restaurant` — ohne ihn bliebe ein frisch gesetztes `featuredOnDate`
    // bis zum Ablauf der ISR-Frist wirkungslos, seit dem 25.08.2026 also
    // bis zu 24 Stunden.
    expect(mocks.revalidateTag).toHaveBeenCalledWith('restaurant')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/restaurant/test-spot')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/map')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en/map')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/must-eats')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en/must-eats')
  })

  it('rejects a correctly signed but stale webhook timestamp', async () => {
    const raw = JSON.stringify({ _type: 'restaurant', slug: { current: 'test-spot' } })
    const staleTs = Date.now() - 301_000

    const res = await POST(mkReq(raw, signature(raw, staleTs)))

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'invalid_signature' })
    expect(mocks.revalidateTag).not.toHaveBeenCalled()
  })

  it('rejects a bad signature', async () => {
    const raw = JSON.stringify({ _type: 'restaurant' })
    const ts = Date.now()

    const res = await POST(mkReq(raw, signature(raw, ts, 'wrong-secret')))

    expect(res.status).toBe(401)
    expect(mocks.revalidateTag).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON after the signature passes', async () => {
    const raw = '{nope'
    const ts = Date.now()

    const res = await POST(mkReq(raw, signature(raw, ts)))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_json' })
    expect(mocks.revalidateTag).not.toHaveBeenCalled()
  })

  it('revalidates both localized map and must-eat pages for must-eat changes', async () => {
    const raw = JSON.stringify({ _type: 'mustEat' })
    const ts = Date.now()

    const res = await POST(mkReq(raw, signature(raw, ts)))

    expect(res.status).toBe(200)
    expect(mocks.revalidateTag).toHaveBeenCalledWith('mustEat')
    expect(mocks.revalidateTag).toHaveBeenCalledWith('map-data')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/map')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en/map')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/must-eats')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en/must-eats')
  })

  it('invalidates the free-surface cache and map pages for home-week changes', async () => {
    const raw = JSON.stringify({ _type: 'homeWeek' })
    const ts = Date.now()

    const res = await POST(mkReq(raw, signature(raw, ts)))

    expect(res.status).toBe(200)
    expect(mocks.revalidateTag).toHaveBeenCalledWith('free-surface')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/map')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en/map')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/must-eats')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en/must-eats')
  })

  // Die echte Webhook-Projektion sendet `"slug": slug.current` — einen
  // STRING (Hook-Log vom 27.08.2026: { _id, _type, slug: 'beste-burger-berlin' }).
  // Die Route las nur `doc.slug?.current`; auf dieser Payload war der Slug
  // damit immer undefined und keine slug-spezifische Revalidierung lief je.
  // Die Objekt-Tests oben haben den Irrtum mitgetragen — dieser hier prüft
  // die Form, die wirklich über die Leitung geht.
  it('revalidates the article path when the webhook sends the slug as a plain string', async () => {
    const raw = JSON.stringify({
      _id: 'news-beste-burger-berlin',
      _type: 'newsArticle',
      slug: 'beste-burger-berlin',
    })
    const ts = Date.now()

    const res = await POST(mkReq(raw, signature(raw, ts)))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(
      expect.objectContaining({ ok: true, type: 'newsArticle', slug: 'beste-burger-berlin' })
    )
    expect(mocks.revalidateTag).toHaveBeenCalledWith('article:beste-burger-berlin')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/news/beste-burger-berlin')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en/news/beste-burger-berlin')
  })

  it('revalidates the restaurant path when the webhook sends the slug as a plain string', async () => {
    const raw = JSON.stringify({ _id: 'x', _type: 'restaurant', slug: 'gully-burger' })
    const ts = Date.now()

    const res = await POST(mkReq(raw, signature(raw, ts)))

    expect(res.status).toBe(200)
    expect(mocks.revalidateTag).toHaveBeenCalledWith('restaurant:gully-burger')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/restaurant/gully-burger')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en/restaurant/gully-burger')
  })

  it('revalidates must-eat pages when news changes the free surface', async () => {
    const raw = JSON.stringify({
      _type: 'newsArticle',
      slug: { current: 'new-guide' },
    })
    const ts = Date.now()

    const res = await POST(mkReq(raw, signature(raw, ts)))

    expect(res.status).toBe(200)
    expect(mocks.revalidateTag).toHaveBeenCalledWith('free-surface')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/must-eats')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en/must-eats')
  })
})

// Diese beiden Tests halten die Kodierung fest, an der der Hook von seiner
// Einrichtung bis zum 25.08.2026 gescheitert ist: die Route erwartete hex,
// Sanity sendet base64url. Der Helfer `signature()` oben signierte damals
// ebenfalls hex — die Suite war also mit dem Fehler einverstanden und grün,
// während in Produktion jede einzelne Auslieferung mit 401 abgewiesen wurde.
//
// Deshalb signiert der erste Test hier NICHT mit Nodes `digest('base64url')`,
// sondern baut die Signatur so nach, wie sanity-io/webhook-toolkit sie
// tatsächlich erzeugt (signature.ts). Ein gemeinsamer Helfer könnte sich mit
// der Route zusammen irren; dieser Nachbau kann es nicht.
describe('/api/revalidate: Signaturkodierung', () => {
  const RAW = JSON.stringify({ _type: 'category', slug: { current: 'lunch' } })

  // Wortgetreu die Kodierung aus dem Sanity-Toolkit.
  function toolkitSignature(rawBody: string, timestamp: number): string {
    const digest = crypto
      .createHmac('sha256', SECRET)
      .update(`${timestamp}.${rawBody}`)
      .digest()
    const v1 = Buffer.from(digest)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    return `t=${timestamp},v1=${v1}`
  }

  it('akzeptiert genau die base64url-Signatur, die Sanity über die Leitung schickt', async () => {
    const ts = Date.now()

    const res = await POST(mkReq(RAW, toolkitSignature(RAW, ts)))

    expect(res.status).toBe(200)
    expect(mocks.revalidateTag).toHaveBeenCalledWith('category:lunch')
  })

  it('weist dieselbe Signatur hex-kodiert ab — das war der Fehler', async () => {
    const ts = Date.now()
    const hex = crypto.createHmac('sha256', SECRET).update(`${ts}.${RAW}`).digest('hex')

    const res = await POST(mkReq(RAW, `t=${ts},v1=${hex}`))

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'invalid_signature' })
  })
  it('weist einen Zeitstempel in Sekunden ab — das war der zweite Fehler', async () => {
    // Sanity sendet `t` in Millisekunden (MINIMUM_TIMESTAMP im Toolkit ist
    // 1609459200000). Die Route verglich ihn gegen `Date.now() / 1000`; die
    // Differenz lag dauerhaft bei ~1,7 Billionen und riss jede Toleranz. Auch
    // dieser Fehler allein hätte den Hook für immer auf 401 gehalten — und
    // auch ihn hat die Suite mitgetragen, weil sie ebenfalls in Sekunden
    // signierte.
    const seconds = Math.floor(Date.now() / 1000)
    const v1 = crypto
      .createHmac('sha256', SECRET)
      .update(`${seconds}.${RAW}`)
      .digest('base64url')

    const res = await POST(mkReq(RAW, `t=${seconds},v1=${v1}`))

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'invalid_signature' })
  })

  it('akzeptiert das Trennzeichen mit Leerzeichen, das das Toolkit zulaesst', async () => {
    // Toolkit-Regex: /^t=(\d+)[, ]+v1=([^, ]+)$/ — Komma ODER Komma+Leerzeichen.
    const ts = Date.now()
    const v1 = crypto.createHmac('sha256', SECRET).update(`${ts}.${RAW}`).digest('base64url')

    const res = await POST(mkReq(RAW, `t=${ts}, v1=${v1}`))

    expect(res.status).toBe(200)
  })
})
