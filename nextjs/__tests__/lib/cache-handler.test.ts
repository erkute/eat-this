import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const require = createRequire(import.meta.url)
const handlerModule = require(path.resolve(__dirname, '../../cache-handler.cjs'))
const { tagsManifest, isStale } = require('next/dist/server/lib/incremental-cache/tags-manifest.external')

const {
  createSharedTags,
  createTagClock,
  mergeTags,
  encodeTag,
  decodeTag,
  readBuildTime,
  SYNC_INTERVAL_MS,
  FOLLOW_UP_MS,
} = handlerModule

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
    const t = Date.now()
    const manifest = new Map<string, number>([['news', t]])
    createSharedTags(fakeStore(), { manifest }).apply({ news: t - 1000, bezirk: t - 500 })
    expect(manifest.get('news')).toBe(t)
    expect(manifest.get('bezirk')).toBe(t - 500)
  })

  it('übernimmt auch die Nachläufe einer fremden Invalidierung', async () => {
    const store = fakeStore()
    const ts = Date.now()
    await createSharedTags(store).publish(['category-list'], ts)

    // Instanz B gleicht erst ab, als der erste Nachlauf schon vorbei ist.
    vi.setSystemTime(ts + FOLLOW_UP_MS[0] + 5_000)
    const manifestB = new Map<string, number>()
    await createSharedTags(store, { manifest: manifestB }).sync()
    expect(manifestB.get('category-list')).toBe(ts + FOLLOW_UP_MS[0])
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

describe('cache-handler: Tags aus der Zeit vor dem Build', () => {
  // Im App-Hosting-Image tragen alle vorgebauten Seiten das Dateidatum
  // 1980-01-01. Ein Tag von vor dem Build machte sie trotzdem ungültig.
  const SEED_MTIME = Date.parse('1980-01-01T00:00:01.000Z')

  it('übernimmt nur Invalidierungen ab dem Build', async () => {
    const builtAt = Date.parse('2026-10-10T08:00:00.000Z')
    const store = {
      async read() {
        return { restaurant: builtAt - 60_000, news: builtAt + 60_000 }
      },
      async write() {},
    }
    const shared = createSharedTags(store, { notBefore: builtAt })
    await shared.sync()

    expect(tagsManifest.has('restaurant')).toBe(false)
    expect(isStale(['restaurant'], SEED_MTIME)).toBe(false)
    expect(isStale(['news'], SEED_MTIME)).toBe(true)
  })

  it('liest den Build-Zeitpunkt aus der BUILD_ID', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'et-build-'))
    mkdirSync(path.join(dir, 'server'))
    writeFileSync(path.join(dir, 'BUILD_ID'), 'et-1791360000000-1a2b3c4d')
    expect(readBuildTime(path.join(dir, 'server'))).toBe(1791360000000)

    writeFileSync(path.join(dir, 'BUILD_ID'), 'Zt0aR7xY')
    expect(readBuildTime(path.join(dir, 'server'))).toBe(0)
    expect(readBuildTime(path.join(dir, 'fehlt'))).toBe(0)
  })
})

describe('cache-handler: Nachläufe', () => {
  // Das Sanity-API-CDN liefert nach einer Änderung noch Minuten lang einzelne
  // alte Antworten. Eine Seite, die in dieser Zeit neu gebaut wurde, muss nach
  // jedem Nachlauf wieder als veraltet gelten.
  it('macht eine kurz nach der Invalidierung gebaute Seite nach jedem Nachlauf wieder veraltet', () => {
    const manifest = new Map<string, number>()
    const clock = createTagClock({ manifest })
    const ts = Date.now()
    clock.record('category-list', ts)

    const builtAt = ts + 1_000
    vi.setSystemTime(builtAt + 1)
    clock.tick()
    expect(manifest.get('category-list')).toBeLessThan(builtAt)

    vi.setSystemTime(ts + FOLLOW_UP_MS[0])
    clock.tick()
    expect(manifest.get('category-list')).toBeGreaterThanOrEqual(builtAt)

    const rebuiltAt = ts + FOLLOW_UP_MS[0] + 1_000
    vi.setSystemTime(ts + FOLLOW_UP_MS[1])
    clock.tick()
    expect(manifest.get('category-list')).toBeGreaterThanOrEqual(rebuiltAt)
  })

  it('lässt eine nach dem letzten Nachlauf gebaute Seite stehen und vergisst den Tag', () => {
    const manifest = new Map<string, number>()
    const clock = createTagClock({ manifest })
    const ts = Date.now()
    clock.record('restaurant', ts)
    expect(clock.pending.size).toBe(1)

    vi.setSystemTime(ts + FOLLOW_UP_MS[1] + 1_000)
    clock.tick()
    const builtAt = Date.now()
    vi.setSystemTime(builtAt + 60 * 60 * 1000)
    clock.tick()
    expect(manifest.get('restaurant')).toBeLessThan(builtAt)
    expect(clock.pending.size).toBe(0)
  })

  it('rechnet die Nachläufe ab der jüngsten Invalidierung', () => {
    const manifest = new Map<string, number>()
    const clock = createTagClock({ manifest })
    const first = Date.now()
    clock.record('news', first)
    const second = first + 30_000
    vi.setSystemTime(second)
    clock.record('news', second)

    vi.setSystemTime(second + FOLLOW_UP_MS[0])
    clock.tick()
    expect(manifest.get('news')).toBe(second + FOLLOW_UP_MS[0])
  })

  it('rückt die Nachläufe beim Cache-Zugriff des Handlers nach', async () => {
    const handler = newHandler()
    await handler.revalidateTag('bezirk')
    const ts = tagsManifest.get('bezirk')
    const builtAt = ts + 1_000
    expect(isStale(['bezirk'], builtAt)).toBe(false)

    vi.setSystemTime(ts + FOLLOW_UP_MS[0])
    await handler.get('kein-eintrag', { kind: 'FETCH', tags: [], softTags: [] }).catch(() => null)
    expect(isStale(['bezirk'], builtAt)).toBe(true)
  })
})
