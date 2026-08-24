import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import type { AnchorHTMLAttributes } from 'react';
import MapPromoCTA from '@/app/components/MapPromoCTA';

type MockLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  prefetch?: unknown;
};

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: MockLinkProps) => {
    delete props.prefetch;
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
  useRouter: () => ({
    prefetch: () => {},
  }),
}));

type Args = Parameters<typeof MapPromoCTA>[0];

function render(props: Args) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={props.locale} messages={{}}>
      <MapPromoCTA {...props} />
    </NextIntlClientProvider>
  );
}

describe('MapPromoCTA', () => {
  it('deep-links to the bezirk-filtered map with rel=nofollow + name (de)', () => {
    const html = render({
      kind: 'bezirk',
      name: 'Neukölln',
      mapHref: '/map?bezirk=neukoelln',
      locale: 'de',
    });
    expect(html).toContain('href="/map?bezirk=neukoelln"');
    expect(html).toContain('rel="nofollow"');
    // Der Name trägt den Fließtext, nicht die Headline — die gehört dem Slogan.
    expect(html).toContain('Die Map hört nicht an der Bezirksgrenze auf');
    expect(html).toContain('Map öffnen');
  });

  it('renders EN copy + interpolated category name', () => {
    const html = render({
      kind: 'kategorie',
      name: 'Pizza',
      mapHref: '/map?cat=pizza',
      locale: 'en',
    });
    expect(html).toContain('/map?cat=pizza');
    expect(html).toContain('The map holds more than Pizza.');
    expect(html).toContain('Open the map');
  });

  it.each(['restaurant', 'bezirk', 'kategorie'] as const)(
    'leads the %s banner with the brand slogan, not the place',
    (kind) => {
      const html = render({ kind, name: 'Neukölln', mapHref: '/map', locale: 'de' });
      expect(html).toContain('<span>The map for people</span> <span>who care about food.</span>');
      // Der ortsspezifische Titel gehört in die Pille, nicht in die Headline.
      const heading = html.match(/<h2[^>]*>(.*?)<\/h2>/)?.[1] ?? '';
      expect(heading).not.toContain('Neukölln');
    }
  );

  it('renders restaurant copy + ?r= deep-link', () => {
    const html = render({
      kind: 'restaurant',
      name: 'Cocolo',
      mapHref: '/map?r=cocolo',
      locale: 'de',
    });
    expect(html).toContain('href="/map?r=cocolo"');
    expect(html).toContain('<span>The map for people</span> <span>who care about food.</span>');
    // Der Name steht im Fließtext, nicht in der Headline.
    expect(html).toContain('Cocolo ist nur einer der Pins.');
    // The device shots are what make the banner an invitation instead of a
    // black slab of type — regressing to a text-only CTA should fail here.
    // Zwei Geräte: die Map vorn, eine Spot-Seite dahinter. Fällt eines weg,
    // ist die Staffelung kaputt und der Banner zeigt nur noch die halbe Idee.
    expect(html).toContain('phone-map.webp');
    expect(html).toContain('phone-restaurant.webp');
  });

  it('band variant is the home-page button: label, deep-link, no section heading', () => {
    const html = render({
      kind: 'restaurant',
      name: 'Cocolo',
      mapHref: '/map?r=cocolo',
      locale: 'de',
      variant: 'band',
    });
    expect(html).toContain('href="/map?r=cocolo"');
    expect(html).toContain('rel="nofollow"');
    expect(html).toContain('Auf der Map öffnen');
    // Wie bei der Pille: der Name des Spots steht nicht drin.
    expect(html).not.toContain('Cocolo');
    expect(html).not.toContain('<h2');
  });

  it('band variant speaks English on /en', () => {
    const html = render({
      kind: 'restaurant',
      name: 'Cocolo',
      mapHref: '/map?r=cocolo',
      locale: 'en',
      variant: 'band',
    });
    expect(html).toContain('Open on the map');
  });

  it('chip variant renders an inline pill (nofollow deep-link, no section heading)', () => {
    const html = render({
      kind: 'bezirk',
      name: 'Mitte',
      mapHref: '/map?bezirk=mitte',
      locale: 'de',
      variant: 'chip',
    });
    expect(html).toContain('href="/map?bezirk=mitte"');
    expect(html).toContain('rel="nofollow"');
    expect(html).toContain('Auf der Map öffnen');
    expect(html).not.toContain('<h2');
  });

  it.each(['restaurant', 'bezirk', 'kategorie'] as const)(
    'chip label for %s names neither the place nor the slogan — the page says where you are',
    (kind) => {
      const html = render({
        kind,
        name: 'Bari',
        mapHref: '/map',
        locale: 'en',
        variant: 'chip',
      });
      expect(html).toContain('Open on the map');
      expect(html).not.toContain('Bari');
      expect(html).not.toContain('The map for people who care about food.');
    }
  );
});
