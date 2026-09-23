// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useLocale: () => 'de',
  // Der Leerzustand nennt die Suchanfrage beim Namen und braucht dafuer
  // Platzhalter — die kann nur next-intls `t`, nicht der aus lib/i18n.
  useTranslations: (ns: string) => (key: string, werte?: Record<string, string>) =>
    werte ? `${ns}.${key}:${Object.values(werte).join(',')}` : `${ns}.${key}`,
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ lang: 'de', t: (key: string) => key }) }));
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

const spot = (id: string, name: string): MapRestaurant =>
  ({ _id: id, name, slug: id, lat: 52.5, lng: 13.4 }) as unknown as MapRestaurant;

function list(props: Partial<React.ComponentProps<typeof RestaurantList>> = {}) {
  return (
    <RestaurantList
      restaurants={[]}
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

describe('MapListEmpty', () => {
  it('says nothing was found and offers the way back', () => {
    const onResetFilters = vi.fn();
    render(<MapListEmpty filtersActive onResetFilters={onResetFilters} />);

    expect(screen.getByRole('status').textContent).toContain('map.emptyTitle');
    screen.getByRole('button', { name: 'map.emptyReset' }).click();
    expect(onResetFilters).toHaveBeenCalled();
  });

  /* Wer nur etwas eingetippt hat, will seinen Suchbegriff loswerden und nicht
     „Filter zuruecksetzen" angeboten bekommen — und ohne die Anfrage im Text
     bleibt offen, ob man sich vertippt hat oder ob es das wirklich nicht gibt. */
  it('nennt die Suchanfrage beim Namen und bietet an, sie zu loeschen', () => {
    const onClearSearch = vi.fn();
    const onResetFilters = vi.fn();
    render(
      <MapListEmpty query="banh mi" onClearSearch={onClearSearch} onResetFilters={onResetFilters} />
    );

    const text = screen.getByRole('status').textContent ?? '';
    expect(text).toContain('map.emptyKickerSearch');
    expect(text).toContain('banh mi');
    screen.getByRole('button', { name: 'map.emptyResetSearch' }).click();
    expect(onClearSearch).toHaveBeenCalled();
    expect(onResetFilters).not.toHaveBeenCalled();
  });

  it('spricht ohne Suchanfrage von den Filtern', () => {
    render(<MapListEmpty query="   " filtersActive onResetFilters={vi.fn()} />);

    const text = screen.getByRole('status').textContent ?? '';
    expect(text).toContain('map.emptyKickerFilter');
    expect(screen.getByRole('button', { name: 'map.emptyReset' })).toBeTruthy();
  });

  /* Suche und Filter zusammen: die Filter gehen, die Anfrage bleibt. Findet sie
     auch allein nichts, steht man danach im Suchzustand. */
  it('lockert bei Suche plus Filtern nur die Filter', () => {
    const onClearSearch = vi.fn();
    const onResetFilters = vi.fn();
    render(
      <MapListEmpty
        query="pizza"
        filtersActive
        onClearSearch={onClearSearch}
        onResetFilters={onResetFilters}
      />
    );

    const text = screen.getByRole('status').textContent ?? '';
    expect(text).toContain('map.emptyKickerBoth');
    expect(text).toContain('pizza');
    screen.getByRole('button', { name: 'map.emptyReset' }).click();
    expect(onResetFilters).toHaveBeenCalled();
    expect(onClearSearch).not.toHaveBeenCalled();
  });

  it('sells nothing from an empty screen', () => {
    /* The locked variant is gone: the list carries the paywalled spots itself
       now, so an empty list means the catalogue has nothing — there is no
       count to name and no offer to make. */
    render(<MapListEmpty filtersActive onResetFilters={vi.fn()} />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('RestaurantList rows', () => {
  it('renders the empty state only when the whole catalogue misses', () => {
    render(list());
    expect(screen.getByRole('status').textContent).toContain('map.emptyTitle');
  });

  it('opens a row — same handler, same spot as its pin', () => {
    const onSelect = vi.fn();
    const target = spot('l1', 'Geheime Ramen Bar');
    render(list({ restaurants: [target], onSelect }));

    screen.getByRole('button', { name: /Geheime Ramen Bar/ }).click();

    expect(onSelect).toHaveBeenCalledWith(target);
  });

  it('keeps the order it was handed — the list decides it, not this component', () => {
    render(
      list({
        restaurants: [spot('l1', 'Geheime Ramen Bar'), spot('f1', 'Freies Lokal')],
      })
    );

    const names = screen.getAllByRole('heading').map((h) => h.textContent);
    expect(names.indexOf('Geheime Ramen Bar')).toBeLessThan(names.indexOf('Freies Lokal'));
  });

  /* Jede Zeile wärmt ihr Detail vor, sobald sie in Sichtweite kommt — bis zum
     06.09.2026 war das für gesperrte Zeilen ausgenommen, weil /api/restaurant-
     detail die bezahlten Felder auslieferte. Bezahlt wird dort nichts mehr:
     die Story steht ohnehin indexiert auf der Spot-Seite. */
  it('warms the detail payload for every row that comes into view', () => {
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
      })
    );

    /* Each row is watched — twice for a non-first row, which also watches
       for when to start fetching its photo. */
    expect(new Set(observed).size).toBe(2);
    expect(prefetchRestaurantDetail).toHaveBeenCalledTimes(2);
    expect(prefetchRestaurantDetail).toHaveBeenCalledWith('f1');
    expect(prefetchRestaurantDetail).toHaveBeenCalledWith('l1');
    vi.unstubAllGlobals();
  });
});
