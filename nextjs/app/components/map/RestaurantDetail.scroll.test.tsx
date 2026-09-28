// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MapRestaurant } from '@/lib/types';

vi.mock('next-intl', () => ({ useLocale: () => 'de' }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ lang: 'de', t: (key: string) => key }),
}));
vi.mock('@/lib/auth', () => ({ useLoginModal: () => ({ open: vi.fn() }) }));
vi.mock('@/lib/map/useHeartCount', () => ({ useHeartCount: () => ({ count: 0 }) }));
vi.mock('./useSwipePager', () => ({ useSwipePager: vi.fn() }));
vi.mock('../ShareButton', () => ({ default: () => null }));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/lib/map/useRestaurantDetail', () => ({
  useRestaurantDetail: () => ({ detail: null, loading: false }),
}));

import RestaurantDetail from './RestaurantDetail';

const spot = (id: string): MapRestaurant => ({
  _id: id,
  _createdAt: '2026-01-01T00:00:00Z',
  name: id,
  slug: id,
  lat: 52.5,
  lng: 13.4,
  mustEatCount: 0,
});

const detail = (restaurant: MapRestaurant) => (
  <RestaurantDetail
    restaurant={restaurant}
    mustEats={[]}
    unlockedIds={new Set()}
    revealedMustEatIds={new Set()}
    userLocation={null}
    uid={null}
    userTier="anon"
    onClose={vi.fn()}
    onMustEatClick={vi.fn()}
  />
);

afterEach(cleanup);

/* Das Detail bleibt beim Spot-Wechsel gemountet (Pager, Pin-Klick auf der
   Karte). Der neue Spot beginnt trotzdem oben, nicht dort, wo man im alten
   hingescrollt hatte. */
describe('RestaurantDetail scroll on spot change', () => {
  const scroller = () => document.querySelector<HTMLElement>('[data-detail-scroll]')!;

  it('starts the next spot at the top', () => {
    const { rerender } = render(detail(spot('spot-a')));
    scroller().scrollTop = 480;
    expect(scroller().scrollTop).toBe(480);

    rerender(detail(spot('spot-b')));

    expect(scroller().scrollTop).toBe(0);
  });

  it('keeps the position while the same spot re-renders', () => {
    const { rerender } = render(detail(spot('spot-a')));
    scroller().scrollTop = 480;

    rerender(detail({ ...spot('spot-a'), name: 'spot-a renamed' }));

    expect(scroller().scrollTop).toBe(480);
  });
});
