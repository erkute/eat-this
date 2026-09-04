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
  heroKicker: 'Your collection',
  fieldName: 'Name',
  fieldAccount: 'Account',
  avatarKicker: 'Character',
  changeAvatar: 'Change',
  heroTitle: 'Your Berlin HQ',
  heroLine: 'Eat save repeat',
  tabSpots: 'Spots',
  tabMustEats: 'Must Eats',
  savedHeading: 'Saved Spots',
  signOut: 'Sign out',
};

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => copy[key] ?? key,
}));
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: state.user,
    loading: state.authLoading,
    signOut: state.signOut,
  }),
}));
// Der echte AuthScreen zieht ueber useTranslation den next-intl-Router mit;
// hier zaehlt nur, dass er da ist. AUTH_SCREEN_HOLD_MS bleibt echt — die
// Haltezeit ist der Gegenstand des Tests.
vi.mock('../AuthScreen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../AuthScreen')>()),
  default: ({ mode }: { mode: 'in' | 'out' }) => <div data-testid="auth-screen">{mode}</div>,
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
vi.mock('./ProfileNextMove', () => ({ default: () => <div>Next move</div> }));
vi.mock('./ProfileAlbum', () => ({ default: () => <div>Profile album</div> }));
vi.mock('./ProfilePacks', () => ({ default: () => <div>Profile packs</div> }));
vi.mock('./AvatarPickerModal', () => ({ default: () => null }));
vi.mock('../SiteFooter', () => ({ default: () => <footer>Footer</footer> }));

import ProfileShell from './ProfileShell';
import { AUTH_SCREEN_HOLD_MS } from '../AuthScreen';

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
    expect(notice.tone).toBe('warning');
    /* Sie bleibt stehen, solange der Zustand steht — und traegt den Weg
       heraus. */
    expect(notice.duration).toBe(0);
    expect(notice.action?.label).toBe('Retry');
    notice.action.onClick();
    expect(state.refetch).toHaveBeenCalledOnce();

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Saved Spots')).toBeTruthy();
  });
});

describe('ProfileShell sign-out', () => {
  /* Ohne Haltezeit war der Abmelde-Screen wieder weg, bevor man ihn gelesen
     hatte: Firebase ist in Millisekunden fertig, und dann nimmt
     ProfileAuthGuard diesen Baum samt Screen aus dem DOM (Nutzer,
     29.08.2026). Deshalb erst der Screen, dann das Abmelden. */
  it('shows the sign-out screen first and signs out only after the hold', () => {
    vi.useFakeTimers();

    render(<ProfileShell publicFaceUpIds={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(screen.getByTestId('auth-screen').textContent).toBe('out');
    expect(state.signOut).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(AUTH_SCREEN_HOLD_MS - 1);
    });
    expect(state.signOut).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(state.signOut).toHaveBeenCalledOnce();
    expect(screen.getByTestId('auth-screen')).toBeTruthy();
  });

  /* Der Screen liegt als fixed-Layer ohne Schliessweg ueber der Seite — ein
     gescheitertes Abmelden muss ihn wieder abraeumen, sonst ist man
     angemeldet, aber vom eigenen Profil ausgesperrt. */
  it('takes the screen and the parked toast back when signing out fails', async () => {
    vi.useFakeTimers();
    state.signOut.mockImplementation(() => Promise.reject(new Error('network')));

    render(<ProfileShell publicFaceUpIds={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    /* Waehrend der Haltezeit liegt noch nichts bereit — ein zwischendurch
       geschlossener Tab soll nicht "Du bist abgemeldet" nachreichen. */
    expect(sessionStorage.getItem('eatthis_toast')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_SCREEN_HOLD_MS);
    });

    expect(screen.queryByTestId('auth-screen')).toBeNull();
    expect(sessionStorage.getItem('eatthis_toast')).toBeNull();
  });
});
