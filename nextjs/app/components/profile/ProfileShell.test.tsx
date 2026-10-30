// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const state = vi.hoisted(() => ({
  authLoading: false,
  user: {
    uid: 'user-1',
    email: 'food@example.com',
    displayName: 'Food Fan',
  } as { uid: string; email: string; displayName: string } | null,
  mapLoading: false,
  mapError: null as string | null,
  restaurants: [] as Array<{
    _id: string;
    slug: string;
    categories: Array<{ name: string }>;
  }>,
  refetch: vi.fn(),
  signOut: vi.fn(() => Promise.resolve()),
}));

const copy: Record<string, string> = {
  dataLoading: 'Loading your profile',
  dataError: 'Your collection could not be loaded',
  dataRetry: 'Retry',
  profileTitle: 'Profile',
  fieldName: 'Name',
  changeAvatar: 'Change',
  heroTitle: 'Your Berlin HQ',
  tabSpots: 'Spots',
  signOut: 'Sign out',
};

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => copy[key] ?? key,
}));
vi.mock('@/lib/map/useFavorites', () => ({
  useFavorites: () => ({ favorites: [], toggle: vi.fn(), loading: false }),
}));
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: state.user,
    loading: state.authLoading,
    signOut: state.signOut,
  }),
}));
vi.mock('@/lib/map', () => ({
  useUnlockedMustEats: () => ({ unlockedIds: new Set<string>(), unlockedAt: new Map() }),
  useMapData: () => ({
    restaurants: state.restaurants,
    mustEats: [],
    revealedMustEatIds: new Set<string>(),
    loading: state.mapLoading,
    error: state.mapError,
    refetch: state.refetch,
  }),
}));
vi.mock('@/lib/firebase/useUserProfile', () => ({
  defaultAvatarFromUid: () => 1,
  useUserProfile: () => ({ profile: { avatar: 1 }, setAvatar: vi.fn() }),
}));
vi.mock('./ProfileSpots', () => ({ default: () => <div>Profile spots</div> }));
/* Zieht sonst den echten UserLocationContext mit — der wirft ausserhalb
   seines Providers, und dieser Test rendert die Shell blank. */
vi.mock('./ProfileAlbum', () => ({ default: () => <div>Profile album</div> }));
vi.mock('./ProfilePacks', () => ({ default: () => <div>Profile packs</div> }));
vi.mock('./AvatarPickerModal', () => ({ default: () => null }));
vi.mock('../SiteFooter', () => ({ default: () => <footer>Footer</footer> }));

import ProfileShell from './ProfileShell';

beforeEach(() => {
  state.authLoading = false;
  state.user = { uid: 'user-1', email: 'food@example.com', displayName: 'Food Fan' };
  state.mapLoading = false;
  state.mapError = null;
  state.restaurants = [];
  state.refetch.mockReset();
  state.signOut.mockClear();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ProfileShell map-data states', () => {
  it('does not render false zero counts while the first profile payload is loading', () => {
    state.mapLoading = true;

    render(<ProfileShell publicFaceUpIds={[]} />);

    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Loading your profile');
    expect(screen.queryByText('Saved Spots')).toBeNull();
  });

  it('shows a retry action when no profile payload could be loaded', () => {
    state.mapError = 'HTTP 500';

    render(<ProfileShell publicFaceUpIds={[]} />);

    expect(screen.getByRole('alert').textContent).toContain('Your collection could not be loaded');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(state.refetch).toHaveBeenCalledOnce();
  });

  /* Der veraltete Stand meldet sich seit 04.09.2026 ueber die zentrale
     Info-Karte (`window.showNotice`), nicht mehr als Balken IM Fluss: der
     schob beim Erscheinen die ganze Seite nach unten, waehrend man sie ansah
     (Nutzer, 04.09.2026). Der Test haelt beides fest — die Meldung geht
     hinaus, und im Markup steht dafuer nichts mehr. */
  it('meldet veraltete Daten ueber die Info-Karte, nicht im Seitenfluss', () => {
    state.mapError = 'HTTP 500';
    state.restaurants = [{ _id: 'r-1', slug: 'cached-spot', categories: [] }];
    const showNotice = vi.fn();
    window.showNotice = showNotice;

    render(<ProfileShell publicFaceUpIds={[]} />);

    expect(showNotice).toHaveBeenCalledOnce();
    const notice = showNotice.mock.calls[0][0];
    /* Veraltet ist nicht kaputt: gelb, nicht rot. */
    expect(notice.tone).toBeUndefined();
    expect(notice.onDismiss).toBeTypeOf('function');
    /* Sie bleibt stehen, solange der Zustand steht — und traegt den Weg
       heraus. */
    expect(notice.duration).toBe(0);
    expect(notice.action?.label).toBe('Retry');
    notice.action.onClick();
    expect(state.refetch).toHaveBeenCalledOnce();

    expect(screen.queryByRole('alert')).toBeNull();
    // Die Seite steht trotzdem — der Deck-Reiter mit dem Album.
    expect(screen.getByText('Profile album')).toBeTruthy();
  });
});

/* Nutzer, 24.09.2026: „sollte man oben noch die Moeglichkeit haben, Tabs zu
   wechseln?" — die Seite war vier Bildschirme lang. */
describe('ProfileShell tabs', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('zeigt je Reiter nur seinen Teil und merkt ihn sich im Anker', () => {
    render(<ProfileShell publicFaceUpIds={[]} />);
    expect(screen.queryByText('Profile spots')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'tab_spots' }));
    expect(screen.getByText('Profile spots')).toBeTruthy();
    expect(screen.queryByText('Profile packs')).toBeNull();
    expect(screen.getByRole('tab', { name: 'tab_spots' }).getAttribute('aria-selected')).toBe(
      'true'
    );
    expect(window.location.hash).toBe('#spots');

    fireEvent.click(screen.getByRole('tab', { name: 'tab_packs' }));
    expect(screen.getByText('Profile packs')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'tab_deck' }));
    expect(screen.queryByText('Profile packs')).toBeNull();
    expect(window.location.hash).toBe('');
  });

  it('hat eine Hauptüberschrift', () => {
    render(<ProfileShell publicFaceUpIds={[]} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('pageTitle');
  });

  it('wechselt per Tastatur durch alle Bereiche und verknüpft Reiter mit ihrem Panel', () => {
    render(<ProfileShell publicFaceUpIds={[]} />);
    const deck = screen.getByRole('tab', { name: 'tab_deck' });
    fireEvent.keyDown(deck, { key: 'End' });
    const account = screen.getByRole('tab', { name: 'tab_account' });
    expect(document.activeElement).toBe(account);
    expect(window.location.hash).toBe('#account');
    expect(screen.getByRole('tabpanel').id).toBe(account.getAttribute('aria-controls'));
    fireEvent.keyDown(account, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(deck);
    expect(window.location.hash).toBe('');
  });

  it('oeffnet den Reiter aus dem Anker', () => {
    window.history.replaceState(null, '', '/profile#packs');
    render(<ProfileShell publicFaceUpIds={[]} />);
    expect(screen.getByText('Profile packs')).toBeTruthy();
  });
});

describe('ProfileShell sign-out', () => {
  it('starts immediately and disables the button only while the request is pending', async () => {
    let finish!: () => void;
    state.signOut.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    render(<ProfileShell publicFaceUpIds={[]} />);
    fireEvent.click(screen.getByRole('tab', { name: 'tab_account' }));
    const button = screen.getByRole<HTMLButtonElement>('button', { name: 'Sign out' });
    fireEvent.click(button);
    expect(state.signOut).toHaveBeenCalledOnce();
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(state.signOut).toHaveBeenCalledOnce();
    expect(screen.queryByText('Du wirst abgemeldet')).toBeNull();
    await act(async () => {
      finish();
    });
    expect(button.disabled).toBe(false);
  });

  it('keeps the account usable and offers retry when signing out fails', async () => {
    state.signOut.mockRejectedValueOnce(new Error('network'));
    render(<ProfileShell publicFaceUpIds={[]} />);
    fireEvent.click(screen.getByRole('tab', { name: 'tab_account' }));
    const button = screen.getByRole<HTMLButtonElement>('button', { name: 'Sign out' });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(screen.getByRole('alert').textContent).toBe('errGeneric');
    expect(button.disabled).toBe(false);
    await act(async () => {
      fireEvent.click(button);
    });
    expect(state.signOut).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
