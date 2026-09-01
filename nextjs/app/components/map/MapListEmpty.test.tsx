// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({ useLocale: () => 'de' }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ lang: 'de', t: (key: string) => key }) }));
vi.mock('@/lib/auth', () => ({ useLoginModal: () => ({ open: vi.fn() }) }));
vi.mock('@/lib/map', () => ({
  // Echte Logik, kein Stub: die Tests behaupten etwas darüber, WANN das
  // All-Berlin-Banner steht — mit einem Stub prüften sie den Stub.
  showsPackPromos: (tier: string) => tier === 'anon' || tier === 'starter',
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

const spot = (id: string, name: string): MapRestaurant =>
  ({ _id: id, name, slug: id, lat: 52.5, lng: 13.4 }) as unknown as MapRestaurant;

function list(props: Partial<React.ComponentProps<typeof RestaurantList>> = {}) {
  return (
    <RestaurantList
      restaurants={[]}
      lockedIds={new Set()}
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
  it('says nothing was found and offers the way back', () => {
    const onReset = vi.fn();
    render(<MapListEmpty onReset={onReset} />);

    expect(screen.getByRole('status').textContent).toContain('map.emptyTitle');
    screen.getByRole('button', { name: 'map.emptyReset' }).click();
    expect(onReset).toHaveBeenCalled();
  });

  it('sells nothing from an empty screen', () => {
    /* The locked variant is gone: the list carries the paywalled spots itself
       now, so an empty list means the catalogue has nothing — there is no
       count to name and no offer to make. */
    render(<MapListEmpty onReset={vi.fn()} />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('RestaurantList with locked spots in it', () => {
  it('renders the empty state only when the whole catalogue misses', () => {
    render(list());
    expect(screen.getByRole('status').textContent).toContain('map.emptyTitle');
  });

  it('lists a locked spot like any other row', () => {
    // No badge, no grey photo, no "locked" anywhere: the row names the spot,
    // and opening it is what brings up the offer.
    render(list({ restaurants: [spot('l1', 'Geheime Ramen Bar')], lockedIds: new Set(['l1']) }));

    expect(screen.getByRole('heading', { name: 'Geheime Ramen Bar' })).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('opens a locked row like its grey dot — same handler, same spot', () => {
    const onSelect = vi.fn();
    const locked = spot('l1', 'Geheime Ramen Bar');
    render(list({ restaurants: [locked], lockedIds: new Set(['l1']), onSelect }));

    screen.getByRole('button', { name: /Geheime Ramen Bar/ }).click();

    expect(onSelect).toHaveBeenCalledWith(locked);
  });

  it('keeps the order it was handed — the list decides it, not this component', () => {
    render(
      list({
        restaurants: [spot('l1', 'Geheime Ramen Bar'), spot('f1', 'Freies Lokal')],
        lockedIds: new Set(['l1']),
      })
    );

    // The All-Berlin banner carries a heading too, so this is about order,
    // not about the list containing exactly two.
    const names = screen.getAllByRole('heading').map((h) => h.textContent);
    expect(names.indexOf('Geheime Ramen Bar')).toBeLessThan(names.indexOf('Freies Lokal'));
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
      list({
        restaurants: [spot('f1', 'Freies Lokal'), spot('l1', 'Geheime Ramen Bar')],
        lockedIds: new Set(['l1']),
      })
    );

    expect(observed.length).toBe(1);
    expect(prefetchRestaurantDetail).toHaveBeenCalledTimes(1);
    expect(prefetchRestaurantDetail).toHaveBeenCalledWith('f1');
    vi.unstubAllGlobals();
  });
});
