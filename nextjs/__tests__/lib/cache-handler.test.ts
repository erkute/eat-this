import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const handlerModule = require(path.resolve(__dirname, '../../cache-handler.cjs'))
const { tagsManifest, isStale } = require('next/dist/server/lib/incremental-cache/tags-manifest.external')

const { createSharedTags, mergeTags, encodeTag, decodeTag, SYNC_INTERVAL_MS } = handlerModule

function newHandler() {
  return new handlerModule({ fs: {}, flushToDisk: false, serverDistDir: '/tmp', revalidatedTags: [] })
}

beforeEach(() => {
  tagsManifest.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-10T10:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cache-handler: revalidateTag', () => {
  it('setzt den Zeitpunkt bei JEDEM Aufruf neu, nicht nur beim ersten', async () => {
    // Next 15.5 schreibt nur, wenn der Tag fehlt. Eine Seite, die nach der
    // ersten Invalidierung neu gebaut wurde, blieb danach für diesen Tag
    // unberührbar – die zweite Änderung an einem Spot kam nie an.
    const handler = newHandler()
    await handler.revalidateTag('restaurant')
    const first = tagsManifest.get('restaurant')

    vi.setSystemTime(new Date('2026-10-10T10:05:00.000Z'))
    const rebuiltAt = Date.now() - 1000
    await handler.revalidateTag(['restaurant'])

    expect(tagsManifest.get('restaurant')).toBeGreaterThan(first)
    expect(isStale(['restaurant'], rebuiltAt)).toBe(true)
  })

  it('teilt lokal nichts nach außen, solange es nicht auf Cloud Run läuft', async () => {
    expect(process.env.K_SERVICE).toBeUndefined()
    await expect(newHandler().revalidateTag('x')).resolves.toBeUndefined()
  })
})

describe('cache-handler: geteilter Tag-Stand', () => {
  function fakeStore(initial: Record<string, number> = {}) {
    const state = { tags: { ...initial }, reads: 0 }
    return {
      state,
      async read() {
        state.reads += 1
        return { ...state.tags }
      },
      async write(entries: Record<string, number>, cutoff: number) {
        state.tags = mergeTags(state.tags, entries, cutoff)
      },
    }
  }

  it('übernimmt eine Invalidierung, die eine andere Instanz geschrieben hat', async () => {
    const store = fakeStore()
    const instanceA = createSharedTags(store)
    const ts = Date.now()
    await instanceA.publish(['restaurant:comedor', '_N_T_/de/restaurant/comedor'], ts)

    // Instanz B: eigene Map, ohne eigenen Webhook.
    const manifestB = new Map<string, number>()
    const instanceB = createSharedTags(store, { manifest: manifestB })
    await instanceB.sync()

    expect(manifestB.get('restaurant:comedor')).toBe(ts)
    expect(manifestB.get('_N_T_/de/restaurant/comedor')).toBe(ts)
  })

  it('überschreibt keinen neueren lokalen Stand mit einem älteren', () => {
    const manifest = new Map<string, number>([['news', 2000]])
    createSharedTags(fakeStore(), { manifest }).apply({ news: 1000, bezirk: 1500 })
    expect(manifest.get('news')).toBe(2000)
    expect(manifest.get('bezirk')).toBe(1500)
  })

  it('liest höchstens einmal pro Intervall', async () => {
    const store = fakeStore()
    const shared = createSharedTags(store, { manifest: new Map() })
    await shared.sync()
    await shared.sync()
    expect(store.state.reads).toBe(1)

    vi.setSystemTime(Date.now() + SYNC_INTERVAL_MS)
    await shared.sync()
    expect(store.state.reads).toBe(2)
  })

  it('liefert weiter aus, wenn Firestore nicht antwortet', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const shared = createSharedTags(
      { read: () => Promise.reject(new Error('unavailable')), write: async () => {} },
      { manifest: new Map() },
    )
    await expect(shared.sync()).resolves.toBeUndefined()
    errors.mockRestore()
  })

  it('wartet höchstens eine Sekunde auf einen hängenden Abgleich', async () => {
    const shared = createSharedTags(
      { read: () => new Promise(() => {}), write: async () => {} },
      { manifest: new Map() },
    )
    let done = false
    const pending = shared.sync().then(() => {
      done = true
    })
    await vi.advanceTimersByTimeAsync(999)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await pending
    expect(done).toBe(true)
  })

  it('wirft alte Einträge beim Schreiben raus und behält den neueren Zeitpunkt', () => {
    expect(mergeTags({ alt: 10, frisch: 500, gleich: 900 }, { gleich: 800, neu: 1000 }, 100)).toEqual({
      frisch: 500,
      gleich: 900,
      neu: 1000,
    })
  })

  it('kodiert Tags so, dass Firestore sie als Feldnamen annimmt', () => {
    for (const tag of ['_N_T_/de/restaurant/comedor', 'restaurant:893-ryotei', 'a.b', '__name__']) {
      const key = encodeTag(tag)
      expect(key).not.toMatch(/[._]/)
      expect(decodeTag(key)).toBe(tag)
    }
  })
})
