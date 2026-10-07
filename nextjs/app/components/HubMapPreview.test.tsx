// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentProps, ReactNode } from 'react';
import type { MapRestaurant } from '@/lib/types';
import { HOME_MAP_CATEGORIES, mapPreviewSpots } from '@/lib/home/mapPreview';

const fixtures = vi.hoisted(() => ({
  restaurants: [] as MapRestaurant[],
  categories: [
    { slug: 'pizza', recommendedSpots: ['gazzo'] },
    { slug: 'coffee', recommendedSpots: ['kolo-coffee'] },
    { slug: 'lunch', recommendedSpots: ['schuesseldienst'] },
  ],
}));
vi.mock('./HomeMapDataContext', () => ({
  useHomeMapData: () => ({ initialMapData: fixtures }),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ lang: 'de' }) }));
vi.mock('./MapIntentLink', () => ({
  default: ({ children, ...props }: ComponentProps<'a'> & { children: ReactNode }) => <a {...props}>{children}</a>,
}));

import HubMapPreview from './HubMapPreview';

function spot(slug: string, category: string, overrides: Partial<MapRestaurant> = {}): MapRestaurant {
  return {
    _id: slug, _createdAt: '', name: slug, slug, lat: 52.5, lng: 13.4,
    photo: 'https://cdn.sanity.io/example.webp', mustEatCount: 0,
    categories: [{ slug: category, name: category }], ...overrides,
  };
}
afterEach(cleanup);

describe('homepage map preview', () => {
  it('renders a usable category link and real spot before hydration', () => {
    fixtures.restaurants = [spot('gazzo', 'pizza')];
    const html = renderToStaticMarkup(<HubMapPreview locale="de" />);
    expect(html).toContain('Worauf hast du Hunger?');
    expect(html).toContain('href="/map?cat=pizza"');
    expect(html).toContain('href="/map?cat=pizza&amp;r=gazzo"');
    expect(html).toContain('alt="gazzo"');
  });

  it('changes the spot and carries the selected category into both map links', () => {
    fixtures.restaurants = [spot('gazzo', 'pizza'), spot('kolo-coffee', 'coffee'), spot('schuesseldienst', 'lunch')];
    render(<HubMapPreview locale="de" />);
    fireEvent.click(screen.getByRole('button', { name: 'Kaffee' }));
    expect(screen.getByRole('button', { name: 'Kaffee' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Pizza' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('kolo-coffee');
    expect(screen.getByRole('link', { name: 'Zur Map' }).getAttribute('href')).toBe('/map?cat=coffee');
    expect(screen.getByRole('link', { name: 'kolo-coffee auf der Map ansehen' }).getAttribute('href')).toBe('/map?cat=coffee&r=kolo-coffee');
    fireEvent.click(screen.getByRole('button', { name: 'Lunch' }));
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('schuesseldienst');
    expect(screen.getByRole('link', { name: 'Zur Map' }).getAttribute('href')).toBe('/map?cat=lunch');
  });

  it('keeps the English map entry usable with no preview photos', () => {
    fixtures.restaurants = [];
    render(<HubMapPreview locale="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Coffee' }));
    expect(screen.getByRole('link', { name: 'Open the map' }).getAttribute('href')).toBe('/map?cat=coffee');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('uses public category membership and rejects unusable photo/coordinate rows', () => {
    const rows = [
      spot('gazzo', 'pizza'), spot('coffee', 'coffee', { lat: 52.55 }),
      spot('no-photo', 'pizza', { photo: undefined, lat: 52.56 }),
      spot('invalid', 'pizza', { lng: NaN }), spot('outside', 'pizza', { lat: 91 }),
    ];
    expect(mapPreviewSpots(rows, HOME_MAP_CATEGORIES[0], rows.map((row) => row.slug)).map((item) => item.slug)).toEqual(['gazzo']);
    expect(rows).toHaveLength(5);
  });

  it('only shows the category’s curated recommendations, in editorial starting order', () => {
    const rows = [spot('gazzo', 'pizza'), spot('recommended', 'pizza'), spot('unapproved', 'pizza', { lat: 52.52 })];
    expect(mapPreviewSpots(rows, HOME_MAP_CATEGORIES[0], ['recommended']).map((item) => item.slug)).toEqual(['recommended']);
    expect(mapPreviewSpots(rows, HOME_MAP_CATEGORIES[0])).toEqual([]);
    expect(mapPreviewSpots(rows, HOME_MAP_CATEGORIES[0], ['deleted-spot'])).toEqual([]);
  });
});
