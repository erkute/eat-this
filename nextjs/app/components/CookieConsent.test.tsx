// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const analytics = vi.hoisted(() => ({
  load: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  loadAnalytics: analytics.load,
  trackEvent: vi.fn(),
  getAnalyticsPageLocation: () => ({ pageLocation: 'https://x/', pagePath: '/' }),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    lang: 'de',
    t: (key: string) =>
      ({
        'cookie.title': 'Dürfen wir mitzählen?',
        'cookie.text': 'Cookie-Text',
        'cookie.moreInfo': 'Was genau wird gespeichert?',
        'cookie.decline': 'Nein, danke',
        'cookie.accept': 'Ja, gerne',
        'footer.datenschutz': 'Datenschutz',
        'burger.impressum': 'Impressum',
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

const gate = () => screen.queryByRole('dialog', { name: 'Dürfen wir mitzählen?' });

/** The gate mounts at once but transitions in over two frames. */
function openGate() {
  return waitFor(() => {
    expect(document.documentElement.getAttribute('data-consent-gate')).toBe('open');
  });
}

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
    clearCookies();
    document.documentElement.removeAttribute('data-consent-gate');
    analytics.load.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it.each(['accepted', 'declined'])('honours a %s choice already in the cookie', (choice) => {
    document.cookie = `${CONSENT_COOKIE}=${choice}; Path=/`;

    render(<CookieConsent />);

    expect(gate()).toBeNull();
    expect(document.documentElement.getAttribute('data-consent-gate')).toBeNull();
    expect(analytics.load).toHaveBeenCalledTimes(choice === 'accepted' ? 1 : 0);
  });

  /* The migration is what keeps the deploy quiet: everyone who had already
   * answered would otherwise be asked again, because the answer used to live
   * in localStorage and the cookie is what is read now. */
  it.each(['accepted', 'declined'])('migrates a %s choice out of localStorage, once', (choice) => {
    localStorage.setItem('cookieConsent', choice);

    render(<CookieConsent />);

    expect(gate()).toBeNull();
    expect(readConsent(), 'the answer should now be in the cookie').toBe(choice);
    expect(localStorage.getItem('cookieConsent'), 'the old key should be gone').toBeNull();
    expect(analytics.load).toHaveBeenCalledTimes(choice === 'accepted' ? 1 : 0);
  });

  it('asks an undecided visitor immediately and locks the page behind it', async () => {
    render(<CookieConsent />);

    expect(gate(), 'the gate should be up on mount, not on a timer').not.toBeNull();
    expect(gate()?.getAttribute('aria-modal')).toBe('true');
    await openGate();
  });

  /* The whole point of the redesign: the question cannot be walked away from.
   * If any of these start dismissing it, we are back to counting a fraction of
   * the traffic. */
  it('cannot be dismissed except by answering', async () => {
    const { container } = render(<CookieConsent />);
    await openGate();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(gate(), 'Escape must not close the gate').not.toBeNull();

    fireEvent.mouseDown(container.querySelector('.cookie-scrim') as Element);
    fireEvent.click(container.querySelector('.cookie-scrim') as Element);
    expect(gate(), 'the scrim must not be a dismiss target').not.toBeNull();

    expect(
      screen.queryByRole('button', { name: /schließen|close|×/i }),
      'no close button — the two answers are the only way out'
    ).toBeNull();
    expect(readConsent(), 'nothing may be written without an answer').toBeNull();
    expect(document.documentElement.getAttribute('data-consent-gate')).toBe('open');
  });

  /* The gate is over everything, so these two have to be reachable from inside
   * it — otherwise answering is the price of reading the privacy policy, which
   * is the exact pressure that makes the consent worthless. */
  it('links to the privacy policy and the imprint without asking for an answer', async () => {
    render(<CookieConsent />);
    await openGate();

    expect(screen.getByRole('link', { name: 'Datenschutz' }).getAttribute('href')).toBe(
      '/datenschutz'
    );
    expect(screen.getByRole('link', { name: 'Impressum' }).getAttribute('href')).toBe('/impressum');
  });

  it('closes Escape on the details panel without closing the gate', async () => {
    render(<CookieConsent />);
    await openGate();

    const trigger = () => screen.getByRole('button', { name: 'Was genau wird gespeichert?' });
    fireEvent.click(trigger());
    expect(trigger().getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(gate()).not.toBeNull();
  });

  it('writes the cookie and unlocks the page when the user accepts', async () => {
    render(<CookieConsent />);
    await openGate();

    fireEvent.click(screen.getByRole('button', { name: 'Ja, gerne' }));

    expect(readConsent()).toBe('accepted');
    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-consent-gate')).toBeNull();
    });
  });

  it('writes the cookie and loads nothing when the user declines', async () => {
    render(<CookieConsent />);
    await openGate();

    fireEvent.click(screen.getByRole('button', { name: 'Nein, danke' }));

    expect(readConsent()).toBe('declined');
    expect(analytics.load).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-consent-gate')).toBeNull();
    });
  });

  /* Withdrawing has to be as easy as granting — the footer link fires this. */
  it('reopens on the cookie-settings event and clears the stored answer', async () => {
    document.cookie = `${CONSENT_COOKIE}=accepted; Path=/`;
    render(<CookieConsent />);
    expect(gate()).toBeNull();

    fireEvent(window, new Event('eatthis:open-cookie-settings'));

    await waitFor(() => expect(gate()).not.toBeNull());
    expect(readConsent(), 'the old answer should be cleared while re-asking').toBeNull();
  });
});
