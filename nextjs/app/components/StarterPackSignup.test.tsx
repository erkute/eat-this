// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { getCatalogMessages } from '@/lib/i18n/translations';

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
      messages={getCatalogMessages(locale, 100)}
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

  /* Derselbe Aufbau wie das Modal: das Pack, eine eigene Ueberschrift, das Formular. */
  it('zeigt das Pack mit der Ueberschrift der Startseite', () => {
    const html = renderToStaticMarkup(tafel());
    expect(html).toContain('starter-pack-front.webp');
    expect(html).toContain('>Mach Berlin zu deiner Sammlung.</h2>');
    expect(html).toContain('Zum Start erwarten dich 20 weitere Must Eats.');
    expect(html).toContain('type="email"');
    expect(html).toContain('Mit Google anmelden');
    expect(html).not.toContain('Anmeldung per E-Mail-Link oder mit Google.');
  });

  it('spricht Englisch unter /en', () => {
    const html = renderToStaticMarkup(tafel('en'));
    expect(html).toContain('Sign in with Google');
    expect(html).toContain('>Make Berlin your collection.</h2>');
    expect(html).toContain('To start, 20 more Must Eats are waiting for you.');
    expect(html).not.toContain('Sign in with an email link or Google.');
  });

  /* Die Tafel steht auf jeder Startseite; Google Sign-In laedt erst, wenn die
     Hand zum Knopf geht. */
  it('waermt Google nicht an, nur weil die Seite steht', () => {
    render(tafel());
    expect(google.prepare).not.toHaveBeenCalled();
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Mit Google anmelden' }));
    expect(google.prepare).toHaveBeenCalledTimes(1);
  });
});
