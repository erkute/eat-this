// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendLink = vi.fn();
const authState = { user: null as { uid: string } | null };
const magicState = { state: 'idle' as string, errorMessage: '' };
const googleState = vi.hoisted(() => ({
  start: vi.fn(),
  prepare: vi.fn(),
  phase: 'idle' as 'idle' | 'busy' | 'done' | 'leaving',
  note: null as 'cancelled' | 'blocked' | 'failed' | null,
  noteKey: null as string | null,
  onSettled: undefined as (() => void) | undefined,
}));
const announceSignIn = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
  useMagicLink: () => ({ sendLink, reset: vi.fn(), ...magicState }),
  useGoogleSignIn: (options: { onSettled?: () => void } = {}) => {
    googleState.onSettled = options.onSettled;
    return googleState;
  },
}));
vi.mock('@/lib/auth/signInArrival', () => ({ announceSignIn }));
/* Der Wartescreen braucht next-intl; hier zaehlt nur, ob er da ist. */
vi.mock('@/app/components/AuthScreen', () => ({
  default: ({ leaving }: { leaving?: boolean }) => (
    <div data-testid="auth-screen" data-leaving={leaving ? '1' : '0'} />
  ),
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

vi.mock('@/app/components/ShareButton', () => ({
  default: ({ label, url }: { label: string; url: string }) => (
    <button type="button" data-url={url}>
      {label}
    </button>
  ),
}));

import DeckJoin from './DeckJoin';

const DECK_UID = 'Z2IJ8CJsEeQVlV5X4TiwhaOE7423';
const FRIEND_UID = 'Fr1endUid00000000000000000000';

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
    googleState.start.mockReset();
    googleState.prepare.mockReset();
    googleState.phase = 'idle';
    googleState.note = null;
    googleState.noteKey = null;
    announceSignIn.mockReset();
  });

  it('schickt den Magic Link von der Seite aus, ohne Umweg', () => {
    render(<DeckJoin uid={DECK_UID} name="Ersan" />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' hallo@example.com ' } });
    fireEvent.click(screen.getByRole('button', { name: 'sendLinkBtn' }));

    expect(sendLink).toHaveBeenCalledWith('hallo@example.com', expect.any(String));
  });

  /* Ohne Continue-URL nimmt die Route ihren Fallback, die Startseite — und
     das Deck, das den Besuch ausgeloest hat, ist nach der Anmeldung weg und
     ueber die Startseite nicht wiederzufinden. */
  it('nimmt den Rueckweg zu diesem Deck mit', () => {
    window.history.replaceState({}, '', '/deck/Z2IJ8CJsAbCdEfGhIjKlMnOpQr01?ref=abc');
    render(<DeckJoin uid={DECK_UID} name="Ersan" />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hallo@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'sendLinkBtn' }));

    expect(sendLink).toHaveBeenCalledWith(
      'hallo@example.com',
      `${window.location.origin}/deck/Z2IJ8CJsAbCdEfGhIjKlMnOpQr01?ref=abc`
    );
  });

  /* Eine Adresse ohne @ wuerde als Mail rausgehen und nie ankommen — der
     Absender waerte auf etwas, das nie kommt. */
  it('haelt eine kaputte Adresse zurueck und sagt warum', () => {
    render(<DeckJoin uid={DECK_UID} name="Ersan" />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hallo' } });
    fireEvent.click(screen.getByRole('button', { name: 'sendLinkBtn' }));

    expect(sendLink).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('invalidEmail');
  });

  it('nennt den Namen des Decks, wenn es einen hat', () => {
    render(<DeckJoin uid={DECK_UID} name="Ersan" />);
    expect(screen.getByText('joinLead:Ersan')).toBeTruthy();
  });

  it('kommt ohne Namen aus', () => {
    render(<DeckJoin uid={DECK_UID} name={null} />);
    expect(screen.getByText('joinLeadAnon')).toBeTruthy();
  });

  /* Ohne diesen Ausgang endet die Seite fuer jeden, der sich noch nicht
     anmelden will, in einer Sackgasse. */
  it('laesst auch weiter, wer sich noch nicht anmelden will', () => {
    render(<DeckJoin uid={DECK_UID} name="Ersan" />);
    expect(screen.getByRole('link', { name: 'browse' }).getAttribute('href')).toBe('/map');
  });

  /* Angemeldet gibt es nichts anzumelden — ein zweites Anmeldeformular vor
     einem angemeldeten Nutzer ist eine Sackgasse mit Feld. */
  it('schickt Angemeldete zu ihrem eigenen Deck statt zur Anmeldung', () => {
    authState.user = { uid: FRIEND_UID };

    render(<DeckJoin uid={DECK_UID} name="Ersan" />);

    expect(screen.getByRole('link', { name: 'ctaIn' }).getAttribute('href')).toBe('/profile');
    // Die Tafel bleibt fuer den Wartescreen gemountet — aber verborgen.
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  /* Der „Ansehen"-Link im Profil fuehrt den Besitzer hierher. Bis zum
     24.09.2026 bat ihn die Seite dann, „zurueck zu deinem eigenen Deck" zu
     gehen — er stand schon darauf. */
  it('zeigt dem Besitzer Teilen statt „zurueck zum eigenen Deck"', () => {
    authState.user = { uid: DECK_UID };

    render(<DeckJoin uid={DECK_UID} name="Ersan" />);

    expect(screen.getByRole('heading', { name: 'ownHeading' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'ctaIn' })).toBeNull();
    const share = screen.getByRole('button', { name: 'inviteCta' });
    expect(share.getAttribute('data-url')).toMatch(
      new RegExp(`/deck/${DECK_UID}\\?ref=${DECK_UID}$`)
    );
  });

  /* Der Weg zur Map hing zuerst nur am Anmeldeblock. Ein Angemeldeter sah
     damit eine Seite ohne Anmeldung UND ohne Ausgang zur Map — die Seite
     endete fuer ihn bei einem einzigen Knopf. */
  it('laesst in BEIDEN Zustaenden zur Map', () => {
    render(<DeckJoin uid={DECK_UID} name="Ersan" />);
    expect(screen.getByRole('link', { name: 'browse' }).getAttribute('href')).toBe('/map');

    cleanup();
    authState.user = { uid: 'Z2IJ8CJsEeQVlV5X4TiwhaOE7423' };
    render(<DeckJoin uid={DECK_UID} name="Ersan" />);
    expect(screen.getByRole('link', { name: 'browse' }).getAttribute('href')).toBe('/map');
  });

  /* Bis 21.09.2026 bot die Tafel nur die Mail an, die Startseite seit
     07.09. auch Google. Wer ueber ein geteiltes Deck kommt, ist der Gast,
     den ein zweiter Weg am ehesten haelt. */
  it('bietet Google neben der Mail an und waermt erst an, wenn die Hand hingeht', () => {
    render(<DeckJoin uid={DECK_UID} name="Ersan" />);
    expect(googleState.prepare).not.toHaveBeenCalled();

    const button = screen.getByRole('button', { name: 'googleBtn' });
    fireEvent.pointerEnter(button);
    expect(googleState.prepare).toHaveBeenCalledTimes(1);
    expect(googleState.start).not.toHaveBeenCalled();

    fireEvent.click(button);
    expect(googleState.start).toHaveBeenCalledTimes(1);
  });

  it('nimmt den Google-Knopf weg, sobald der Link verschickt ist', () => {
    magicState.state = 'sent';
    render(<DeckJoin uid={DECK_UID} name="Ersan" />);
    expect(screen.queryByRole('button', { name: 'googleBtn' })).toBeNull();
  });

  /* Firebase meldet den Nutzer, waehrend die Haltezeit noch laeuft — die
     Komponente springt in den Angemeldet-Zweig. Stuende der Wartescreen nur
     im Gast-Zweig, waere er in diesem Moment schlagartig weg. */
  it('haelt den Wartescreen auch nach dem Sprung in den Angemeldet-Zweig', () => {
    googleState.phase = 'busy';
    render(<DeckJoin uid={DECK_UID} name="Ersan" />);
    expect(screen.getByTestId('auth-screen')).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'googleBtn' }).disabled).toBe(
      true
    );

    cleanup();
    googleState.phase = 'done';
    authState.user = { uid: 'Z2IJ8CJsEeQVlV5X4TiwhaOE7423' };
    render(<DeckJoin uid={DECK_UID} name="Ersan" />);
    expect(screen.getByTestId('auth-screen')).toBeTruthy();
  });

  /* Nie Toast UND Pack-Einblendung: was gesagt wird, entscheidet
     signInArrival, nicht diese Tafel. */
  it('meldet die Anmeldung ueber announceSignIn, nicht direkt als Toast', () => {
    const showNotification = vi.fn();
    window.showNotification = showNotification;
    render(<DeckJoin uid={DECK_UID} name="Ersan" />);

    googleState.onSettled?.();
    expect(announceSignIn).toHaveBeenCalledTimes(1);
    expect(showNotification).not.toHaveBeenCalled();

    announceSignIn.mock.calls[0][0]();
    expect(showNotification).toHaveBeenCalledWith('signedIn');
  });

  it('sagt ein selbst zugeklicktes Google-Fenster leise an, ein geblocktes laut', () => {
    googleState.note = 'cancelled';
    googleState.noteKey = 'auth.googleCancelled';
    render(<DeckJoin uid={DECK_UID} name="Ersan" />);
    expect(screen.getByRole('status').textContent).toBe('auth.googleCancelled');

    cleanup();
    googleState.note = 'blocked';
    googleState.noteKey = 'auth.errGooglePopupBlocked';
    render(<DeckJoin uid={DECK_UID} name="Ersan" />);
    expect(screen.getByRole('alert').textContent).toBe('auth.errGooglePopupBlocked');
  });
});
