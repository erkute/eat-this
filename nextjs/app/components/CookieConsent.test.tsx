// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
        'cookie.title': 'Cookies',
        'cookie.text': 'Cookie-Text',
        'cookie.moreInfo': 'Details anzeigen',
        'cookie.lessInfo': 'Details ausblenden',
        'cookie.decline': 'Ablehnen',
        'cookie.accept': 'Akzeptieren',
        'footer.datenschutz': 'Datenschutz',
        'burger.impressum': 'Impressum',
      })[key] ?? key,
  }),
}));

import CookieConsent from './CookieConsent';
import { CONSENT_COOKIE, CONSENT_VERSION, readConsent } from '@/lib/consent';
import { CONSENT_FOCUSABLE } from '@/lib/consentBootstrap';

function clearCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
}

const gate = () => screen.queryByRole('dialog', { name: 'Cookies' });

/** The native entrance keeps the question usable as soon as it opens. */
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

    fireEvent.click(screen.getByRole('button', { name: 'Details anzeigen' }));
    const open = screen.getByRole('button', { name: 'Details ausblenden' });
    expect(open.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(document, { key: 'Escape' });

    const closed = screen.getByRole('button', { name: 'Details anzeigen' });
    expect(closed.getAttribute('aria-expanded')).toBe('false');
    expect(gate()).not.toBeNull();
  });

  it('writes the cookie and unlocks the page when the user accepts', async () => {
    render(<CookieConsent />);
    await openGate();

    fireEvent.click(screen.getByRole('button', { name: 'Akzeptieren' }));

    expect(readConsent()).toBe('accepted');
    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-consent-gate')).toBeNull();
    });
  });

  it('writes the cookie and loads nothing when the user declines', async () => {
    render(<CookieConsent />);
    await openGate();

    fireEvent.click(screen.getByRole('button', { name: 'Ablehnen' }));

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

  it.each(['Akzeptieren', 'Ablehnen'])('dismisses expanded details without showing the compact banner after %s', async (answer) => {
    render(<CookieConsent />);
    await openGate();
    fireEvent.click(screen.getByRole('button', { name: 'Details anzeigen' }));
    expect(document.getElementById('cookieInfoPanel')).not.toBeNull();
    vi.useFakeTimers();

    fireEvent.click(screen.getByRole('button', { name: answer }));

    const closingGate = document.getElementById('cookieConsent');
    if (closingGate) expect(closingGate.classList.contains('expanded')).toBe(true);
    act(() => vi.advanceTimersByTime(600));
    expect(gate()).toBeNull();
  });

  it('prerenders the initially hidden question without waiting for hydration', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server');

    const html = renderToStaticMarkup(<CookieConsent />);
    expect(html).toContain('class="cookie-gate cookie-bootstrap"');
    expect(html).toContain('id="cookieConsent"');
    // Actual visibility for saved answers is covered before app JS loads in
    // cookie-first-paint.spec.ts; jsdom does not apply the bootstrap CSS.
  });
});

describe('CookieConsent — der Detailbereich nennt die eigene Zählung', () => {
  /**
   * Im Kurztext hat der Zähler nichts verloren: über ihn wird nicht
   * abgestimmt. Verschweigen darf ihn der Dialog aber auch nicht — bis
   * Version 3 stand dort „Dürfen wir mitzählen?", während `/api/count` längst
   * jeden Besucher zählte. Wer ablehnte, hielt sich für nicht gezählt.
   */
  it('erklärt unter „Details anzeigen“, dass ohne Cookie weitergezählt wird', async () => {
    render(<CookieConsent />);
    await openGate();

    fireEvent.click(screen.getByRole('button', { name: 'Details anzeigen' }));

    const panel = document.getElementById('cookieInfoPanel');
    expect(panel?.textContent).toMatch(/Läuft immer/);
    expect(panel?.textContent).toMatch(/läuft auch weiter, wenn du unten .?Ablehnen.? wählst/);
    // Und die entscheidende Eigenschaft, die ihn einwilligungsfrei macht.
    expect(panel?.textContent).toMatch(/kein Cookie bei dir/);
  });
});

describe('CookieConsent — die Detailzeilen sind mit der Tastatur erreichbar', () => {
  /** Der Dialog fängt Tab selbst ab und läuft nur durch CONSENT_FOCUSABLE. */
  it('nimmt die aufklappbaren Zeilen in den Tab-Lauf auf', async () => {
    render(<CookieConsent />);
    await openGate();

    fireEvent.click(screen.getByRole('button', { name: 'Details anzeigen' }));

    const rows = document.querySelectorAll('#cookieInfoPanel summary');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.matches(CONSENT_FOCUSABLE)).toBe(true);
  });
});

/* Auf der Startseite wartet die Frage auf Remy und die aufgedeckten Karten. */
describe('CookieConsent während des Startseiten-Auftritts', () => {
  beforeEach(() => {
    clearCookies();
    document.documentElement.removeAttribute('data-consent-gate');
  });
  afterEach(() => {
    document.documentElement.removeAttribute('data-hero-intro');
    document.documentElement.removeAttribute('data-hero-cards');
    cleanup();
    vi.useRealTimers();
  });

  it('fragt erst, wenn der Auftritt vorbei ist', async () => {
    document.documentElement.setAttribute('data-hero-intro', '');
    document.documentElement.setAttribute('data-hero-cards', '');
    render(<CookieConsent />);
    expect(document.querySelector('.cookie-gate.show'), 'nicht über dem schiebenden Remy').toBeNull();

    document.documentElement.removeAttribute('data-hero-intro');
    await act(async () => {});
    expect(document.querySelector('.cookie-gate.show'), 'nicht über den drehenden Karten').toBeNull();
    expect(document.documentElement.hasAttribute('data-consent-gate')).toBe(false);

    document.documentElement.removeAttribute('data-hero-cards');
    await waitFor(() => expect(gate()).not.toBeNull());
    await openGate();
  });

  it('fragt spätestens nach 15 s, falls der Auftritt hängt', async () => {
    vi.useFakeTimers();
    document.documentElement.setAttribute('data-hero-cards', '');
    render(<CookieConsent />);
    vi.advanceTimersByTime(14_999);
    expect(document.querySelector('.cookie-gate.show')).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(gate()).not.toBeNull();
  });
});
