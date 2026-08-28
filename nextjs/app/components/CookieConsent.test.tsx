// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const analytics = vi.hoisted(() => ({
  load: vi.fn(),
  count: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  loadAnalytics: analytics.load,
  trackEvent: vi.fn(),
  countEvent: analytics.count,
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
import { CONSENT_COOKIE, CONSENT_VERSION, readConsent } from '@/lib/consent';

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
    document.cookie = `${CONSENT_COOKIE}=${choice}.${CONSENT_VERSION}; Path=/`;

    render(<CookieConsent />);

    expect(gate()).toBeNull();
    expect(document.documentElement.getAttribute('data-consent-gate')).toBeNull();
    expect(analytics.load).toHaveBeenCalledTimes(choice === 'accepted' ? 1 : 0);
  });

  /* An answer to an older version of the question is not an answer to this
   * one. Art. 7(1) asks what someone agreed to, so a stale version has to send
   * them back through the dialog rather than quietly counting as a yes. */
  it.each(['accepted', 'declined'])(
    're-asks when the stored %s answer is an old version',
    (choice) => {
      document.cookie = `${CONSENT_COOKIE}=${choice}.${CONSENT_VERSION - 1}; Path=/`;

      render(<CookieConsent />);

      expect(gate(), 'a stale version should reopen the dialog').not.toBeNull();
      expect(readConsent()).toBeNull();
      expect(analytics.load, 'a stale yes must not load analytics').not.toHaveBeenCalled();
    }
  );

  it('ignores an answer that carries no version at all', () => {
    document.cookie = `${CONSENT_COOKIE}=accepted; Path=/`;

    render(<CookieConsent />);

    expect(gate()).not.toBeNull();
    expect(analytics.load).not.toHaveBeenCalled();
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
    document.cookie = `${CONSENT_COOKIE}=accepted.${CONSENT_VERSION}; Path=/`;
    render(<CookieConsent />);
    expect(gate()).toBeNull();

    fireEvent(window, new Event('eatthis:open-cookie-settings'));

    await waitFor(() => expect(gate()).not.toBeNull());
    expect(readConsent(), 'the old answer should be cleared while re-asking').toBeNull();
  });

  /* The gate must not exist in the server HTML. The answer lives in a cookie
   * this component can only read after mounting, so anything rendered server-
   * side is rendered for everyone — and .cookie-consent is a solid panel that
   * without .show is merely transform-offset, not hidden. Rendering it on the
   * server therefore painted the dialog for one frame on every page load, for
   * visitors who had long since answered. An assertion on the client render
   * cannot catch that: RTL flushes effects, so the gate is already gone by the
   * time the test looks. Only the server output shows it. */
  it('renders nothing on the server, so no visitor gets a flash of the dialog', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server');

    expect(renderToStaticMarkup(<CookieConsent />)).toBe('');
  });
});
