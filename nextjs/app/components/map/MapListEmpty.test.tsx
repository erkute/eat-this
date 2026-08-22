// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useLocale: () => 'de',
  // Stand-in for the ICU keys the locked variant reads, so the assertions below
  // are about the count and the label reaching the copy — not about wording.
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    key === 'emptyLockedBody'
      ? `Für „${values?.label}" sind ${values?.count} passende Spots noch gesperrt.`
      : key === 'emptyLockedBodyBare'
        ? `${values?.count} passende Spots sind noch gesperrt.`
        : key,
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ lang: 'de', t: (key: string) => key }) }));
vi.mock('@/lib/auth', () => ({ useLoginModal: () => ({ open: vi.fn() }) }));
vi.mock('@/lib/map', () => ({
  abbreviateBezirk: (value: string | null) => value,
  getOpenStatus: () => ({ isOpen: true, label: 'Geöffnet', minutesUntilChange: 60 }),
  resolvePeek: () => ({ kind: 'none' }),
}));
vi.mock('@/lib/sanityImageLoader', () => ({ default: ({ src }: { src: string }) => src }));
vi.mock('@/lib/map/useRestaurantDetail', () => ({ prefetchRestaurantDetail: vi.fn() }));

import type { MapRestaurant } from '@/lib/types';
import { prefetchRestaurantDetail } from '@/lib/map/useRestaurantDetail';
import MapListEmpty from './MapListEmpty';
import RestaurantList from './RestaurantList';

function emptyList(props: Partial<React.ComponentProps<typeof RestaurantList>> = {}) {
  return (
    <RestaurantList
      restaurants={[]}
      selectedId={null}
      uid={null}
      userTier="anon"
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

describe('MapListEmpty', () => {
  it('names the locked count and the filter it applies to', () => {
    render(<MapListEmpty lockedCount={3} filterLabel="Ramen" packHref="/pack/all-berlin" />);

    expect(screen.getByRole('status').textContent).toContain(
      'Für „Ramen" sind 3 passende Spots noch gesperrt'
    );
    expect(screen.getByRole('status').textContent).toContain('map.emptyLockedTitle');
    expect(screen.getByRole('link')).toHaveProperty(
      'href',
      expect.stringContaining('/pack/all-berlin')
    );
  });

  it('points at the free district lists — the paywall covers the map, not the writing', () => {
    render(
      <MapListEmpty
        lockedCount={3}
        filterLabel="Ramen"
        packHref="/pack/all-berlin"
        districtsHref="/bezirk"
      />
    );

    const free = screen.getByRole('link', { name: 'map.emptyLockedFreeCta' });
    expect(free).toHaveProperty('href', expect.stringContaining('/bezirk'));
    expect(screen.getByRole('status').textContent).toContain('map.emptyLockedFree');
  });

  it('offers no free-lists route when nothing matches at all', () => {
    render(<MapListEmpty lockedCount={0} districtsHref="/bezirk" />);

    // Nothing is being held back, so there is nothing to read elsewhere either.
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('says "nothing found" rather than "locked" when nothing matches at all', () => {
    render(<MapListEmpty lockedCount={0} filterLabel="Xyzzy" />);

    const text = screen.getByRole('status').textContent ?? '';
    expect(text).toContain('map.emptyTitle');
    expect(text).not.toContain('gesperrt');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('drops the label clause when no single filter label applies', () => {
    render(<MapListEmpty lockedCount={5} packHref="/pack/all-berlin" />);

    expect(screen.getByRole('status').textContent).toContain('5 passende Spots sind noch gesperrt');
  });
});

describe('RestaurantList empty state', () => {
  // The regression: a search matching only locked spots („Ramen" = 0 free, 3
  // locked) used to skip the empty state entirely and render the bare
  // All-Berlin banner — an empty surface plus a paywall, no "0 hits", no reason.
  it('renders the empty state when only locked spots match', () => {
    render(emptyList({ lockedMatchCount: 3, activeFilterLabel: 'Ramen' }));

    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Für „Ramen" sind 3 passende Spots noch gesperrt');
    expect(status.textContent).not.toContain('map.listEndSub');
  });

  it('still renders the empty state when nothing matches at all', () => {
    render(emptyList({ lockedMatchCount: 0 }));

    expect(screen.getByRole('status').textContent).toContain('map.emptyTitle');
  });

  it('does not sell packs to an all-Berlin owner', () => {
    render(
      emptyList({
        userTier: 'allBerlin',
        lockedMatchCount: 3,
        activeFilterLabel: 'Ramen',
      })
    );

    const status = screen.getByRole('status');
    expect(status.textContent).toContain('map.emptyTitle');
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('RestaurantList locked search hits', () => {
  const spot = (id: string, name: string): MapRestaurant =>
    ({ _id: id, name, slug: id, lat: 52.5, lng: 13.4 }) as unknown as MapRestaurant;

  // The bug this fixes: a query naming a grey spot got "0 hits" back, even
  // though the spot is in the catalogue and its name is public on its district
  // page. Now the query hands it back as a row you can open.
  it('lists locked matches instead of the empty state', () => {
    render(emptyList({ lockedRestaurants: [spot('l1', 'Geheime Ramen Bar')] }));

    expect(screen.getByRole('heading', { name: 'Geheime Ramen Bar' })).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('opens a locked row like its grey dot — same handler, same spot', () => {
    const onSelect = vi.fn();
    const locked = spot('l1', 'Geheime Ramen Bar');
    render(emptyList({ lockedRestaurants: [locked], onSelect }));

    screen.getByRole('button', { name: /Geheime Ramen Bar/ }).click();

    expect(onSelect).toHaveBeenCalledWith(locked);
  });

  it('keeps the free hits above the locked ones', () => {
    render(
      emptyList({
        restaurants: [spot('f1', 'Freies Lokal')],
        lockedRestaurants: [spot('l1', 'Geheime Ramen Bar')],
      })
    );

    // The All-Berlin banner carries a heading too, so this is about order,
    // not about the list containing exactly two.
    const names = screen.getAllByRole('heading').map((h) => h.textContent);
    expect(names.indexOf('Freies Lokal')).toBeLessThan(names.indexOf('Geheime Ramen Bar'));
  });

  // /api/restaurant-detail serves the paid fields. A locked row must never
  // warm it — the row exists to name the spot, not to fetch what was not paid for.
  it('never prefetches the paid detail payload for a locked row', () => {
    const observed: Element[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(private cb: (e: { isIntersecting: boolean }[]) => void) {}
        observe(el: Element) {
          observed.push(el);
          this.cb([{ isIntersecting: true }]);
        }
        disconnect() {}
      }
    );
    vi.mocked(prefetchRestaurantDetail).mockClear();

    render(
      emptyList({
        restaurants: [spot('f1', 'Freies Lokal')],
        lockedRestaurants: [spot('l1', 'Geheime Ramen Bar')],
      })
    );

    expect(observed.length).toBe(1);
    expect(prefetchRestaurantDetail).toHaveBeenCalledTimes(1);
    expect(prefetchRestaurantDetail).toHaveBeenCalledWith('f1');
    vi.unstubAllGlobals();
  });
});
