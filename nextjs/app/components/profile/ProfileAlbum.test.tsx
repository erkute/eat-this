// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MapMustEat } from '@/lib/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    key === 'albumGroupProgress'
      ? `${vars?.group}: ${vars?.done} von ${vars?.total} aufgedeckt`
      : key,
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
      <ProfileAlbum mustEats={mustEats} faceUpIds={new Set(['m1'])} groupOf={() => 'Mitte'} />
    );

    const image = container.querySelector<HTMLImageElement>('img[src="/api/must-eat-image/m1"]');
    expect(image).not.toBeNull();
    expect(image?.getAttribute('loading')).toBe('lazy');
  });

  /* Die Gruppen kamen aus buildAlbum schon immer — das Rendering ebnete sie
     wieder zu einer Flaeche ein, und die Sammlung sagte nur „24 von 24". */
  it('teilt die Sammlung in Bezirke und zaehlt jeden einzeln', () => {
    const at = (id: string, district: string, open: boolean): MapMustEat => ({
      _id: id,
      dish: id,
      ...(open ? { image: `/api/must-eat-image/${id}` } : {}),
      restaurant: { _id: `r-${id}`, name: 'R', slug: 'r', lat: 0, lng: 0, district },
    });
    const mustEats = [
      at('a', 'Kreuzberg', true),
      at('b', 'Kreuzberg', false),
      at('c', 'Mitte', false),
    ];

    render(
      <ProfileAlbum
        mustEats={mustEats}
        faceUpIds={new Set(['a'])}
        groupOf={(m) => m.restaurant.district ?? 'Berlin'}
      />
    );

    const heads = screen.getAllByRole('heading', { level: 3 });
    expect(heads.map((h) => h.getAttribute('aria-label'))).toEqual([
      'Kreuzberg: 1 von 2 aufgedeckt',
      'Mitte: 0 von 1 aufgedeckt',
    ]);
    /* Die Nummer der verdeckten Karte zaehlt ueber alle Bezirke durch, nicht
       innerhalb der Gruppe — sonst gaebe es drei Karten „Nummer 1". */
    expect(screen.getByLabelText('lockedSubhead 3')).toBeTruthy();
  });
});
