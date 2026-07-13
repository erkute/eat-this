'use client'

import type { CategoryDef } from '@/lib/categories'
import type { MapMustEat, MapRestaurant } from '@/lib/types'

export interface CachedMapData {
  restaurants: MapRestaurant[]
  lockedRestaurants: MapRestaurant[]
  mustEats: MapMustEat[]
  categories: CategoryDef[]
  totalCount: number
  revealedMustEatIds: string[]
}

const CURRENT_CACHE_PREFIX = 'eatthis_mapdata_v2_'
const CURRENT_LAST_UID_KEY = 'eatthis_last_uid_v2'
const LEGACY_CACHE_PREFIX = 'eatthis_mapdata_'
const LEGACY_LAST_UID_KEY = 'eatthis_last_uid'

const cacheKey = (uid: string) => `${CURRENT_CACHE_PREFIX}${uid}`

function removeKeys(prefix: string): void {
  if (typeof window === 'undefined') return
  const matches: string[] = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (key?.startsWith(prefix)) matches.push(key)
  }
  for (const key of matches) window.localStorage.removeItem(key)
}

function metadataOnly(mustEat: MapMustEat): MapMustEat {
  const { dish, description, descriptionEn, price, image, ...metadata } = mustEat
  void dish
  void description
  void descriptionEn
  void price
  void image
  return metadata
}

export function readMapCache(uid: string | null): CachedMapData | null {
  if (!uid || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(cacheKey(uid))
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.restaurants)) return null
    return data as CachedMapData
  } catch {
    return null
  }
}

export function writeMapCache(uid: string, data: CachedMapData): void {
  if (typeof window === 'undefined') return
  const safeData: CachedMapData = {
    ...data,
    mustEats: data.mustEats.map(metadataOnly),
    // Viewer-specific face-up IDs expose purchase/reveal state and are useless
    // without the deliberately uncached Premium fields. Recompute them live.
    revealedMustEatIds: [],
  }
  try {
    window.localStorage.setItem(cacheKey(uid), JSON.stringify(safeData))
    window.localStorage.setItem(CURRENT_LAST_UID_KEY, uid)
  } catch {}
}

export function seedUidBeforeAuth(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const hint = JSON.parse(window.localStorage.getItem('_authHint') || 'null')
    if (!hint || !hint.n) return null
    return window.localStorage.getItem(CURRENT_LAST_UID_KEY)
  } catch {
    return null
  }
}

export function clearMapDataCaches(): void {
  if (typeof window === 'undefined') return
  removeKeys(LEGACY_CACHE_PREFIX)
  window.localStorage.removeItem(LEGACY_LAST_UID_KEY)
  window.localStorage.removeItem(CURRENT_LAST_UID_KEY)
}

export function reconcileMapDataCacheIdentity(uid: string | null): void {
  if (typeof window === 'undefined') return

  // v1 stored hydrated Premium Must-Eats. It must be deleted for every user,
  // including the currently signed-in user, immediately after this rollout.
  const legacyKeys: string[] = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (
      key?.startsWith(LEGACY_CACHE_PREFIX) &&
      !key.startsWith(CURRENT_CACHE_PREFIX)
    ) {
      legacyKeys.push(key)
    }
  }
  for (const key of legacyKeys) window.localStorage.removeItem(key)
  window.localStorage.removeItem(LEGACY_LAST_UID_KEY)

  const previousUid = window.localStorage.getItem(CURRENT_LAST_UID_KEY)
  if (!uid || !previousUid || previousUid !== uid) {
    removeKeys(CURRENT_CACHE_PREFIX)
    window.localStorage.removeItem(CURRENT_LAST_UID_KEY)
  }
}
