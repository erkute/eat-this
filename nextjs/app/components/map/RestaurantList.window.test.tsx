// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({ useLocale: () => 'de' }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ lang: 'de', t: (key: string) => key }) }));
vi.mock('@/lib/auth', () => ({ useLoginModal: () => ({ open: vi.fn() }) }));
vi.mock('@/lib/map', () => ({
  // Echte Logik, kein Stub: die Tests behaupten etwas darüber, WANN das
  // All-Berlin-Banner steht — mit einem Stub prüften sie den Stub.
  showsPackPromos: (tier: string) => tier === 'anon' || tier === 'starter',
  abbreviateBezirk: (value: string | null) => value,
  getOpenStatus: () => null,
  resolvePeek: () => ({ kind: 'none' }),
}));
vi.mock('@/lib/sanityImageLoader', () => ({ default: ({ src }: { src: string }) => src }));
vi.mock('@/lib/map/useRestaurantDetail', () => ({ prefetchRestaurantDetail: vi.fn() }));

import RestaurantList from './RestaurantList';
import type { MapRestaurant } from '@/lib/types';

// jsdom hat keinen IntersectionObserver — den Callback festhalten, damit der
// Test den Sentinel von Hand ins Bild schieben kann.
type IoCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;
let ioCallbacks: IoCallback[] = [];

beforeEach(() => {
  ioCallbacks = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IoCallback) {
        ioCallbacks.push(cb);
      }
      observe() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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
      lockedIds={new Set()}
      selectedId={null}
      uid={null}
      userTier="allBerlin"
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

  // Gesperrte Spots stehen in derselben Liste und zählen ins selbe Budget —
  // sie sind Zeilen wie alle anderen.
  it('counts locked rows into the same budget', () => {
    const all = spots(25);
    const lockedIds = new Set(all.slice(5).map((r) => r._id));
    render(list({ restaurants: all, lockedIds, visibleRows: 12 }));

    expect(rows()).toHaveLength(12);
    expect(rows().at(-1)).toBe('Spot 11');
  });
});
