// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MapMustEat } from '@/lib/types';
import type { MustEatDetailState } from './useMustEatDetailState';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    const copy: Record<string, string> = {
      mustEatAtAria: 'Must Eat bei {name}',
      proximityAway: 'Noch {distance}',
      proximityHint: 'Aufgedeckt wird vor Ort.',
      locationNeeded: 'Wo bist du?',
      enableLocation: 'Tipp auf die Karte und gib deinen Standort frei.',
      locationBlocked: 'Standort blockiert',
      locationBlockedHint: "Erlaub ihn in den Browser-Einstellungen, dann geht's vor Ort.",
      proximityHere: 'Du bist da.',
      proximityTapReveal: 'Tipp auf die Karte.',
    };
    return Object.entries(values ?? {}).reduce(
      (text, [name, value]) => text.replace(`{${name}}`, String(value)),
      copy[key] ?? key
    );
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    lang: 'de',
    t: (key: string) =>
      ({
        'mustEats.covered': 'Verdeckt',
        'map.toSpot': 'Zum Spot',
        'map.tooFarToReveal': 'Zu weit weg',
        'map.revealHere': 'Jetzt aufdecken. Tipp auf die Karte.',
        'map.inRestaurant': 'Bei',
        'map.searchClose': 'Schließen',
      })[key] ?? key,
  }),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('./useSwipePager', () => ({ useSwipePager: vi.fn() }));

import MustEatDetailMobile from './MustEatDetailMobile';

afterEach(cleanup);

const mustEat: MapMustEat = {
  _id: 'must-eat-1',
  restaurant: {
    _id: 'restaurant-1',
    name: 'Test Spot',
    slug: 'test-spot',
    lat: 52.52,
    lng: 13.405,
  },
};

function makeState(overrides: Partial<MustEatDetailState> = {}): MustEatDetailState {
  return {
    distance: 2400,
    canUnlock: false,
    needsLocation: false,
    locationDenied: false,
    vibrateIntensity: 0.18,
    tapping: false,
    unlocking: false,
    unlockError: false,
    revealOrigin: null,
    zoomRect: null,
    zoomActive: false,
    handleCardClick: vi.fn(async () => undefined),
    handleRevealDone: vi.fn(),
    handleCardZoom: vi.fn(),
    handleZoomReady: vi.fn(),
    handleZoomClose: vi.fn(),
    handleZoomExitComplete: vi.fn(),
    ...overrides,
  };
}

describe('MustEatDetailMobile proximity states', () => {
  it('names the distance once and states the rule without a second number', () => {
    const { container } = render(
      <MustEatDetailMobile
        mustEat={mustEat}
        isUnlocked={false}
        onClose={vi.fn()}
        state={makeState()}
      />
    );

    expect(screen.getByText('Noch 2,4 km')).toBeTruthy();
    expect(screen.getByText('Aufgedeckt wird vor Ort.')).toBeTruthy();
    // The sub used to repeat the unlock radius, so the block showed two figures
    // at once ("Noch 2,4 km" over "50 m") and read as arithmetic.
    expect(container.textContent).not.toMatch(/50\s?m/);
  });

  /* Without a fix the card used to read "Komm näher" over a "come within 50 m"
     line — a guess dressed as a measurement, and a wrong one for anyone already
     standing in the doorway. It has to name the actual blocker instead. */
  it('asks for the location instead of guessing at a distance when there is no fix', () => {
    const { container } = render(
      <MustEatDetailMobile
        mustEat={mustEat}
        isUnlocked={false}
        onClose={vi.fn()}
        state={makeState({ distance: null, needsLocation: true })}
      />
    );

    expect(screen.getByText('Wo bist du?')).toBeTruthy();
    expect(screen.getByText('Tipp auf die Karte und gib deinen Standort frei.')).toBeTruthy();
    expect(screen.queryByText(/Komm auf/)).toBeNull();
    // The accessible name is all a screen reader gets, and the tap it labels
    // now opens the permission prompt — "Zu weit weg" would be a lie there.
    expect(screen.getByLabelText('Wo bist du?')).toBeTruthy();
    expect(screen.queryByLabelText('Zu weit weg')).toBeNull();
    expect(
      container.querySelector('[data-location-needed]')?.getAttribute('data-location-needed')
    ).toBe('ask');
  });

  /* A denial cannot be re-asked from the page, so the copy has to point at the
     one place that can still change it. */
  it('points at the browser settings once the permission was denied', () => {
    const { container } = render(
      <MustEatDetailMobile
        mustEat={mustEat}
        isUnlocked={false}
        onClose={vi.fn()}
        state={makeState({
          distance: null,
          needsLocation: true,
          locationDenied: true,
        })}
      />
    );

    expect(screen.getByText('Standort blockiert')).toBeTruthy();
    expect(screen.getByLabelText('Standort blockiert')).toBeTruthy();
    expect(
      screen.getByText("Erlaub ihn in den Browser-Einstellungen, dann geht's vor Ort.")
    ).toBeTruthy();
    expect(
      container.querySelector('[data-location-needed]')?.getAttribute('data-location-needed')
    ).toBe('blocked');
  });

  it('switches to a strong reveal-now state inside the unlock radius', () => {
    const { container } = render(
      <MustEatDetailMobile
        mustEat={mustEat}
        isUnlocked={false}
        onClose={vi.fn()}
        state={makeState({
          distance: 42,
          canUnlock: true,
          vibrateIntensity: 0.92,
        })}
      />
    );

    expect(screen.getByText('Du bist da.')).toBeTruthy();
    expect(screen.getByText('Tipp auf die Karte.')).toBeTruthy();
    expect(container.querySelector('[data-reveal-ready]')).not.toBeNull();
  });
});
