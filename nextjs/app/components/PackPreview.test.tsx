import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { MapMustEat } from '@/lib/types';
const data = vi.hoisted(() => ({
  restaurants: [{ _id: 'spot', categories: [{ slug: 'pizza' }] }],
  revealedMustEatIds: ['public', 'daily'],
  mustEats: [] as MapMustEat[],
}));
vi.mock('@/lib/map/server-initial-map-data', () => ({ getInitialAnonMapData: async () => data }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
import PackPreview from './PackPreview';
const card = (id: string, permanent: boolean): MapMustEat => ({
  _id: id,
  dish: id,
  image: `/api/must-eat-image/${id}`,
  revealedForAnon: permanent,
  restaurant: { _id: 'spot', name: 'Restaurant', slug: 'spot', lat: 0, lng: 0 },
});
describe('PackPreview public content', () => {
  it('skips private and rotating daily cards, even if they contain dish data', async () => {
    data.mustEats = [card('private', false), card('daily', false), card('public', true)];
    const html = renderToStaticMarkup(await PackPreview({ locale: 'de', category: 'pizza' }));
    expect(html).toContain('/api/must-eat-image/public');
    expect(html).not.toContain('/api/must-eat-image/private');
    expect(html).not.toContain('/api/must-eat-image/daily');
  });
  it('does not substitute another category or a covered card when no example exists', async () => {
    data.mustEats = [card('public', true)];
    expect(await PackPreview({ locale: 'en', category: 'coffee' })).toBeNull();
    data.mustEats = [card('private', true)];
    expect(await PackPreview({ locale: 'de' })).toBeNull();
  });
});
