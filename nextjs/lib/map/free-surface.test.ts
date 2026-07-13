import { beforeEach, describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/sanity', () => ({
  client: { fetch: vi.fn() },
}))

import {
  brandKey,
  dedupeByBrand,
  composeFreeSurface,
  applyFreeSurface,
  getFreeSurfaceData,
  NEW_ON_MAP_COUNT,
  type FreeSurfaceCard,
} from './free-surface'
import { client } from '@/lib/sanity'
import type { MapRestaurant } from '@/lib/types'

const fetchSpy = vi.mocked(client.fetch)

beforeEach(() => {
  fetchSpy.mockReset()
})

const card = (o: Partial<FreeSurfaceCard>): FreeSurfaceCard => ({
  _id: 'x',
  name: 'Spot',
  slug: 'spot',
  image: null,
  district: null,
  categoryDe: null,
  categoryEn: null,
  ...o,
})

const rest = (id: string): MapRestaurant =>
  ({ _id: id, name: id, slug: id, lat: 52.5, lng: 13.4 }) as MapRestaurant

describe('brandKey', () => {
  it('keys on the first two normalized tokens', () => {
    expect(brandKey('Hokey Pokey Mitte')).toBe('hokey pokey')
    expect(brandKey('Hokey Pokey Boutique')).toBe('hokey pokey')
    expect(brandKey('Standard Serious Pizza Kreuzberg')).toBe('standard serious')
  })
  it('single-token names key on the full name', () => {
    expect(brandKey('Prism')).toBe('prism')
    expect(brandKey('ZOLA')).toBe('zola')
  })
  it('collapses German umlaut brands case-insensitively', () => {
    expect(brandKey('Überblick Berlin')).toBe(brandKey('ÜBERBLICK BERLIN'))
  })
})

describe('dedupeByBrand', () => {
  it('keeps only the first card per brand (newest-first input → newest wins)', () => {
    const out = dedupeByBrand([
      card({ _id: 'a', name: 'Hokey Pokey Mitte' }),
      card({ _id: 'b', name: 'Hokey Pokey Boutique' }),
      card({ _id: 'c', name: 'Prism' }),
    ])
    expect(out.map((c) => c._id)).toEqual(['a', 'c'])
  })
  it('keeps distinct brands', () => {
    const out = dedupeByBrand([
      card({ _id: 'a', name: 'Bandol sur mer' }),
      card({ _id: 'b', name: 'Der Fischladen' }),
    ])
    expect(out).toHaveLength(2)
  })
})

describe('composeFreeSurface', () => {
  it('caps newOnMap at NEW_ON_MAP_COUNT after dedupe and unions all id sources', () => {
    const pool = Array.from({ length: 9 }, (_, i) =>
      card({ _id: `n${i}`, name: `Brand${i} Laden` }),
    )
    const out = composeFreeSurface(pool, ['bz1'], [
      { de: ['news1'], en: ['news1', 'news2'] },
      { de: null, en: null },
    ])
    expect(out.newOnMap).toHaveLength(NEW_ON_MAP_COUNT)
    // union: 6 newOnMap + bz1 + news1 + news2 (n0 schon drin in newOnMap dedupe)
    expect(out.restaurantIds.has('n0')).toBe(true)
    expect(out.restaurantIds.has('bz1')).toBe(true)
    expect(out.restaurantIds.has('news1')).toBe(true)
    expect(out.restaurantIds.has('news2')).toBe(true)
    expect(out.restaurantIds.size).toBe(NEW_ON_MAP_COUNT + 3)
    // jenseits des Caps NICHT in der Union
    expect(out.restaurantIds.has('n8')).toBe(false)
  })
})

describe('applyFreeSurface', () => {
  it('appends surfaced spots that are not yet visible, no duplicates', () => {
    const all = [rest('a'), rest('b'), rest('c')]
    const visible = [all[0]]
    const out = applyFreeSurface(visible, all, new Set(['a', 'c']))
    expect(out.map((r) => r._id)).toEqual(['a', 'c'])
  })
  it('returns the input array unchanged when nothing to add', () => {
    const all = [rest('a')]
    const visible = [all[0]]
    expect(applyFreeSurface(visible, all, new Set(['a']))).toBe(visible)
  })
})

describe('getFreeSurfaceData', () => {
  it('uses the tagged shared Next cache for every Sanity source', async () => {
    fetchSpy
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)

    await getFreeSurfaceData()

    expect(fetchSpy).toHaveBeenCalledTimes(3)
    for (const call of fetchSpy.mock.calls) {
      expect(call[2]).toEqual({ next: { revalidate: 60, tags: ['free-surface'] } })
    }
  })
})
