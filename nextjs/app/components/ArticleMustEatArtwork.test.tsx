// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';

const state = vi.hoisted(() => ({ uid: null as string | null, loading: false, dataUid: null as string | null, open: [] as string[] }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: state.uid ? { uid: state.uid } : null, loading: state.loading }) }));
vi.mock('@/lib/map/useMapData', () => ({ useMapData: () => ({ dataUid: state.dataUid, mustEats: [{ _id: 'card', image: '/api/must-eat-image/card?v=owned' }], revealedMustEatIds: new Set(state.open) }) }));
import Artwork, { ArticleMustEatProvider } from './ArticleMustEatArtwork';

const initialData = (open: boolean): InitialMapData => ({ restaurants: [], categories: [], totalCount: 0, mustEats: [{ _id: 'card', image: '/api/must-eat-image/card?v=public' }] as InitialMapData['mustEats'], revealedMustEatIds: open ? ['card'] : [] });
const render = (open = false) => renderToStaticMarkup(<ArticleMustEatProvider initialData={initialData(open)}><Artwork id="card" /></ArticleMustEatProvider>);

describe('article card visibility', () => {
  beforeEach(() => { state.uid = null; state.loading = false; state.dataUid = null; state.open = []; });
  it('renders publicly open artwork in the initial HTML without waiting for auth', () => {
    state.loading = true;
    expect(render(true)).toContain('v=public');
    expect(render(true)).toContain('data-article-card-state="open"');
  });
  it('keeps a covered card covered even when an image is present', () => {
    expect(render()).toContain('card-back.webp');
    expect(render()).not.toContain('/api/must-eat-image/');
  });
  it('shows the current account’s unlocked artwork', () => {
    state.uid = state.dataUid = 'owner'; state.open = ['card'];
    expect(render()).toContain('v=owned');
  });
  it('does not show artwork retained from a signed-out account', () => {
    state.dataUid = 'owner'; state.open = ['card'];
    expect(render()).toContain('card-back.webp');
  });
  it('does not show another account’s cached artwork during a switch', () => {
    state.uid = 'new-user'; state.dataUid = 'owner'; state.open = ['card'];
    expect(render()).toContain('card-back.webp');
  });
  it('uses the current public article data instead of a previous anonymous payload', () => {
    expect(render(true)).toContain('v=public');
    expect(render(true)).not.toContain('v=owned');
  });
  it('keeps a public SSR card open when the matching account cache has no reveals', () => {
    state.uid = state.dataUid = 'returning-user';
    expect(render(true)).toContain('v=public');
    expect(render(true)).toContain('data-article-card-state="open"');
  });
});
