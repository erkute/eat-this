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

  it.each(['restaurant', 'bezirk'] as const)(
    'leads the %s banner with the brand slogan, not the place',
    (kind) => {
      const html = render({ kind, name: 'Neukölln', mapHref: '/map', locale: 'de' });
      expect(html).toContain('<span>The map for people</span> <span>who care about food.</span>');
      // Der Ort gehört in den Fließtext, nicht in die Headline.
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
    expect(html).toContain('phone-map-ink.webp');
    expect(html).toContain('phone-restaurant-ink.webp');
  });
});
