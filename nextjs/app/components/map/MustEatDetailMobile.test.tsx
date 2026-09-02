// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MapMustEat } from '@/lib/types';
import type { MustEatDetailState } from './useMustEatDetailState';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    const copy: Record<string, string> = {
      mustEatAtAria: 'Must Eat bei {name}',
      proximityAway: 'Noch nicht aufgedeckt',
      proximityHint:
        'Ein Gericht, das du probieren musst. Am Spot deckst du die Karte auf — dann gehört sie dir.',
      locationAllow: 'Standort freigeben',
      locationBlocked: 'Standort blockiert',
      proximityHere: 'Du bist da.',
      proximityTapReveal: 'Tipp drauf und sieh, was du hier bestellen musst.',
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
    requestLocation: null,
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
  it('shows no distance at all and names what is under the card', () => {
    const { container } = render(
      <MustEatDetailMobile
        mustEat={mustEat}
        isUnlocked={false}
        onClose={vi.fn()}
        state={makeState()}
      />
    );

    expect(screen.getByText('Noch nicht aufgedeckt')).toBeTruthy();
    expect(
      screen.getByText(
        'Ein Gericht, das du probieren musst. Am Spot deckst du die Karte auf — dann gehört sie dir.'
      )
    ).toBeTruthy();
    // No figure anywhere in the block: the radius made it read as arithmetic,
    // and the remaining distance made the spot look far and like hard work.
    expect(container.textContent).not.toMatch(/50\s?m/);
    expect(container.textContent).not.toMatch(/2,4\s?km/);
  });

  /* Without a fix the card used to read "Komm näher" over a "come within 50 m"
     line — a guess dressed as a measurement, and a wrong one for anyone already
     standing in the doorway. It has to name the actual blocker instead — and
     since 02.09.2026 not IN the dish line: "Wo bist du?" in dish size read like
     a dish. The dish line keeps saying what is under the card; the location
     is its own chip below, and that chip is the button that asks. */
  it('asks for the location in a chip under the dish line when there is no fix', () => {
    const requestLocation = vi.fn();
    const { container } = render(
      <MustEatDetailMobile
        mustEat={mustEat}
        isUnlocked={false}
        onClose={vi.fn()}
        state={makeState({ distance: null, needsLocation: true, requestLocation })}
      />
    );

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Noch nicht aufgedeckt');
    expect(screen.queryByText('Wo bist du?')).toBeNull();
    expect(screen.queryByText(/Komm auf/)).toBeNull();
    // One step per state: no fix means the copy line carries only the chip —
    // the sentence about the prize waits for the state that can promise it.
    expect(screen.queryByText(/Ein Gericht, das du probieren musst/)).toBeNull();

    const chip = container.querySelector('[data-location-needed]');
    expect(chip?.getAttribute('data-location-needed')).toBe('ask');
    const chipButton = chip?.querySelector('button');
    expect(chipButton?.textContent).toBe('Standort freigeben');
    fireEvent.click(chipButton!);
    expect(requestLocation).toHaveBeenCalledOnce();

    // The accessible name is all a screen reader gets, and the tap it labels
    // opens the permission prompt — "Zu weit weg" would be a lie there.
    expect(screen.getByLabelText('Standort freigeben')).toBeTruthy();
    expect(screen.queryByLabelText('Zu weit weg')).toBeNull();
  });

  /* A denial cannot be re-asked from the page — and it is not a state of the
     card either: visibly the card reads like any covered card, and the tap
     raises the same notice the map and the home page show (see
     MustEatDetail.handleLocationBlocked). Only the accessible name still
     says why the tap will not reveal anything. */
  it('reads like a plain covered card once the permission was denied', () => {
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

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Noch nicht aufgedeckt');
    expect(screen.getByText(/Ein Gericht, das du probieren musst/)).toBeTruthy();
    expect(screen.queryByText('Standort blockiert')).toBeNull();
    expect(screen.queryByText('Standort freigeben')).toBeNull();
    expect(container.querySelector('[data-location-needed]')).toBeNull();
    expect(screen.getByLabelText('Standort blockiert')).toBeTruthy();
  });

  /* Ein Wort bricht nicht: „RINDERGULASCH" (13 Versalien) war in der Grundgröße
     breiter als der 331px-Rail und stand links an, während die zweite Zeile
     mittig saß. Die Größenstufe muss deshalb auch am längsten Wort hängen, nicht
     nur an der Zeichenzahl. */
  it('drops a size step for a long single word even when the name is short overall', () => {
    render(
      <MustEatDetailMobile
        mustEat={{ ...mustEat, dish: 'Rindergulasch mit Knödel', image: '/card.webp' }}
        isUnlocked
        onClose={vi.fn()}
        state={makeState()}
      />
    );

    expect(screen.getByRole('heading', { level: 2 }).className).toMatch(/fdNameLong/);
  });

  /* Die ganze Restaurant-Zeile ist der Weg zum Spot — die „Zum Spot"-Pille
     nahm der Namensspalte 100px und ließ lange Namen brechen. Fürs Ohr bleibt
     der Knopf, was er war. */
  it('makes the whole restaurant row the way to the spot', () => {
    const onViewRestaurant = vi.fn();
    render(
      <MustEatDetailMobile
        mustEat={mustEat}
        isUnlocked={false}
        onClose={vi.fn()}
        onViewRestaurant={onViewRestaurant}
        state={makeState()}
      />
    );

    const row = screen.getByRole('button', { name: 'Zum Spot: Test Spot' });
    expect(row.textContent).toContain('Test Spot');
    fireEvent.click(row);
    expect(onViewRestaurant).toHaveBeenCalledOnce();
  });

  /* Auf dem Telefon gibt es keine Pfeile — der Zählstand hinter dem Kicker ist
     das Zeichen, dass der Stapel weitergeht. */
  it('shows the position in the stack behind the kicker', () => {
    render(
      <MustEatDetailMobile
        mustEat={{ ...mustEat, restaurant: { ...mustEat.restaurant, district: 'Neukölln' } }}
        isUnlocked={false}
        onClose={vi.fn()}
        position={{ index: 3, count: 25 }}
        state={makeState()}
      />
    );

    expect(screen.getByText('3 / 25')).toBeTruthy();
    expect(screen.getByText(/Must Eat · Neukölln/)).toBeTruthy();
  });

  it('hides the covered card while the zoom is open so the clone never doubles it', () => {
    const { container } = render(
      <MustEatDetailMobile
        mustEat={mustEat}
        isUnlocked={false}
        onClose={vi.fn()}
        state={makeState({ zoomActive: true })}
      />
    );

    const card = container.querySelector<HTMLElement>('[data-detail-hero] button');
    expect(card?.style.visibility).toBe('hidden');
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
    expect(screen.getByText('Tipp drauf und sieh, was du hier bestellen musst.')).toBeTruthy();
    expect(container.querySelector('[data-reveal-ready]')).not.toBeNull();
  });
});
