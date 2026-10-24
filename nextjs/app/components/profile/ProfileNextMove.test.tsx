// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { MapMustEat } from '@/lib/types';

const location = vi.hoisted(() => ({
  value: null as { lat: number; lng: number } | null,
  loading: false,
  error: null as 'denied' | 'unavailable' | 'timeout' | null,
  request: vi.fn(),
}));

vi.mock('@/app/components/SiteImage', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'de',
  /* Gibt Schluessel plus Werte zurueck, damit die Tests pruefen koennen,
     WELCHE Botschaft mit welchen Zahlen gewaehlt wurde — die Formulierung
     selbst gehoert in die Uebersetzungsdatei, nicht hierher. */
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));
vi.mock('@/app/components/MapIntentLink', () => ({
  default: ({ href, children }: React.PropsWithChildren<{ href: string }>) => (
    <span data-href={href}>{children}</span>
  ),
}));
vi.mock('@/lib/map/UserLocationContext', () => ({
  useUserLocationContext: () => ({
    location: location.value,
    loading: location.loading,
    error: location.error,
    request: location.request,
  }),
}));

import ProfileNextMove from './ProfileNextMove';

const HERE = { lat: 52.4993, lng: 13.4181 };

function mustEat(id: string, faceUp = false): MapMustEat {
  const base: MapMustEat = {
    _id: id,
    restaurant: {
      _id: `r-${id}`,
      name: `Spot ${id}`,
      slug: `spot-${id}`,
      lat: HERE.lat + 0.001,
      lng: HERE.lng,
    },
  };
  return faceUp ? { ...base, dish: 'Dish', image: `/img/${id}` } : base;
}

const DISTRICTS = new Map([
  ['r-a', 'Kreuzberg'],
  ['r-b', 'Kreuzberg'],
  ['r-c', 'Kreuzberg'],
]);

function renderMove(opts: { mustEats?: MapMustEat[] } = {}) {
  return render(
    <ProfileNextMove
      mustEats={opts.mustEats ?? [mustEat('a'), mustEat('b'), mustEat('c')]}
      faceUpIds={new Set<string>()}
      districtByRest={DISTRICTS}
    />
  );
}

afterEach(() => {
  cleanup();
  location.value = null;
  location.loading = false;
  location.error = null;
  location.request.mockReset();
});

describe('ProfileNextMove', () => {
  it('bleibt weg, wenn nichts mehr verdeckt ist', () => {
    const { container } = renderMove({ mustEats: [mustEat('a', true)] });

    expect(container.firstChild).toBeNull();
  });

  it('macht aus dem Hinweis einen konkreten Spot mit öffentlichem Foto', () => {
    const target = mustEat('a');
    target.restaurant.photo = '/spot-photo.webp';
    const { container } = renderMove({ mustEats: [target] });
    expect(screen.getByRole('heading', { name: 'Spot a' })).toBeTruthy();
    expect(container.textContent).toContain('Kreuzberg');
    expect(container.textContent).toContain('moveInvitation');
    expect(container.querySelector('img[src="/spot-photo.webp"]')).toBeTruthy();
    expect(container.querySelector('img[src*="must-eat-image"]')).toBeNull();
  });

  it('nennt die Entfernung, sobald der Standort da ist', () => {
    location.value = HERE;
    const { container } = renderMove();

    expect(container.textContent).toMatch(/1\d\d m/);
  });

  /* Ein Schritt pro Zustand: ohne Standort ist das Freigeben der Schritt,
     denn es ist das, was aus dem Bezirk eine Entfernung macht. */
  it('sucht auf Wunsch in der Nähe und lässt den Weg zum Spot auch ohne Standort offen', () => {
    const { container } = renderMove();

    expect(screen.getByRole('button')).toBeTruthy();
    expect(container.textContent).toContain('moveFindNear');
    fireEvent.click(screen.getByRole('button'));
    expect(location.request).toHaveBeenCalledOnce();
  });

  /* In den Browser-Einstellungen abgelehnt: der Knopf bewirkt dort nichts
     mehr — dann bleibt gar keiner stehen, denn der Weg auf die Map liegt
     seit 04.09.2026 in der Karte selbst. */
  it('laesst den Knopf weg, wenn der Standort abgelehnt wurde', () => {
    location.error = 'denied';
    renderMove();

    expect(screen.queryByRole('button')).toBeNull();
  });

  /* Der einzige Weg aus diesem Block heraus, in beiden Standort-Zustaenden:
     die Karte. Der zweite Knopf daneben ist entfallen (Nutzer, 04.09.2026:
     „das kann jetzt weg, weil man ja auf die Karte klicken und landen
     kann") — er fuehrte auf dasselbe Ziel.

     Auf den SPOT, nicht auf `?me=<id>`: ein Spot traegt mehrere Karten, und
     wer hier steht, will wissen, wo er hin muss. Dieselbe Wahl wie im Zoom
     des Albums. */
  it('macht die Karte zum Weg auf den Spot — mit und ohne Standort', () => {
    const { container } = renderMove();
    expect(container.querySelector('[data-href]')?.getAttribute('data-href')).toBe('/map?r=spot-a');

    cleanup();
    location.value = HERE;
    const withLocation = renderMove().container;
    expect(withLocation.querySelector('[data-href]')?.getAttribute('data-href')).toBe(
      '/map?r=spot-a'
    );
  });

  it('sagt waehrend der Standortsuche, dass gesucht wird', () => {
    location.loading = true;
    const { container } = renderMove();

    expect(container.textContent).toContain('Standort wird gesucht');
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });
});
