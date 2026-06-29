import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import type { HomeData } from '@/lib/home/getHomeData';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';

vi.mock('./HubDeineWelt', () => ({ default: () => null }));
vi.mock('./HubNearby', () => ({ default: () => '<div data-testid="nearby"></div>' }));
vi.mock('./HubMustEatsTeaser', () => ({ default: () => '<div data-testid="musteats"></div>' }));
vi.mock('./HubFragRemy', () => ({ default: () => '<div data-testid="remy"></div>' }));
vi.mock('./HubFaq', () => ({ default: () => '<div data-testid="faq"></div>' }));
vi.mock('./SiteFooter', () => ({ default: () => '<footer data-testid="footer"></footer>' }));
vi.mock('./HubHashScroll', () => ({ default: () => null }));

// MapIntentLink uses useRouter from next-intl — stub it to render a plain anchor
vi.mock('./MapIntentLink', () => ({
  default: ({
    href,
    rel,
    className,
    children,
    'aria-label': ariaLabel,
  }: {
    href: string;
    rel?: string;
    className?: string;
    children?: ReactNode;
    'aria-label'?: string;
  }) => (
    <a href={href} rel={rel} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

import HubSection from './HubSection';

const data: HomeData = {
  spotOfDay: {
    name: 'Gazzo',
    slug: 'gazzo',
    image: '/x.webp',
    district: 'Prenzlberg',
    sub: null,
    _id: 'r1',
    featured: false,
    featuredOnDate: null,
    mustEatCount: 0,
  },
  newOnMap: [],
  categories: [],
  districts: [],
  magazine: [],
  categoryNames: { pizza: 'Pizza' },
};
const map = { restaurants: [], mustEats: [], revealedMustEatIds: [] } as unknown as InitialMapData;

function renderHome(locale: 'de' | 'en' = 'de') {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <HubSection initialData={data} initialMapData={map} locale={locale} />
    </NextIntlClientProvider>
  );
}

describe('HubSection home', () => {
  it('renders the brand hero headline', () => {
    const html = renderHome();
    expect(html.toLowerCase()).toContain('we tell you');
    expect(html.toLowerCase()).toContain('what to eat');
  });

  it('hero links to the map', () => {
    const html = renderHome();
    // The CTA label for DE is "Zur Map"
    expect(html).toContain('Zur Map');
    expect(html).toContain('/map');
  });

  it('wraps the page in the homeV2 class', () => {
    const html = renderHome();
    expect(html).toContain('homeV2');
  });

  it('renders spot of day name in the hero photo tag', () => {
    const html = renderHome();
    expect(html).toContain('Gazzo');
  });
});
