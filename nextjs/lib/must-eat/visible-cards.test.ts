import { describe, expect, it } from 'vitest';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';
import type { MapMustEat } from '@/lib/types';
import { selectVisibleMustEats } from './visible-cards';
const card = (id: string, image: string): MapMustEat => ({ _id: id, image, restaurant: { _id: id, name: id, slug: id, lat: 0, lng: 0 } });
const publicCard = card('public', '/api/must-eat-image/public');
const privateCard = card('owned', '/api/must-eat-image/owned');
const initial: InitialMapData = { restaurants: [], categories: [], totalCount: 0, mustEats: [publicCard], revealedMustEatIds: ['public'] };
const live = { dataUid: 'owner' as string | null, mustEats: [privateCard], revealedMustEatIds: new Set(['owned']) };

describe('shared card visibility', () => {
  it('unions public and current-account cards without losing public artwork', () => {
    const result = selectVisibleMustEats(initial, { uid: 'owner', authLoading: false, live });
    expect(result.mustEats).toEqual([privateCard, publicCard]);
    expect(result.revealedMustEatIds).toEqual(['public', 'owned']);
  });
  it('drops private artwork immediately on sign-out, account switch or unresolved auth', () => {
    for (const auth of [{ uid: null, authLoading: false }, { uid: 'other', authLoading: false }, { uid: 'owner', authLoading: true }]) {
      expect(selectVisibleMustEats(initial, { ...auth, live })).toBe(initial);
      expect(selectVisibleMustEats(undefined, { ...auth, live }).mustEats).toEqual([]);
    }
  });
  it('preserves public SSR artwork while a sanitized account cache has no image', () => {
    const result = selectVisibleMustEats(initial, { uid: 'owner', authLoading: false, live: { dataUid: 'owner', mustEats: [{ ...publicCard, image: undefined }], revealedMustEatIds: new Set() } });
    expect(result.mustEats[0].image).toBe(publicCard.image);
  });
  it('accepts an anonymous API response on surfaces without SSR data', () => {
    const result = selectVisibleMustEats(undefined, { uid: null, authLoading: false, live: { dataUid: null, mustEats: [publicCard], revealedMustEatIds: new Set(['public']) } });
    expect(result.mustEats).toEqual([publicCard]);
  });
});
