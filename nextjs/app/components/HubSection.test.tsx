import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { translations } from '@/lib/i18n/translations';
import { NextIntlClientProvider } from 'next-intl';
import type { HomeData } from '@/lib/home/getHomeData';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';

vi.mock('./HubMapPreview', () => ({ default: () => '<div data-testid="map-preview"></div>' }));
vi.mock('./HubMustEatsTeaser', () => ({ default: () => '<div data-testid="musteats"></div>' }));
vi.mock('./HubFragRemy', () => ({
  default: () => <div data-testid="remy" />,
}));
vi.mock('./HubFaq', () => ({ default: () => <div data-testid="faq" /> }));
vi.mock('./SiteFooter', () => ({ default: () => '<footer data-testid="footer"></footer>' }));
vi.mock('./HubHashScroll', () => ({ default: () => null }));
/* Das Starter-Pack-Formular bietet seit 07.09.2026 auch Google an und liest
   dafuer den Auth-Kontext; die Seite hier rendert ohne AuthProvider. Der
   Mail-Weg bleibt echt — er kommt ohne Provider aus. */
vi.mock('@/lib/auth/AuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/AuthContext')>()),
  useAuth: () => ({
    user: null,
    loading: false,
    signInWithGoogle: async () => {},
    prepareGoogleSignIn: () => {},
  }),
}));
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
  // MagazineGrid renders nothing on an empty list, and the order assertions
  // below need it on the page.
  magazine: [{ title: 'Zehn Teller', slug: 'zehn-teller', image: null, issue: 1, cover: null }],
  categoryNames: { pizza: 'Pizza' },
};
const map = { restaurants: [], mustEats: [], revealedMustEatIds: [] } as unknown as InitialMapData;

function renderHome(locale: 'de' | 'en' = 'de') {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={translations[locale]} timeZone="Europe/Berlin">
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

  it('carries exactly one signup after the FAQ', () => {
    const html = renderHome();
    // A second copy lower down was tried and dropped: it looked identical
    // once it gained the pack and panel, so it read as repetition.
    expect(html.match(/data-hub-starter/g)).toHaveLength(1);
    expect(html.indexOf('data-hub-starter')).toBeGreaterThan(html.indexOf('data-testid="faq"'));
  });

  it('orders magazine, map-preview, Must Eats, Remy, FAQ and signup', () => {
    const html = renderHome();
    expect(html.indexOf('data-hub-hero')).toBeLessThan(html.indexOf('Auf dem Teller'));
    expect(html.indexOf('Auf dem Teller')).toBeLessThan(html.indexOf('map-preview'));
    expect(html.indexOf('map-preview')).toBeLessThan(html.indexOf('musteats'));
    expect(html.indexOf('musteats')).toBeLessThan(html.indexOf('data-hub-starter'));
    expect(html.indexOf('musteats')).toBeLessThan(html.indexOf('data-testid="remy"'));
    expect(html.indexOf('data-testid="remy"')).toBeLessThan(html.indexOf('data-testid="faq"'));
    expect(html.indexOf('data-testid="faq"')).toBeLessThan(html.indexOf('data-hub-starter'));

  });

  it('has no Spot des Tages any more (removed 01.10.2026)', () => {
    const html = renderHome();
    expect(html).not.toContain('Spot des Tages');
    expect(html).not.toContain('hub-spot');
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
});
