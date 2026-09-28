// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({ useLocale: () => 'de' }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ lang: 'de', t: (key: string) => key }) }));
vi.mock('@/lib/map', () => ({
  abbreviateBezirk: (value: string | null) => value,
  getOpenStatus: () => null,
  resolvePeek: () => ({ kind: 'none' }),
}));
vi.mock('@/lib/sanityImageLoader', () => ({ default: ({ src }: { src: string }) => src }));
vi.mock('@/lib/map/useRestaurantDetail', () => ({
  prefetchRestaurantDetail: vi.fn(),
  useCachedRestaurantDetail: () => null,
}));

import RestaurantList from './RestaurantList';
import type { MapRestaurant } from '@/lib/types';

const restaurant = {
  _id: 'restaurant-1',
  slug: 'restaurant-1',
  name: 'Test Restaurant',
  district: 'Neukölln',
  lat: 52.5,
  lng: 13.4,
  cuisineType: 'Japanese',
  categories: [{ slug: 'breakfast', name: 'Frühstück', nameEn: 'Breakfast' }],
  mustEatCount: 0,
} as unknown as MapRestaurant;

describe('RestaurantList card meta', () => {
  it('names the cuisine, like the detail sheet, not a category', () => {
    render(
      <RestaurantList
        restaurants={[restaurant]}
        selectedId={null}
        onSelect={vi.fn()}
        primaryMustEats={new Map()}
        unlockedIds={new Set()}
        revealedMustEatIds={new Set()}
        userLocation={null}
        visibleRows={12}
        onNeedMoreRows={vi.fn()}
      />
    );

    expect(screen.getByText('Japanisch')).toBeTruthy();
    expect(screen.queryByText('Frühstück')).toBeNull();
  });
});
