// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

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
}));

const copy: Record<string, string> = {
  dataLoading: 'Loading your profile',
  dataRefreshing: 'Updating your collection',
  dataError: 'Your collection could not be loaded',
  dataStale: 'Showing your last saved collection',
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
    signOut: vi.fn(),
  }),
}));
vi.mock('@/lib/map', () => ({
  useUnlockedMustEats: () => ({ unlockedIds: new Set<string>() }),
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
});

afterEach(cleanup);

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

  it('keeps cached profile content visible but clearly marks it stale', () => {
    state.mapError = 'HTTP 500';
    state.restaurants = [{ _id: 'r-1', slug: 'cached-spot', categories: [] }];

    render(<ProfileShell publicFaceUpIds={[]} />);

    expect(screen.getByRole('alert').textContent).toContain('Showing your last saved collection');
    expect(screen.getByText('Saved Spots')).toBeTruthy();
  });
});
