// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';
import type { MapMustEat } from '@/lib/types';
import { translations } from '@/lib/i18n/translations';
import { GUEST_SHAKE_MS } from '@/lib/guestCardShake';

const openLoginModal = vi.fn();
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: null, loading: false }),
  useLoginModal: () => ({ open: openLoginModal }),
}));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/lib/map', async () => {
  const actual = await vi.importActual<typeof import('@/lib/map/unlockedMustEats')>(
    '@/lib/map/unlockedMustEats'
  );
  return {
    useMapData: ({ initialMapData }: { initialMapData: InitialMapData }) => initialMapData,
    useUnlockedMustEats: () => ({ unlockedIds: new Set<string>() }),
    resolveUnlockedMustEatIds: actual.resolveUnlockedMustEatIds,
  };
});

import HubMustEatsTeaser from '@/app/components/HubMustEatsTeaser';
import { HomeMapDataProvider } from '@/app/components/HomeMapDataContext';

const faceUp: MapMustEat = {
  _id: 'm1',
  dish: 'Smash Burger',
  image: 'https://cdn.sanity.io/i.png',
  restaurant: { _id: 'r1', name: 'Bar Basta', slug: 'bar-basta', lat: 52.5, lng: 13.4 },
};
const covered: MapMustEat = {
  _id: 'm2',
  restaurant: { _id: 'r2', name: 'Ora', slug: 'ora', lat: 52.5, lng: 13.4 },
};

const data: InitialMapData = {
  restaurants: [],
  mustEats: [faceUp, covered],
  categories: [],
  totalCount: 0,
  revealedMustEatIds: ['m1'],
};

const routerStub = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
} as unknown as AppRouterInstance;

function renderTeaser() {
  return render(
    <AppRouterContext.Provider value={routerStub}>
      <NextIntlClientProvider locale="de" messages={translations.de} timeZone="Europe/Berlin">
        <HomeMapDataProvider initialMapData={data}>
          <HubMustEatsTeaser />
        </HomeMapDataProvider>
      </NextIntlClientProvider>
    </AppRouterContext.Provider>
  );
}

const coveredCard = () =>
  screen.getByRole('button', { name: 'Verdecktes Must Eat — anmelden und aufdecken' });

/* Betreiber, 07.09.2026: „Auf der Startseite eigentlich genau das Gleiche: Wenn
   ich da auf einen verdeckten [Must Eat] klicke, dann will ich, dass es genauso
   vibriert und zittert, und dann kommt das Anmeldefenster." — derselbe Griff
   wie im Map-Detail (useMustEatDetailState). */
describe('HubMustEatsTeaser — Zittern vor der Anmeldung', () => {
  beforeEach(() => {
    openLoginModal.mockClear();
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('shakes the covered card first and opens the login when the shake is done', () => {
    vi.useFakeTimers();
    const { container } = renderTeaser();

    fireEvent.click(coveredCard());

    // Waehrend des Zitterns bleibt das Formular zu.
    expect(openLoginModal).not.toHaveBeenCalled();
    expect(container.querySelector('[class*="photoTapping"]')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(GUEST_SHAKE_MS);
    });

    expect(container.querySelector('[class*="photoTapping"]')).toBeNull();
    expect(openLoginModal).toHaveBeenCalledOnce();
    // Die angetippte Karte reist als Absicht mit — das Starter Pack legt sie
    // garantiert offen hinein (/api/starter-pack, pendingStarterCard).
    expect(openLoginModal).toHaveBeenCalledWith('starter', { starterMustEatId: 'm2' });
    expect(sessionStorage.getItem('eatthis_pending_starter_card')).toContain('"m2"');
  });

  it('does not open the login twice when the card is tapped again mid-shake', () => {
    vi.useFakeTimers();
    renderTeaser();

    fireEvent.click(coveredCard());
    fireEvent.click(coveredCard());

    act(() => {
      vi.advanceTimersByTime(GUEST_SHAKE_MS);
    });

    expect(openLoginModal).toHaveBeenCalledOnce();
  });

  /* Ohne Bewegung waere die Wartezeit ein toter Moment — dann sofort. */
  it('opens the login at once under reduced motion', () => {
    const original = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({ matches: query.includes('reduce') }),
    });
    try {
      const { container } = renderTeaser();

      fireEvent.click(coveredCard());

      expect(openLoginModal).toHaveBeenCalledWith('starter', { starterMustEatId: 'm2' });
      expect(container.querySelector('[class*="photoTapping"]')).toBeNull();
    } finally {
      if (original) {
        Object.defineProperty(window, 'matchMedia', { configurable: true, value: original });
      } else {
        Reflect.deleteProperty(window, 'matchMedia');
      }
    }
  });
});
