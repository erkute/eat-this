import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';
import type { MapMustEat } from '@/lib/types';
import { translations } from '@/lib/i18n/translations';

// The island pulls in Firebase/auth + browser-only map context. Stub the hooks
// so the component renders in its pre-mount state (initialMapData, all
// face-down) — the data partitioning is covered by the gallery helper tests
// tests, this test targets the section shell (title + CTA href).
const openLoginModal = vi.fn();
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: null, loading: false }),
  useLoginModal: () => ({ open: openLoginModal }),
}));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/lib/map', async () => {
  const actual = await vi.importActual<typeof import('@/lib/map/unlockedMustEats')>(
    '@/lib/map/unlockedMustEats'
  );
  return {
    useMapData: ({ initialMapData }: { initialMapData: InitialMapData }) => initialMapData,
    useUnlockedMustEats: () => ({ unlockedIds: new Set<string>() }),
    // Real helper so the pre-mount face-up computation matches production.
    resolveUnlockedMustEatIds: actual.resolveUnlockedMustEatIds,
  };
});

import HubMustEatsTeaser from '@/app/components/HubMustEatsTeaser';
import { HomeMapDataProvider } from '@/app/components/HomeMapDataContext';

const me = (o: Partial<MapMustEat> = {}): MapMustEat => ({
  _id: 'm1',
  dish: 'Smash Burger',
  image: '/api/must-eat-image/m1?v=0123456789ab',
  restaurant: { _id: 'r1', name: 'Bar Basta', slug: 'bar-basta', lat: 52.5, lng: 13.4 },
  ...o,
});

/** A covered card as the server hands it over: stripCoveredMustEats keeps the
 *  id, the order and the restaurant, and withholds dish, image and price. */
const covered = (id: string, name: string): MapMustEat => ({
  _id: id,
  restaurant: { _id: `r-${id}`, name, slug: `slug-${id}`, lat: 52.5, lng: 13.4 },
});

const data = (mustEats: MapMustEat[], revealedMustEatIds: string[] = []): InitialMapData => ({
  restaurants: [],
  mustEats,
  categories: [],
  totalCount: 0,
  revealedMustEatIds,
});

/** Helper: same as data() but with all must-eat ids in revealedMustEatIds */
const dataRevealed = (mustEats: MapMustEat[]): InitialMapData =>
  data(
    mustEats,
    mustEats.map((m) => m._id)
  );

// useTranslation() pulls in next-intl's useRouter, which needs the app router
// context mounted. The test never navigates — a stub is enough.
const routerStub = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
} as unknown as AppRouterInstance;

function render(initialMapData: InitialMapData, locale: 'de' | 'en' = 'de') {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={routerStub}>
      <NextIntlClientProvider
        locale={locale}
        messages={translations[locale]}
        timeZone="Europe/Berlin"
      >
        <HomeMapDataProvider initialMapData={initialMapData}>
          <HubMustEatsTeaser />
        </HomeMapDataProvider>
      </NextIntlClientProvider>
    </AppRouterContext.Provider>
  );
}

describe('HubMustEatsTeaser', () => {
  it('renders the "Must Eats" header', () => {
    const html = render(dataRevealed([me()]));
    expect(html).toContain('Must Eats');
  });

  it('renders the title + lead + must-eats CTA via translations', () => {
    const html = render(dataRevealed([me()]));
    expect(html).toContain(translations.de.mustEats.teaserTitle);
    expect(html).toContain(translations.de.mustEats.teaserSub);
    expect(html).toContain(translations.de.mustEats.teaserCta);
  });

  it('offers the onboarding explainer without opening it on the home page', () => {
    const html = render(dataRevealed([me()]));
    // The three-slide explainer used to be reachable only from the Must-Eats
    // page, i.e. only past the CTA — so a visitor who bounced off this section
    // for not understanding it never got the explanation. The trigger renders
    // here; the dialog itself must not, or the home page opens with a modal.
    // Substring, not the whole string: React escapes the apostrophe in
    // "Wie funktioniert's?".
    expect(html).toContain('Wie funktioniert');
    expect(html).not.toContain('role="dialog"');
  });

  it('points the must-eats CTA at the full must-eats page', () => {
    const html = render(dataRevealed([me()]));
    expect(html).toMatch(/href="\/must-eats"/);
    expect(html).not.toContain('data-swarm');
  });

  it('locale-prefixes the must-eats CTA for en', () => {
    const html = render(dataRevealed([me()]), 'en');
    expect(html).toMatch(/href="\/en\/must-eats"/);
  });

  it('keeps the reveal deep-link and uses the canonical restaurant page', () => {
    const html = render(dataRevealed([me()]));
    expect(html).toContain('href="/map?me=m1"');
    expect(html).toContain('href="/restaurant/bar-basta"');
    expect(html).not.toContain('/map?r=');
  });

  it('starts preview downloads early at low priority and reserves their dimensions', () => {
    const html = render(dataRevealed([me()]));
    expect(html).toContain('Smash Burger');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchPriority="low"');
    expect(html).toContain('width="760" height="1044"');
    expect(html).toContain('src="/api/must-eat-image/m1?v=0123456789ab&amp;w=360');
  });

  it('asks the image route for a card-sized variant, not the original', () => {
    const html = render(dataRevealed([me()]));
    // Without a srcset every tile downloaded the 1200px original into a slot at
    // most 208px wide — `sanitySrcSet` returns undefined for the
    // /api/must-eat-image URLs these carry, so there was never one.
    expect(html).toContain('180w');
    expect(html).toContain('360w');
    expect(html).toContain('440w');
    expect(html).toContain('720w');
    expect(html).toContain('sizes="(min-width: 1637px) 270px, (min-width: 1334px) 16.5vw, (min-width: 1024px) 220px, (min-width: 768px) 240px, calc((100vw - 64px) / 2)"');
  });

  it('renders nothing when no card is face-up', () => {
    // revealedMustEatIds is empty → no face-up cards → section should be empty
    expect(render(data([me()]))).toBe('');
  });

  it('shows five open cards and one covered card', () => {
    const openCards = Array.from({ length: 6 }, (_, i) => me({ _id: `open${i}`, dish: `Dish ${i}` }));
    const html = render(data([covered('hidden', 'Hidden Spot'), ...openCards], openCards.map(m => m._id)));
    expect(html.match(/data-stack-photo="open"/g)).toHaveLength(5);
    expect(html).toContain('/map?me=open4');
    expect(html).not.toContain('/map?me=open5');
    expect(html).not.toContain('Hidden Spot');
    expect(html).toContain('/pics/card-back.webp');
  });

  it('shows fewer open cards with one covered preview', () => {
    const html = render(data([me(), covered('m2', 'Ora')], ['m1']));
    expect(html.match(/data-stack-photo="open"/g)).toHaveLength(1);
    expect(html).toContain('Verdecktes Must Eat');
  });
});
