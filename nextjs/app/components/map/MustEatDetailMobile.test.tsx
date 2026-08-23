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
      proximityDistanceGoal: '{meters} m zum Aufdecken',
      locationNeeded: 'Standort freigeben',
      enableLocation:
        'Tipp auf die Karte und gib deinen Standort frei — dann siehst du, wie weit es noch ist.',
      locationBlocked: 'Standort blockiert',
      locationBlockedHint:
        'Erlaube den Standort in den Browser-Einstellungen, dann kannst du Must Eats vor Ort aufdecken.',
      proximityHint:
        'Komm auf {meters} m an den Spot heran, dann kannst du das Must Eat aufdecken.',
      proximityHere: 'Jetzt aufdecken',
      proximityTapReveal: 'Tipp auf die Karte und deck dein Must Eat auf.',
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
    proximityProgress: 0.27,
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

describe('MustEatDetailMobile distance meter', () => {
  it('shows localized kilometres and the real reveal radius for a covered card', () => {
    const { container } = render(
      <MustEatDetailMobile
        mustEat={mustEat}
        isUnlocked={false}
        onClose={vi.fn()}
        state={makeState()}
      />
    );

    expect(screen.getByText('Noch 2,4 km')).toBeTruthy();
    expect(
      screen.getByText('Komm auf 50 m an den Spot heran, dann kannst du das Must Eat aufdecken.')
    ).toBeTruthy();
    const fill = container.querySelector('[data-must-eat-distance-meter] span');
    expect(fill?.getAttribute('style')).toContain('--fd-distance-progress: 27%');
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
        state={makeState({ distance: null, proximityProgress: null, needsLocation: true })}
      />
    );

    expect(screen.getByText('Standort freigeben')).toBeTruthy();
    expect(
      screen.getByText(
        'Tipp auf die Karte und gib deinen Standort frei — dann siehst du, wie weit es noch ist.'
      )
    ).toBeTruthy();
    expect(screen.queryByText(/Komm auf/)).toBeNull();
    // The accessible name is all a screen reader gets, and the tap it labels
    // now opens the permission prompt — "Zu weit weg" would be a lie there.
    expect(screen.getByLabelText('Standort freigeben')).toBeTruthy();
    expect(screen.queryByLabelText('Zu weit weg')).toBeNull();
    expect(container.querySelector('[data-location-needed]')?.getAttribute('data-location-needed'))
      .toBe('ask');
    expect(container.querySelector('[data-must-eat-distance-meter]')).toBeNull();
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
          proximityProgress: null,
          needsLocation: true,
          locationDenied: true,
        })}
      />
    );

    expect(screen.getByText('Standort blockiert')).toBeTruthy();
    expect(screen.getByLabelText('Standort blockiert')).toBeTruthy();
    expect(
      screen.getByText(
        'Erlaube den Standort in den Browser-Einstellungen, dann kannst du Must Eats vor Ort aufdecken.'
      )
    ).toBeTruthy();
    expect(container.querySelector('[data-location-needed]')?.getAttribute('data-location-needed'))
      .toBe('blocked');
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
          proximityProgress: 1,
          vibrateIntensity: 0.92,
        })}
      />
    );

    expect(screen.getByText('Jetzt aufdecken')).toBeTruthy();
    expect(screen.getByText('Tipp auf die Karte und deck dein Must Eat auf.')).toBeTruthy();
    expect(container.querySelector('[data-reveal-ready]')).not.toBeNull();
    expect(container.querySelector('[data-must-eat-distance-meter]')).toBeNull();
  });
});
