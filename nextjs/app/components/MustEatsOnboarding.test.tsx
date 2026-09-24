// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';

// Keys pass through as their own name, which keeps assertions readable. The
// step-rail labels are built inline from `lang`, so they come out as real text.
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ lang: 'de', t: (k: string) => k, setLang: () => {} }),
}));

const openLogin = vi.fn();
vi.mock('@/lib/auth', () => ({ useLoginModal: () => ({ open: openLogin }) }));

import MustEatsOnboarding, { ONBOARDING_SEEN_KEY } from '@/app/components/MustEatsOnboarding';

const DATA: InitialMapData = {
  restaurants: [],
  mustEats: [
    {
      _id: 'me-1',
      dish: 'Königsberger Klopse',
      image: 'https://cdn.example/dish.webp',
      restaurant: { _id: 'r-1', name: 'R', slug: 'r', lat: 52.52, lng: 13.405 },
    },
  ],
  categories: [],
  totalCount: 1,
  revealedMustEatIds: ['me-1'],
};

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
});

/** Only the current step is rendered. The last step has two blocks (guest /
 *  signed-in) and CSS picks one, hence a list. */
const activeTitles = () =>
  [...screen.getByRole('dialog').querySelectorAll('h2')].map((h) => h.textContent);

describe('MustEatsOnboarding', () => {
  it('opens on first visit (no localStorage flag)', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(activeTitles()).toEqual(['mustEats.onb1Title']);
    expect(screen.getByText('mustEats.onb1Kicker')).toBeTruthy();
  });

  it('stays closed when the seen flag is set', () => {
    window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    render(<MustEatsOnboarding initialMapData={DATA} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('skip dismisses and sets the flag', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />);
    fireEvent.click(screen.getByRole('button', { name: 'Überspringen' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_SEEN_KEY)).toBe('1');
  });

  it('"how it works" trigger reopens despite the flag', () => {
    window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    render(<MustEatsOnboarding initialMapData={DATA} />);
    fireEvent.click(screen.getByText('mustEats.howItWorks'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(activeTitles()).toEqual(['mustEats.onb1Title']);
  });

  /** The last slide renders both offers and CSS (html[data-auth]) picks one, so
   *  in jsdom both are present — scope queries to the row under test. */
  const row = (variant: 'guest' | 'auth') => screen.getByTestId(`onb-actions-${variant}`);

  it('steps through all three slides; last button closes and sets flag', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />);
    fireEvent.click(screen.getByText('mustEats.onbNext'));
    expect(activeTitles()).toEqual(['mustEats.onb2Title']);
    fireEvent.click(screen.getByText('mustEats.onbNext'));
    expect(activeTitles()).toEqual(['mustEats.onb3Title', 'mustEats.onbStarterTitle']);
    expect(screen.getByText('mustEats.onbPacksCta').getAttribute('href')).toBe('/packs');
    fireEvent.click(screen.getByText('mustEats.onbStart', { selector: '[data-auth-only] button' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_SEEN_KEY)).toBe('1');
  });

  it('pitches the free Starter Pack to logged-out visitors on the last slide', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />);
    fireEvent.click(screen.getByText('mustEats.onbNext'));
    fireEvent.click(screen.getByText('mustEats.onbNext'));

    // Both offers ship; html[data-auth] decides which one paints. Guests get the
    // free pack — a paid Booster Pack is a rung that needs an account first.
    const guest = row('guest');
    expect(guest.textContent).toContain('mustEats.onbStarterCta');
    expect(screen.getByTestId('onb-starter-pack').getAttribute('src')).toContain(
      '/pics/booster/booster_free.webp'
    );

    // …and the paid one stays for signed-in visitors.
    expect(row('auth').textContent).toContain('mustEats.onbPacksCta');

    // „Anmelden" öffnet das Anmelde-Fenster im Starter-Modus und schließt die Erklärung.
    fireEvent.click(screen.getByText('mustEats.onbStarterCta'));
    expect(openLogin).toHaveBeenCalledWith();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('gives the guest offer the primary slot and dismissing the secondary one', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />);
    fireEvent.click(screen.getByText('mustEats.onbNext'));
    fireEvent.click(screen.getByText('mustEats.onbNext'));

    const guest = row('guest');
    // The free offer takes the yellow slot; "no thanks" is the quiet one.
    const primary = [...guest.children].find((el) => !el.className.includes('quiet'));
    expect(primary?.textContent).toBe('mustEats.onbStarterCta');
    fireEvent.click(
      screen.getByText('mustEats.onbStart', { selector: '[data-guest-only] button' })
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('steps back with Zurück', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />);
    expect((screen.getByRole('button', { name: 'Zurück' }) as HTMLButtonElement).disabled).toBe(
      true
    );
    fireEvent.click(screen.getByText('mustEats.onbNext'));
    expect(activeTitles()).toEqual(['mustEats.onb2Title']);
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));
    expect(activeTitles()).toEqual(['mustEats.onb1Title']);
  });

  it('names the current step', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />);
    expect(screen.getByLabelText('Schritt 1 von 3')).toBeTruthy();
    fireEvent.click(screen.getByText('mustEats.onbNext'));
    expect(screen.getByLabelText('Schritt 2 von 3')).toBeTruthy();
  });

  it('Escape closes the overlay and sets the flag', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_SEEN_KEY)).toBe('1');
  });

  it('shows the flipping card on slide 2 and the booster pack art on slide 3', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />);
    expect(screen.queryByTestId('onb-pack')).toBeNull();
    fireEvent.click(screen.getByText('mustEats.onbNext'));
    expect(screen.getByTestId('onb-flipper')).toBeTruthy();
    expect(screen.queryByTestId('onb-pack')).toBeNull();
    fireEvent.click(screen.getByText('mustEats.onbNext'));
    expect(screen.getByTestId('onb-pack').getAttribute('src')).toContain(
      '/pics/booster/booster.webp'
    );
    expect(screen.queryByTestId('onb-flipper')).toBeNull();
  });

  it('lets the visitor flip the card themselves on step 2, cancelling the auto-flip', () => {
    vi.useFakeTimers();
    try {
      render(<MustEatsOnboarding initialMapData={DATA} />);
      fireEvent.click(screen.getByText('mustEats.onbNext'));
      const flipper = screen.getByTestId('onb-flipper');
      expect(flipper.className).toContain('flipped');

      // Tapping the card is the mechanic itself, so the card is the control.
      act(() => {
        fireEvent.click(screen.getByLabelText('mustEats.onbFlipAria'));
      });
      expect(flipper.className).not.toContain('flipped');

      // The pending auto-flip must not fire afterwards and take the card back
      // off the visitor.
      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(flipper.className).not.toContain('flipped');

      act(() => {
        fireEvent.click(screen.getByLabelText('mustEats.onbFlipAria'));
      });
      expect(flipper.className).toContain('flipped');
    } finally {
      vi.useRealTimers();
    }
  });

  it('offers no flip control outside step 2', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />);
    expect(screen.queryByLabelText('mustEats.onbFlipAria')).toBeNull();
    fireEvent.click(screen.getByText('mustEats.onbNext'));
    expect(screen.getByLabelText('mustEats.onbFlipAria')).toBeTruthy();
    fireEvent.click(screen.getByText('mustEats.onbNext'));
    expect(screen.queryByLabelText('mustEats.onbFlipAria')).toBeNull();
  });

  it('step 2 shows the card back, then auto-flips open after the dwell', () => {
    vi.useFakeTimers();
    try {
      render(<MustEatsOnboarding initialMapData={DATA} />);
      fireEvent.click(screen.getByText('mustEats.onbNext'));
      const flipper = screen.getByTestId('onb-flipper');
      expect(flipper.className).toContain('flipped');
      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(flipper.className).not.toContain('flipped');
    } finally {
      vi.useRealTimers();
    }
  });
});
