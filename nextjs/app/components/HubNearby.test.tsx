// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  cleanup,
  fireEvent,
  render as renderClient,
  screen,
  waitFor,
} from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { translations } from '@/lib/i18n/translations';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';
import type { MapRestaurant } from '@/lib/types';

// ── Hook stubs ──────────────────────────────────────────────────────────────
// All client-side hooks are stubbed so renderToStaticMarkup works in a
// Node/vitest environment. The first client render mirrors the SSR snapshot:
// mounted = false → initialMapData is used, location = null → Mitte fallback.

const authState = { user: null as { uid: string } | null, loading: true };
vi.mock('@/lib/auth', () => ({ useAuth: () => authState }));

vi.mock('@/lib/map', () => ({
  useMapData: ({ initialMapData }: { initialMapData: InitialMapData }) => initialMapData,
}));

const locationState = {
  location: null as { lat: number; lng: number } | null,
  loading: false,
  error: null as string | null,
  request: vi.fn(() => Promise.resolve(null as { lat: number; lng: number } | null)),
};
vi.mock('@/lib/map/UserLocationContext', () => ({
  useUserLocationContext: () => locationState,
}));

vi.mock('./MapIntentLink', () => ({
  default: ({
    href,
    className,
    children,
  }: {
    href: string;
    className?: string;
    children?: ReactNode;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    className,
    children,
  }: {
    href: string;
    className?: string;
    children?: ReactNode;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import HubNearby from '@/app/components/HubNearby';
import { HomeMapDataProvider } from '@/app/components/HomeMapDataContext';

// ── Fixtures ─────────────────────────────────────────────────────────────────
const restaurant = (o: Partial<MapRestaurant> = {}): MapRestaurant => ({
  _id: 'r1',
  _createdAt: '2024-01-01',
  name: 'Bar Basta',
  slug: 'bar-basta',
  isClosed: false,
  lat: 52.52,
  lng: 13.405,
  mustEatCount: 0,
  photo: 'https://cdn.sanity.io/photo.webp',
  district: 'Mitte',
  ...o,
});

const mapData = (restaurants: MapRestaurant[] = []): InitialMapData =>
  ({
    restaurants,
    mustEats: [],
    revealedMustEatIds: [],
  }) as unknown as InitialMapData;

const tree = (initialMapData: InitialMapData, mode?: 'guest' | 'auth') => (
  <NextIntlClientProvider locale="de" messages={translations.de} timeZone="Europe/Berlin">
    <HomeMapDataProvider initialMapData={initialMapData}>
      <HubNearby mode={mode} today={TODAY} />
    </HomeMapDataProvider>
  </NextIntlClientProvider>
);

/** SSR snapshot: mounted = false, so this is always the position-unknown state. */
function render(initialMapData: InitialMapData = mapData(), mode?: 'guest' | 'auth') {
  return renderToStaticMarkup(tree(initialMapData, mode));
}

/** Mounted render — the only way to reach the located branch. */
function renderLive(initialMapData: InitialMapData = mapData()) {
  return renderClient(tree(initialMapData));
}

// ── Tests ─────────────────────────────────────────────────────────────────────
const TODAY = '2026-08-20';

describe('HubNearby', () => {
  beforeEach(() => {
    authState.loading = true;
    authState.user = null;
    locationState.location = null;
    locationState.loading = false;
    locationState.error = null;
    locationState.request = vi.fn(() => Promise.resolve(null));
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when there are no nearby restaurants', () => {
    expect(render(mapData([]))).toBe('');
  });

  it('asks for the position instead of naming a place, while it is unknown', () => {
    const html = render(mapData([restaurant()]));
    // The list is centred on Mitte, but headlining that claims a district the
    // visitor probably isn't in. Ask for the location instead of asserting one.
    expect(html).toContain('Was ist um dich?');
    expect(html).toContain('Gib deinen Standort frei');
    expect(html).not.toContain('Rund um Mitte');
    expect(html).not.toContain('Um dich herum');
  });

  it('promotes the locate button while the position is unknown', () => {
    const html = render(mapData([restaurant()]));
    expect(html).toContain('data-primary=""');
  });

  it('omits walking times while the position is unknown', () => {
    const html = render(mapData([restaurant()]));
    // The Mitte fallback would put a real number on a made-up origin.
    expect(html).not.toMatch(/\d+ Min/);
    expect(html).toContain('Mitte');
  });

  it('names the user and shows walking times once the position is known', async () => {
    locationState.location = { lat: 52.52, lng: 13.405 };
    renderLive(mapData([restaurant()]));

    await waitFor(() => {
      expect(screen.getByText('Um dich herum')).toBeTruthy();
    });
    expect(screen.getByText('1 Min · Mitte')).toBeTruthy();
  });

  it('opens the spot on the map', () => {
    const html = render(mapData([restaurant()]));
    // Every card on the home page leads back to the map — the spot is already
    // pinned there, so the map is the shorter path to what the visitor wants.
    expect(html).toContain('href="/map?r=bar-basta"');
    expect(html).not.toContain('/restaurant/');
  });

  it('renders the restaurant name', () => {
    const html = render(mapData([restaurant()]));
    expect(html).toContain('Bar Basta');
  });

  it('renders the data-hub-nearby attribute', () => {
    const html = render(mapData([restaurant()]));
    expect(html).toContain('data-hub-nearby');
  });

  it('guest mode: SSR shell stays visible for signed-in users too', () => {
    authState.loading = false;
    authState.user = { uid: 'u1' } as never;
    const html = render(mapData([restaurant()]), 'guest');
    expect(html).toContain('data-hub-nearby');
    expect(html).not.toContain('data-guest-only');
  });

  it('shows a success layer after locating succeeds', async () => {
    locationState.request = vi.fn(() => Promise.resolve({ lat: 52.5, lng: 13.4 }));

    renderLive(mapData([restaurant()]));

    fireEvent.click(screen.getByRole('button', { name: 'Mein Standort verwenden' }));

    await waitFor(() => {
      expect(screen.getByText('Standort sitzt. Berlin sortiert sich um dich herum.')).toBeTruthy();
    });
  });
});
