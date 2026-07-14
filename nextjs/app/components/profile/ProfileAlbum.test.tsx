// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MapMustEat } from '@/lib/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('@/app/components/map/LazyMustEatImageLightbox', () => ({
  default: () => null,
}));

import ProfileAlbum from './ProfileAlbum';

afterEach(cleanup);

describe('ProfileAlbum', () => {
  it('loads protected Must-Eat images directly so the browser sends its capability cookie', () => {
    const mustEats: MapMustEat[] = [
      {
        _id: 'm1',
        dish: 'Ramen',
        image: '/api/must-eat-image/m1',
        restaurant: {
          _id: 'r1',
          name: 'Restaurant',
          slug: 'restaurant',
          lat: 52.5,
          lng: 13.4,
        },
      },
    ];

    const { container } = render(
      <ProfileAlbum
        mustEats={mustEats}
        faceUpIds={new Set(['m1'])}
        categoryOf={() => 'Nudeln'}
      />
    );

    const image = container.querySelector<HTMLImageElement>(
      'img[src="/api/must-eat-image/m1"]'
    );
    expect(image).not.toBeNull();
    expect(image?.getAttribute('loading')).toBe('lazy');
  });
});
