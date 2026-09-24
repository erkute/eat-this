// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  lat: 52.52,
  lng: 13.405,
  mustEatCount: 2,
};
const covered: MapMustEat = {
  _id: 'me-covered',
  restaurant: {
    _id: 'restaurant-1',
    name: 'Test Spot',
    slug: 'test-spot',
    lat: 52.52,
    lng: 13.405,
  },
};
const open: MapMustEat = { ...covered, _id: 'me-open', dish: 'Croissant', image: '/card.webp' };

function renderAt(userLocation: { lat: number; lng: number } | null) {
  render(
    <RestaurantDetail
      restaurant={restaurant}
      mustEats={[covered, open]}
      unlockedIds={new Set(['me-open'])}
      revealedMustEatIds={new Set()}
      userLocation={userLocation}
      uid="u1"
      userTier="starter"
      onClose={vi.fn()}
      onMustEatClick={vi.fn()}
    />
  );
}

afterEach(() => {
  cleanup();
});

/* Wer im Lokal steht, sieht schon im Restaurant-Detail, dass es etwas
   aufzudecken gibt: die verdeckte Karte zittert wie im Must-Eat-Detail
   (Betreiber, 24.09.2026). */
describe('RestaurantDetail must-eat cards within reach', () => {
  it('shakes only the covered card once the visitor is within 50 m', () => {
    renderAt({ lat: 52.52, lng: 13.405 });
    const ready = screen.getByRole('button', { name: 'map.revealHere' });
    expect(ready.hasAttribute('data-reveal-ready')).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Croissant' }).hasAttribute('data-reveal-ready')
    ).toBe(false);
  });

  it('stays still from afar and without a fix', () => {
    renderAt({ lat: 52.53, lng: 13.405 }); // gut 1 km nördlich
    expect(screen.getByRole('button', { name: 'map.hiddenMustEatAria' })).toBeTruthy();
    cleanup();
    renderAt(null);
    expect(screen.queryByRole('button', { name: 'map.revealHere' })).toBeNull();
  });
});
