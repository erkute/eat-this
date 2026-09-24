// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { translations } from '@/lib/i18n/translations';

/* Das Formular selbst prueft LoginBoard.test.tsx — hier nur, was die Tafel der
   Startseite anders macht. */
const google = vi.hoisted(() => ({
  start: vi.fn(),
  prepare: vi.fn(),
  phase: 'idle',
  note: null,
  noteKey: null,
}));

vi.mock('@/lib/auth', () => ({
  useMagicLink: () => ({ sendLink: vi.fn(), reset: vi.fn(), state: 'idle', errorMessage: '' }),
  useGoogleSignIn: () => google,
}));

import StarterPackSignup from './StarterPackSignup';

function tafel(locale: 'de' | 'en' = 'de') {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={translations[locale]}
      timeZone="Europe/Berlin"
    >
      <StarterPackSignup />
    </NextIntlClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('StarterPackSignup', () => {
  it('steht unter dem Anker, den das Must-Eats-Onboarding anspringt', () => {
    const html = renderToStaticMarkup(tafel());
    expect(html).toContain('id="hub-starter"');
  });

  it('versteckt sich vor dem ersten Bild fuer Angemeldete', () => {
    expect(renderToStaticMarkup(tafel())).toContain('data-guest-only');
  });

  /* Derselbe Aufbau wie das Modal: das Pack, eine Ueberschrift, das Formular. */
  it('zeigt das Pack und traegt die Ueberschrift des Modals', () => {
    const html = renderToStaticMarkup(tafel());
    expect(html).toContain('booster_free.webp');
    expect(html).toContain('>Starter Pack</h2>');
    expect(html).toContain('20 Must Eats, überall in Berlin verteilt.');
    // Kein „Gratis"-Kicker: Geschenk-Wording will der Betreiber nicht (22.09.2026).
    expect(html).not.toMatch(/gratis|kostenlos/i);
  });

  it('spricht Englisch unter /en', () => {
    const html = renderToStaticMarkup(tafel('en'));
    expect(html).toContain('Sign in with Google');
    expect(html).toContain('20 Must Eats, spread all over Berlin.');
  });

  /* Die Tafel steht auf jeder Startseite; der Cookie-Hinweis verspricht,
     Google Sign-In lade „nur wenn du es nutzt". */
  it('waermt Google nicht an, nur weil die Seite steht', () => {
    render(tafel());
    expect(google.prepare).not.toHaveBeenCalled();
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Mit Google anmelden' }));
    expect(google.prepare).toHaveBeenCalledTimes(1);
  });
});
