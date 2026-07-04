import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { translations } from '@/lib/i18n/translations';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';

// Auth state is swapped per test: while loading (= the SSR pass) the static
// shell must render so globals.css can show it pre-paint for returning
// signed-in visitors (html[data-auth="1"]); resolved-anon renders nothing.
const authState = { user: null as { uid: string } | null, loading: true };
const faceUpState = { ids: new Set<string>() };
vi.mock('@/lib/auth', () => ({ useAuth: () => authState }));
vi.mock('@/lib/firebase/useOwnedEntitlements', () => ({ useOwnedEntitlements: () => null }));
vi.mock('@/lib/map', () => ({
  useMapData: () => ({ restaurants: [], mustEats: [], revealedMustEatIds: new Set<string>() }),
  useUnlockedMustEats: () => ({ unlockedIds: new Set<string>() }),
  resolveUnlockedMustEatIds: () => faceUpState.ids,
}));
vi.mock('@/lib/map/useFavorites', () => ({ useFavorites: () => ({ favorites: [] }) }));
vi.mock('@/app/components/MapIntentLink', () => ({
  default: ({
    href,
    rel,
    className,
    children,
  }: {
    href: string;
    rel?: string;
    className?: string;
    children: ReactNode;
  }) => (
    <a href={href} rel={rel} className={className}>
      {children}
    </a>
  ),
}));

import HubDeineWelt from '@/app/components/HubDeineWelt';

const initialMapData = {
  restaurants: [],
  mustEats: [],
  revealedMustEatIds: [],
} as unknown as InitialMapData;

const collectionMapData = {
  restaurants: [
    {
      _id: 'r1',
      _createdAt: '2026-01-01',
      name: 'Test Spot',
      slug: 'test-spot',
      isClosed: false,
      lat: 52.5,
      lng: 13.4,
      photo: '/pics/restaurant/test.webp',
      mustEatCount: 2,
    },
  ],
  mustEats: [
    {
      _id: 'me-open',
      dish: 'Open Dish',
      image: '/pics/musteat/open.webp',
      restaurant: {
        _id: 'r1',
        name: 'Test Spot',
        slug: 'test-spot',
        lat: 52.5,
        lng: 13.4,
      },
    },
    {
      _id: 'me-covered',
      restaurant: {
        _id: 'r1',
        name: 'Test Spot',
        slug: 'test-spot',
        lat: 52.5,
        lng: 13.4,
      },
    },
  ],
  revealedMustEatIds: [],
} as unknown as InitialMapData;

function render(data: InitialMapData = initialMapData) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={translations.de} timeZone="Europe/Berlin">
      <HubDeineWelt initialMapData={data} />
    </NextIntlClientProvider>
  );
}

describe('HubDeineWelt', () => {
  beforeEach(() => {
    authState.user = null;
    authState.loading = true;
    faceUpState.ids = new Set<string>();
  });

  it('SSRs the launcher shell with the data-auth-only hook while auth is loading', () => {
    const html = render();
    expect(html).toContain('data-auth-only');
    // Greeting kicker and hero headline are the homeV2 logged-in hero's copy.
    expect(html).toContain('Hey');
    expect(html).toContain('Deine Map wartet');
    // The collection-progress line and the district picker are gone.
    expect(html).not.toContain('auf deiner Map');
    expect(html).not.toContain('Bezirk wählen');
    expect(html).not.toContain('Standort aktivieren');
    // The two quick actions live in the hero.
    expect(html).toContain('Profil');
    expect(html).toContain('Map öffnen');
    // Both visual rail sections still render (labels are always present).
    expect(html).toContain('Gespeichert');
    expect(html).toContain('Must Eats');
    // Counts/subtext are not shown on the home collection rails.
    expect(html).not.toContain('Noch keine');
    expect(html).not.toContain('Schon offen');
    // Deep links into the noindex map/profile routes must carry nofollow —
    // this markup now ships in the indexed SSR HTML of "/".
    expect(html).toContain('rel="nofollow"');
  });

  it('renders nothing once auth resolves to logged-out', () => {
    authState.loading = false;
    expect(render()).toBe('');
  });

  it('greets a resolved user by first name and shows the hero headline', () => {
    authState.loading = false;
    authState.user = { uid: 'u1', displayName: 'Ersan Tester' } as never;
    const html = render();
    // Greeting kicker shows first name.
    expect(html).toContain('Hey Ersan');
    // Hero headline is always present for signed-in users.
    expect(html).toContain('Deine Map wartet');
  });

  it('links collection cards to their profile sections and includes covered Must Eats', () => {
    faceUpState.ids = new Set(['me-open']);
    const html = render(collectionMapData);

    expect(html).toContain('href="/profile#profile-panel-spots"');
    expect(html).toContain('href="/profile#profile-panel-must-eats"');
    expect(html).toContain('%2Fpics%2Fmusteat%2Fopen.webp');
    expect(html).toContain('/pics/card-back.webp');
  });
});
