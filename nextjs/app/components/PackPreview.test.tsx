import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { MapMustEat } from '@/lib/types';
const data = vi.hoisted(() => ({
  revealedMustEatIds: ['public', 'other'],
  mustEats: [] as MapMustEat[],
}));
const auth = vi.hoisted(() => ({ user: null as { uid: string } | null, loading: false }));
vi.mock('@/lib/map/server-initial-map-data', () => ({ getInitialAnonMapData: async () => data }));
vi.mock('@/lib/auth', () => ({ useAuth: () => auth }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
import PackPreview from './PackPreview';
const card = (id: string, previewCategory?: string): MapMustEat => ({
  _id: id, dish: id, image: `/api/must-eat-image/${id}`, previewCategory,
  restaurant: { _id: 'spot', name: 'Restaurant', slug: 'spot', lat: 0, lng: 0 },
});
describe('PackPreview public content', () => {
  it('keeps the editorial example identical through login, account changes and logout', async () => {
    data.mustEats = [card('other', 'fast-food'), card('public', 'lunch')];
    const props = { locale: 'de' as const, category: 'lunch' };
    const initial = renderToStaticMarkup(await PackPreview(props));
    expect(initial).toContain('/api/must-eat-image/public');
    expect(initial).not.toContain('/api/must-eat-image/other');
    for (const user of [{ uid: 'a' }, { uid: 'b' }, null]) {
      auth.user = user;
      expect(renderToStaticMarkup(await PackPreview(props))).toBe(initial);
    }
  });
  it('never substitutes another category when its example is missing', async () => {
    data.mustEats = [card('public', 'lunch')];
    expect(renderToStaticMarkup(await PackPreview({locale:'de',category:'fast-food'}))).toBe('');
  });
  it('requires server authorization even for an editorial example', async () => {
    data.mustEats = [card('private', 'pizza')];
    expect(renderToStaticMarkup(await PackPreview({locale:'en',category:'pizza'}))).toBe('');
  });
  it('skips covered and uncurated cards on the overview', async () => {
    data.mustEats = [card('private', 'pizza'), card('other'), card('public', 'lunch')];
    const html = renderToStaticMarkup(await PackPreview({locale:'de'}));
    expect(html).toContain('/api/must-eat-image/public');
    expect(html).not.toContain('/api/must-eat-image/private');
    expect(html).not.toContain('/api/must-eat-image/other');
  });
});
