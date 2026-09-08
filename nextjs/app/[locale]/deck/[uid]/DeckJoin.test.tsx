// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendLink = vi.fn();
const authState = { user: null as { uid: string } | null };
const magicState = { state: 'idle' as string, errorMessage: '' };

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
  useMagicLink: () => ({ sendLink, reset: vi.fn(), ...magicState }),
}));
vi.mock('next-intl', () => ({
  useLocale: () => 'de',
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    values?.name ? `${key}:${values.name}` : key,
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import DeckJoin from './DeckJoin';

/* Der Ausgang des geteilten Decks ist der einzige Kanal, ueber den jemand
   ohne Werbebudget zu Eat This kommt. Bis zum 06.09.2026 war er ein Link auf
   die Startseite; wer ihn wieder dorthin zeigen laesst, macht aus einer
   Anmeldung zwei Seitenwechsel. */
describe('DeckJoin', () => {
  beforeEach(() => {
    sendLink.mockClear();
    authState.user = null;
    magicState.state = 'idle';
    magicState.errorMessage = '';
  });

  it('schickt den Magic Link von der Seite aus, ohne Umweg', () => {
    render(<DeckJoin name="Ersan" />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' hallo@example.com ' } });
    fireEvent.click(screen.getByRole('button', { name: 'joinCta' }));

    expect(sendLink).toHaveBeenCalledWith('hallo@example.com', expect.any(String));
  });

  /* Ohne Continue-URL nimmt die Route ihren Fallback, die Startseite — und
     das Deck, das den Besuch ausgeloest hat, ist nach der Anmeldung weg und
     ueber die Startseite nicht wiederzufinden. */
  it('nimmt den Rueckweg zu diesem Deck mit', () => {
    window.history.replaceState({}, '', '/deck/Z2IJ8CJsAbCdEfGhIjKlMnOpQr01?ref=abc');
    render(<DeckJoin name="Ersan" />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hallo@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'joinCta' }));

    expect(sendLink).toHaveBeenCalledWith(
      'hallo@example.com',
      `${window.location.origin}/deck/Z2IJ8CJsAbCdEfGhIjKlMnOpQr01?ref=abc`
    );
  });

  /* Eine Adresse ohne @ wuerde als Mail rausgehen und nie ankommen — der
     Absender waerte auf etwas, das nie kommt. */
  it('haelt eine kaputte Adresse zurueck und sagt warum', () => {
    render(<DeckJoin name="Ersan" />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hallo' } });
    fireEvent.click(screen.getByRole('button', { name: 'joinCta' }));

    expect(sendLink).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('joinInvalidEmail');
  });

  it('nennt den Namen des Decks, wenn es einen hat', () => {
    render(<DeckJoin name="Ersan" />);
    expect(screen.getByText('joinLead:Ersan')).toBeTruthy();
  });

  it('kommt ohne Namen aus', () => {
    render(<DeckJoin name={null} />);
    expect(screen.getByText('joinLeadAnon')).toBeTruthy();
  });

  /* Ohne diesen Ausgang endet die Seite fuer jeden, der sich noch nicht
     anmelden will, in einer Sackgasse. */
  it('laesst auch weiter, wer sich noch nicht anmelden will', () => {
    render(<DeckJoin name="Ersan" />);
    expect(screen.getByRole('link', { name: 'browse' }).getAttribute('href')).toBe('/map');
  });

  /* Angemeldet gibt es nichts anzumelden — ein zweites Anmeldeformular vor
     einem angemeldeten Nutzer ist eine Sackgasse mit Feld. */
  it('schickt Angemeldete zu ihrem eigenen Deck statt zur Anmeldung', () => {
    authState.user = { uid: 'Z2IJ8CJsEeQVlV5X4TiwhaOE7423' };

    render(<DeckJoin name="Ersan" />);

    expect(screen.getByRole('link', { name: 'ctaIn' }).getAttribute('href')).toBe('/profile');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  /* Der Weg zur Map hing zuerst nur am Anmeldeblock. Ein Angemeldeter sah
     damit eine Seite ohne Anmeldung UND ohne Ausgang zur Map — die Seite
     endete fuer ihn bei einem einzigen Knopf. */
  it('laesst in BEIDEN Zustaenden zur Map', () => {
    render(<DeckJoin name="Ersan" />);
    expect(screen.getByRole('link', { name: 'browse' }).getAttribute('href')).toBe('/map');

    cleanup();
    authState.user = { uid: 'Z2IJ8CJsEeQVlV5X4TiwhaOE7423' };
    render(<DeckJoin name="Ersan" />);
    expect(screen.getByRole('link', { name: 'browse' }).getAttribute('href')).toBe('/map');
  });
});
