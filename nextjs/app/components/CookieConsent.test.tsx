// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const analytics = vi.hoisted(() => ({
  load: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  loadAnalytics: analytics.load,
  trackEvent: vi.fn(),
  getAnalyticsPageLocation: () => ({ pageLocation: 'https://x/', pagePath: '/' }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    lang: 'de',
    t: (key: string) =>
      ({
        'cookie.title': 'Cookie-Check',
        'cookie.text': 'Cookie-Text',
        'cookie.moreInfo': 'Mehr erfahren',
        'cookie.decline': 'Ablehnen',
        'cookie.accept': 'Akzeptieren',
      })[key] ?? key,
  }),
}));

import CookieConsent from './CookieConsent';
import { CONSENT_COOKIE, readConsent } from '@/lib/consent';

function clearCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
}

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
    clearCookies();
    document.documentElement.removeAttribute('data-consent');
    analytics.load.mockReset();
    // jsdom has no ResizeObserver, and the banner observes itself to publish
    // its height. Only the visible-banner cases reach it.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it.each(['accepted', 'declined'])('honours a %s choice already in the cookie', (choice) => {
    document.cookie = `${CONSENT_COOKIE}=${choice}; Path=/`;

    render(<CookieConsent />);

    expect(screen.queryByRole('dialog', { name: 'Cookie-Check' })).toBeNull();
    expect(analytics.load).toHaveBeenCalledTimes(choice === 'accepted' ? 1 : 0);
  });

  /* The migration is what keeps the deploy quiet: everyone who had already
   * answered would otherwise be asked again, because the answer used to live
   * in localStorage and the cookie is what is read now. */
  it.each(['accepted', 'declined'])('migrates a %s choice out of localStorage, once', (choice) => {
    localStorage.setItem('cookieConsent', choice);

    render(<CookieConsent />);

    expect(screen.queryByRole('dialog', { name: 'Cookie-Check' })).toBeNull();
    expect(readConsent(), 'the answer should now be in the cookie').toBe(choice);
    expect(localStorage.getItem('cookieConsent'), 'the old key should be gone').toBeNull();
    expect(analytics.load).toHaveBeenCalledTimes(choice === 'accepted' ? 1 : 0);
  });

  it('clears the pre-paint reservation as soon as a stored answer is found', () => {
    // The bootstrap stamps this before first paint; a decided user must not
    // keep a 175px gap reserved for a bar that will never appear.
    document.documentElement.setAttribute('data-consent', 'pending');
    document.cookie = `${CONSENT_COOKIE}=accepted; Path=/`;

    render(<CookieConsent />);

    expect(document.documentElement.getAttribute('data-consent')).toBeNull();
  });

  it('writes the cookie and drops the reservation when the user accepts', () => {
    vi.useFakeTimers();
    document.documentElement.setAttribute('data-consent', 'pending');

    render(<CookieConsent />);
    act(() => {
      vi.advanceTimersByTime(1600); // the banner slides in at 1.5s
    });

    fireEvent.click(screen.getByRole('button', { name: 'Akzeptieren' }));

    expect(readConsent()).toBe('accepted');
    expect(document.documentElement.getAttribute('data-consent')).toBeNull();
  });

  /* The reserved height and the bar's floor must be ONE number, or the space
   * reserved before paint and the height the bar actually takes drift apart —
   * which is the layout shift this whole mechanism exists to remove. */
  it('reserves the bar height from the same variable that floors the bar', () => {
    // cwd, not import.meta.url: this suite runs in jsdom, where that is not a
    // file: URL and fileURLToPath throws.
    const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');

    expect(css, 'the reserved height should be defined once').toMatch(
      /--consent-bar-reserved:\s*\d+px/
    );
    expect(css, '[data-consent=pending] should reserve it').toMatch(
      /\[data-consent='pending'\][^}]*--consent-bar-h:\s*var\(--consent-bar-reserved\)/
    );
    expect(css, '.cookie-consent should be floored by the same variable').toMatch(
      /\.cookie-consent\s*\{[^}]*min-height:\s*var\(--consent-bar-reserved\)/
    );
  });
});
