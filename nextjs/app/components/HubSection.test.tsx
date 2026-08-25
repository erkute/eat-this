import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import type { HomeData } from '@/lib/home/getHomeData';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';

vi.mock('./HubNearby', () => ({ default: () => '<div data-testid="nearby"></div>' }));
vi.mock('./HubMustEatsTeaser', () => ({ default: () => '<div data-testid="musteats"></div>' }));
vi.mock('./HubFragRemy', () => ({ default: () => '<div data-testid="remy"></div>' }));
vi.mock('./HubFaq', () => ({ default: () => '<div data-testid="faq"></div>' }));
vi.mock('./SiteFooter', () => ({ default: () => '<footer data-testid="footer"></footer>' }));
vi.mock('./HubHashScroll', () => ({ default: () => null }));
vi.mock('./HubHeroCopy', () => ({
  default: () => (
    <div>
      <span>Was du essen solltest.</span>
      <h1>We tell you what to eat</h1>
      <span data-href="/map">Map öffnen</span>
      <span data-href="/map">Was ist um mich?</span>
    </div>
  ),
}));
vi.mock('./HomeMapDataContext', () => ({
  HomeMapDataProvider: ({ children }: { children: ReactNode }) => children,
}));

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
    sub: 'Sauerteigpizza, die den Vergleich nicht scheut.',
    _id: 'r1',
    featuredOnDate: null,
  },
  // MagazineGrid renders nothing on an empty list, and the order assertions
  // below need it on the page.
  magazine: [{ title: 'Zehn Teller', slug: 'zehn-teller', image: null, kicker: 'Magazin' }],
  categoryNames: { pizza: 'Pizza' },
};
const map = { restaurants: [], mustEats: [], revealedMustEatIds: [] } as unknown as InitialMapData;

function renderHome(locale: 'de' | 'en' = 'de') {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={{}} timeZone="Europe/Berlin">
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

  it('renders the signed-out reference hero without a visibility gate after auth resolves', () => {
    const hero = renderHome().split('</section>')[0];
    expect(hero).not.toContain('data-guest-only');
    expect(hero).not.toContain('data-auth-only');
    expect(hero).not.toContain('Deine Map wartet');
  });

  it('carries exactly one signup, high on the page', () => {
    const html = renderHome();
    // A second copy lower down was tried and dropped: it looked identical
    // once it gained the pack and panel, so it read as repetition.
    expect(html.match(/data-hub-starter/g)).toHaveLength(1);
    expect(html.indexOf('Starter Pack')).toBeLessThan(html.indexOf('Worauf hast du Lust?'));
  });

  it("gives the day's pick a heading of its own", () => {
    const html = renderHome();
    // The pick used to be an unlabelled photo in the left half of a row, with
    // the only heading in the block sitting over the nearby cards beside it.
    const head = html.indexOf('Spot des Tages');
    expect(html.slice(head - 120, head)).toContain('hv-title');
    expect(head).toBeLessThan(html.indexOf('Gazzo'));
  });

  it('runs what is around you first, then the pick, the magazine, the signup', () => {
    const html = renderHome();
    // What's nearby costs the visitor one tap and answers with their own
    // street, so it leads; the pick is the editorial answer to the same
    // question. (The HubNearby mock returns a string, so it lands escaped.)
    expect(html.indexOf('nearby')).toBeLessThan(html.indexOf('Spot des Tages'));
    expect(html.indexOf('Spot des Tages')).toBeLessThan(html.indexOf('Auf dem Teller'));
    expect(html.indexOf('Auf dem Teller')).toBeLessThan(html.indexOf('data-hub-starter'));
    expect(html.indexOf('data-hub-starter')).toBeLessThan(html.indexOf('musteats'));
  });

  it("dates the pick, so 'des Tages' is something the visitor can see", () => {
    const html = renderHome();
    // Nothing on the page said the pick was new today — the heading claimed a
    // daily rhythm with no evidence for it.
    expect(html).toMatch(/<time[^>]+datetime="\d{4}-\d{2}-\d{2}"/i);
  });

  it('keeps the pick\'s name off the photo, where a bright image swallows it', () => {
    const html = renderHome();
    const photo = html.indexOf('hv-photo');
    const name = html.indexOf('Gazzo');
    // Name after the closing </span> of the photo box, not inside it.
    expect(html.slice(photo, name)).toContain('</span>');
  });

  it("renders the spot's description, which used to be fetched and dropped", () => {
    const html = renderHome();
    expect(html).toContain('Sauerteigpizza, die den Vergleich nicht scheut.');
  });

  it('opens the day\'s pick on the map', () => {
    const html = renderHome();
    expect(html).toContain('/map?r=gazzo');
  });

  it('sells no packs on the home page', () => {
    const html = renderHome();
    expect(html).not.toContain('/pack/');
  });

  it('hero links to the map', () => {
    const html = renderHome();
    expect(html).toContain('Map öffnen');
    expect(html).toContain('Was ist um mich?');
    expect(html).toContain('data-href="/map"');
  });

  it('wraps the page in the homeV2 class', () => {
    const html = renderHome();
    expect(html).toContain('homeV2');
  });

  it('renders the spot of the day', () => {
    const html = renderHome();
    expect(html).toContain('Gazzo');
    expect(html).toContain('Prenzlberg');
    expect(html).toContain('Zur Map');
  });
});
