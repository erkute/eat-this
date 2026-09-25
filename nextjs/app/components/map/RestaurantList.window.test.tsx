// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  useCachedRestaurantDetail: vi.fn(() => null),
}));

import RestaurantList from './RestaurantList';
import { useCachedRestaurantDetail } from '@/lib/map/useRestaurantDetail';
import type { MapRestaurant } from '@/lib/types';

// jsdom hat keinen IntersectionObserver — den Callback festhalten, damit der
// Test den Sentinel von Hand ins Bild schieben kann.
type IoCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;
let ioCallbacks: IoCallback[] = [];
let ioOptions: Array<IntersectionObserverInit | undefined> = [];

beforeEach(() => {
  ioCallbacks = [];
  ioOptions = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IoCallback, options?: IntersectionObserverInit) {
        ioCallbacks.push(cb);
        ioOptions.push(options);
      }
      observe() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.mocked(useCachedRestaurantDetail).mockImplementation(() => null);
});

function spots(n: number): MapRestaurant[] {
  return Array.from({ length: n }, (_, i) => ({
    _id: `r-${i}`,
    slug: `r-${i}`,
    name: `Spot ${i}`,
    lat: 52.5,
    lng: 13.4,
    categories: [],
    mustEatCount: 0,
  })) as unknown as MapRestaurant[];
}

function list(props: Partial<React.ComponentProps<typeof RestaurantList>> = {}) {
  return (
    <RestaurantList
      restaurants={spots(40)}
      selectedId={null}
      onSelect={vi.fn()}
      primaryMustEats={new Map()}
      unlockedIds={new Set()}
      revealedMustEatIds={new Set()}
      userLocation={null}
      visibleRows={12}
      onNeedMoreRows={vi.fn()}
      {...props}
    />
  );
}

const rows = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

describe('RestaurantList windowing', () => {
  it('renders only the requested rows, not the whole filtered list', () => {
    render(list());

    const names = rows();
    expect(names).toHaveLength(12);
    expect(names[0]).toBe('Spot 0');
    expect(names.at(-1)).toBe('Spot 11');
  });

  // Ein von der Karte angetippter Spot muss als aktive Zeile existieren, auch
  // wenn er weit unter der aktuellen Grenze liegt.
  it('stretches the window to cover a selection below it', () => {
    render(list({ selectedId: 'r-30' }));

    const names = rows();
    expect(names).toHaveLength(31);
    expect(names.at(-1)).toBe('Spot 30');
  });

  it('asks for more rows once the sentinel comes into view', () => {
    const onNeedMoreRows = vi.fn();
    render(list({ onNeedMoreRows }));

    expect(onNeedMoreRows).not.toHaveBeenCalled();
    ioCallbacks.forEach((cb) => cb([{ isIntersecting: true }]));
    expect(onNeedMoreRows).toHaveBeenCalled();
  });

  it('drops the sentinel once everything is rendered', () => {
    const onNeedMoreRows = vi.fn();
    const { container } = render(list({ restaurants: spots(8), onNeedMoreRows }));

    expect(rows()).toHaveLength(8);
    // Ohne Rest gibt es nichts nachzuladen: kein Sentinel, keine Anfrage.
    ioCallbacks.forEach((cb) => cb([{ isIntersecting: true }]));
    expect(onNeedMoreRows).not.toHaveBeenCalled();
    expect(container.querySelector('[class*=moreSentinel]')).toBeNull();
  });

  it('renders no more than the budget, whatever the catalogue size', () => {
    render(list({ restaurants: spots(25), visibleRows: 12 }));

    expect(rows()).toHaveLength(12);
    expect(rows().at(-1)).toBe('Spot 11');
  });
});

describe('RestaurantList card photos', () => {
  const photoSpots = () =>
    spots(3).map((s, i) => ({ ...s, photo: `photo-${i}` })) as unknown as MapRestaurant[];
  const photos = (container: HTMLElement) =>
    [...container.querySelectorAll('[class*=rcardImg] img')] as HTMLImageElement[];

  it('loads the first photo at once and leaves the others lazy until they come near', () => {
    const { container } = render(list({ restaurants: photoSpots() }));

    expect(photos(container).map((img) => img.getAttribute('loading'))).toEqual(['eager', 'lazy', 'lazy']);
  });

  it('starts fetching a photo well before its card reaches the screen', async () => {
    const { container } = render(list({ restaurants: photoSpots() }));

    /* Native lazy-loading waited until a card was almost in view — in Safari
       especially close — and every photo popped in a beat late. The card's
       own observer reaches much further ahead and flips it to eager. */
    const lead = ioOptions.filter((o) => o?.rootMargin?.startsWith('3200px'));
    expect(lead.length).toBeGreaterThanOrEqual(2);

    const { act } = await import('@testing-library/react');
    act(() => ioCallbacks.forEach((cb) => cb([{ isIntersecting: true }])));
    expect(photos(container).map((img) => img.getAttribute('loading'))).toEqual(['eager', 'eager', 'eager']);
  });

  it('lets the card photos be swiped once the prefetched gallery is in', async () => {
    const credited = (full: string) => ({
      _key: full,
      thumb: full,
      full,
      credit: 'Foto',
      creditUrl: 'https://example.com',
    });
    vi.mocked(useCachedRestaurantDetail).mockImplementation((slug) =>
      slug === 'r-0'
        ? {
            gallery: [
              // Dasselbe Asset wie das Kartenfoto, nur mit anderer Query.
              credited('photo-0?crop=1'),
              credited('gallery-a'),
              { _key: 'no-credit', thumb: 'gallery-x', full: 'gallery-x' },
              credited('gallery-b'),
            ],
          }
        : null
    );
    const { container } = render(list({ restaurants: photoSpots() }));
    const firstCard = container.querySelector<HTMLElement>('[data-list-row]')!;
    const cardPhotos = () =>
      [...firstCard.querySelectorAll('[class*=rcardPhotos] img')].map((img) => [
        img.getAttribute('src'),
        img.getAttribute('loading'),
      ]);

    // Kartenfoto vorn, Dublette und Foto ohne Credit fallen raus. Das
    // Nachbarfoto wartet, bis die Karte wirklich nah ist.
    expect(cardPhotos()).toEqual([
      ['photo-0', 'eager'],
      ['gallery-a', 'lazy'],
      ['gallery-b', 'lazy'],
    ]);
    expect(firstCard.querySelectorAll('[class*=rcardDots] > span')).toHaveLength(3);

    const { act } = await import('@testing-library/react');
    act(() => ioCallbacks.forEach((cb) => cb([{ isIntersecting: true }])));
    expect(cardPhotos().map(([, loading]) => loading)).toEqual(['eager', 'eager', 'lazy']);

    // Ein Spot ohne Galerie bleibt ein Foto ohne Punkte.
    const second = container.querySelectorAll<HTMLElement>('[data-list-row]')[1];
    expect(second.querySelectorAll('img')).toHaveLength(1);
    expect(second.querySelector('[class*=rcardDots]')).toBeNull();
  });
});
