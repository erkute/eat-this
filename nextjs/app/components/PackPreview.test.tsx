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
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('@/lib/map/useMapData', () => ({ useMapData: vi.fn() }));
import PackPreview from './PackPreview';
const card = (id: string, permanent: boolean): MapMustEat => ({
  _id: id,
  dish: id,
  image: `/api/must-eat-image/${id}`,
  revealedForAnon: permanent,
  restaurant: { _id: 'spot', name: 'Restaurant', slug: 'spot', lat: 0, lng: 0 },
});
describe('PackPreview public content', () => {
  it.each(['Döner', 'Doener im Brot', 'Doner kebab', 'Kebap'])(
    'does not promote %s as Dinner',
    async (dish) => {
      data.restaurants[0].categories = [{ slug: 'dinner' }, { slug: 'fast-food' }];
      data.mustEats = [{ ...card('public', true), dish }];
      expect(renderToStaticMarkup(await PackPreview({ locale: 'de', category: 'dinner' }))).toBe(
        ''
      );
      expect(
        renderToStaticMarkup(await PackPreview({ locale: 'de', category: 'fast-food' }))
      ).toContain(dish);
      data.restaurants[0].categories = [{ slug: 'pizza' }];
    }
  );
  it('selects the next public Dinner card after a döner', async () => {
    data.restaurants[0].categories = [{ slug: 'dinner' }];
    data.mustEats = [
      { ...card('public', true), dish: 'Döner' },
      { ...card('daily', true), dish: 'Ravioli' },
    ];
    const html = renderToStaticMarkup(await PackPreview({ locale: 'de', category: 'dinner' }));
    expect(html).toContain('Ravioli');
    expect(html).not.toContain('Döner');
    data.restaurants[0].categories = [{ slug: 'pizza' }];
  });

  it('skips private and rotating daily cards, even if they contain dish data', async () => {
    data.mustEats = [card('private', false), card('daily', false), card('public', true)];
    const html = renderToStaticMarkup(await PackPreview({ locale: 'de', category: 'pizza' }));
    expect(html).toContain('/api/must-eat-image/public');
    expect(html).not.toContain('/api/must-eat-image/private');
    expect(html).not.toContain('/api/must-eat-image/daily');
  });
  it('does not substitute another category or a covered card when no example exists', async () => {
    data.mustEats = [card('public', true)];
    expect(renderToStaticMarkup(await PackPreview({ locale: 'en', category: 'coffee' }))).toBe('');
    data.mustEats = [card('private', true)];
    expect(renderToStaticMarkup(await PackPreview({ locale: 'de' }))).toBe('');
  });
});
