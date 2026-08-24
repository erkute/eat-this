// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapMustEat, MapRestaurant } from '@/lib/types';

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

const restaurant: MapRestaurant = {
  _id: 'restaurant-1',
  _createdAt: '2026-01-01T00:00:00Z',
  name: 'Test Spot',
  slug: 'test-spot',
  isClosed: false,
  lat: 52.5,
  lng: 13.4,
  mustEatCount: 1,
};

const mustEat: MapMustEat = {
  _id: 'must-eat-1',
  restaurant: { _id: 'restaurant-1', name: 'Test Spot', slug: 'test-spot', lat: 52.5, lng: 13.4 },
};

/** Collects the observed elements so a test can fake the grid scrolling in. */
let intersect: (() => void) | null = null;

beforeEach(() => {
  intersect = null;
  class FakeObserver {
    constructor(private cb: IntersectionObserverCallback) {}
    observe(el: Element) {
      intersect = () =>
        this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this);
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = '';
    thresholds = [];
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderDetail(unlockedIds = new Set<string>()) {
  return render(
    <RestaurantDetail
      restaurant={restaurant}
      mustEats={[mustEat]}
      unlockedIds={unlockedIds}
      revealedMustEatIds={new Set()}
      userLocation={null}
      uid={null}
      userTier="anon"
      onClose={vi.fn()}
      onMustEatClick={vi.fn()}
    />
  );
}

describe('Must-Eat tap hint', () => {
  it('marks the grid once it scrolls into view while a card is face down', () => {
    const { container } = renderDetail();
    const grid = container.querySelector('ol');
    expect(grid?.getAttribute('data-hint')).toBeNull();

    act(() => intersect?.());
    expect(grid?.getAttribute('data-hint')).toBe('1');
  });

  it('stays quiet when every card is already face up', () => {
    const { container } = renderDetail(new Set(['must-eat-1']));
    expect(intersect).toBeNull();
    expect(container.querySelector('ol')?.getAttribute('data-hint')).toBeNull();
  });
});
