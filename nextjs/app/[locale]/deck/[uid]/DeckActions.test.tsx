// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authState = { user: null as { uid: string } | null };
const openLogin = vi.fn();

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
  useLoginModal: () => ({ open: openLogin }),
}));
vi.mock('next-intl', () => ({
  useLocale: () => 'de',
  useTranslations: () => (key: string) => key,
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

import DeckActions from './DeckActions';

const DECK_UID = 'Z2IJ8CJsEeQVlV5X4TiwhaOE7423';
const FRIEND_UID = 'Fr1endUid00000000000000000000';

/* Der Ausgang des geteilten Decks. Fuer den Freund ein Weg — auf die Map —,
   fuer den Besitzer der Teilen-Knopf. */
describe('DeckActions', () => {
  beforeEach(() => {
    authState.user = null;
    openLogin.mockReset();
  });
  afterEach(cleanup);

  it('schickt Gaeste auf die Map und bietet die Anmeldung leise daneben an', () => {
    render(<DeckActions uid={DECK_UID} />);

    expect(screen.getByRole('link', { name: 'toMap' }).getAttribute('href')).toBe('/map');
    fireEvent.click(screen.getByRole('button', { name: 'signIn' }));
    expect(openLogin).toHaveBeenCalledTimes(1);
  });

  it('zeigt Angemeldeten den Weg zur Map, aber keine Anmeldung', () => {
    authState.user = { uid: FRIEND_UID };
    render(<DeckActions uid={DECK_UID} />);

    expect(screen.getByRole('link', { name: 'toMap' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'signIn' })).toBeNull();
  });

  /* Der „Ansehen"-Link im Profil fuehrt den Besitzer hierher. Bis zum
     24.09.2026 bat ihn die Seite dann, „zurueck zu deinem eigenen Deck" zu
     gehen — er stand schon darauf. */
  it('gibt dem Besitzer Teilen, mit ?ref auf sein eigenes Deck', () => {
    authState.user = { uid: DECK_UID };
    render(<DeckActions uid={DECK_UID} />);

    const share = screen.getByRole('button', { name: 'inviteCta' });
    expect(share.getAttribute('data-url')).toMatch(
      new RegExp(`/deck/${DECK_UID}\\?ref=${DECK_UID}$`)
    );
    expect(screen.queryByRole('button', { name: 'signIn' })).toBeNull();
  });
});
