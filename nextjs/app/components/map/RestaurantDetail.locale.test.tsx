// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MapRestaurant } from '@/lib/types';

let locale: 'de' | 'en' = 'de';

vi.mock('next-intl', () => ({ useLocale: () => locale }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ lang: locale, t: (key: string) => key }),
}));
vi.mock('@/lib/auth', () => ({ useLoginModal: () => ({ open: vi.fn() }) }));
vi.mock('@/lib/map/useHeartCount', () => ({ useHeartCount: () => ({ count: 0 }) }));
vi.mock('./useSwipePager', () => ({ useSwipePager: vi.fn() }));
vi.mock('../ShareButton', () => ({ default: () => null }));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

// The detail-only fields arrive from /api/restaurant-detail, not from the map
// list payload — this is where both language variants land.
vi.mock('@/lib/map/useRestaurantDetail', () => ({
  useRestaurantDetail: () => ({
    detail: {
      description: 'Deutsche Beschreibung.',
      descriptionEn: 'English description.',
      tip: 'Deutscher Tipp.',
      tipEn: 'English tip.',
    },
    loading: false,
  }),
}));

import RestaurantDetail from './RestaurantDetail';

const restaurant: MapRestaurant = {
  _id: 'restaurant-1',
  _createdAt: '2026-01-01T00:00:00Z',
  name: 'Test Spot',
  slug: 'test-spot',
  lat: 52.5,
  lng: 13.4,
  mustEatCount: 0,
};

function renderDetail() {
  render(
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
}

afterEach(() => {
  cleanup();
  locale = 'de';
});

describe('RestaurantDetail prose locale', () => {
  it('renders the German base copy on /', () => {
    locale = 'de';
    renderDetail();
    expect(screen.getByText('Deutsche Beschreibung.')).toBeTruthy();
    expect(screen.getByText('Deutscher Tipp.')).toBeTruthy();
  });

  it('renders the English override on /en', () => {
    locale = 'en';
    renderDetail();
    expect(screen.getByText('English description.')).toBeTruthy();
    expect(screen.getByText('English tip.')).toBeTruthy();
    expect(screen.queryByText('Deutsche Beschreibung.')).toBeNull();
  });
});
