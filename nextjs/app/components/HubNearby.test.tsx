// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render as renderClient, screen, waitFor } from '@testing-library/react';
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

// MapIntentLink uses useRouter from next-intl — render as a plain anchor
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
    children?: ReactNode;
  }) => (
    <a href={href} rel={rel} className={className}>
      {children}
    </a>
  ),
}));

import HubNearby from '@/app/components/HubNearby';

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

function render(initialMapData: InitialMapData = mapData(), mode?: 'guest' | 'auth') {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={translations.de} timeZone="Europe/Berlin">
      <HubNearby initialMapData={initialMapData} mode={mode} />
    </NextIntlClientProvider>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────
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

  it('renders the section header "Um dich herum"', () => {
    const html = render(mapData([restaurant()]));
    expect(html).toContain('Um dich herum');
  });

  it('renders a spot link to /map?r=<slug>', () => {
    const html = render(mapData([restaurant()]));
    expect(html).toContain('href="/map?r=bar-basta"');
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

    renderClient(
      <NextIntlClientProvider locale="de" messages={translations.de} timeZone="Europe/Berlin">
        <HubNearby initialMapData={mapData([restaurant()])} />
      </NextIntlClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mein Standort verwenden' }));

    await waitFor(() => {
      expect(screen.getByText('Standort sitzt. Berlin sortiert sich um dich herum.')).toBeTruthy();
    });
  });
});
