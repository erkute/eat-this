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
    expect(html).toContain('Ganz Neukölln auf der Map');
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
    expect(html).toContain('Pizza on the map');
    expect(html).toContain('Open the map');
  });

  it('renders restaurant copy (no name in headline) + ?r= deep-link', () => {
    const html = render({
      kind: 'restaurant',
      name: 'Cocolo',
      mapHref: '/map?r=cocolo',
      locale: 'de',
    });
    expect(html).toContain('href="/map?r=cocolo"');
    expect(html).toContain('<span>The map for people</span> <span>who care about food.</span>');
    expect(html).toContain(
      'Cocolo liegt auf der Eat This Map — zusammen mit weiteren kuratierten Restaurants, Cafés und Bars in Berlin.'
    );
    // The map screenshot is what makes the banner an invitation instead of a
    // black slab of type — regressing to a text-only CTA should fail here.
    expect(html).toContain('map_app.webp');
  });

  it('chip variant renders an inline yellow pill (title + nofollow deep-link, no section heading)', () => {
    const html = render({
      kind: 'bezirk',
      name: 'Mitte',
      mapHref: '/map?bezirk=mitte',
      locale: 'de',
      variant: 'chip',
    });
    expect(html).toContain('href="/map?bezirk=mitte"');
    expect(html).toContain('rel="nofollow"');
    expect(html).toContain('Ganz Mitte auf der Map');
    expect(html).not.toContain('<h2');
  });

  it('chip variant uses a short neutral label — no slogan, no restaurant name', () => {
    const html = render({
      kind: 'restaurant',
      name: 'Bari',
      mapHref: '/map?r=bari',
      locale: 'en',
      variant: 'chip',
    });
    expect(html).toContain('Open on the map');
    expect(html).not.toContain('Bari');
    expect(html).not.toContain('The map for people who care about food.');
  });
});
