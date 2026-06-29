import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { translations } from '@/lib/i18n/translations';
import HubBezirke from '@/app/components/HubBezirke';
import type { HubDistrict } from '@/lib/home/getHomeData';

const districts: HubDistrict[] = [
  {
    name: 'Neukölln',
    slug: 'neukoelln',
    tagline: 'Frische Welle',
    isFeature: true,
    count: 24,
    spots: [
      {
        name: 'Café Botanico',
        slug: 'cafe-botanico',
        image: 'https://cdn/x.jpg',
        category: 'Lunch',
      },
    ],
  },
  {
    name: 'Kreuzberg',
    slug: 'kreuzberg',
    tagline: 'Döner-Ursprung',
    isFeature: false,
    count: 31,
    spots: [{ name: 'ZOLA', slug: 'zola', image: 'https://cdn/y.jpg', category: 'Dinner' }],
  },
];

function render(d: HubDistrict[]) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={translations.de}>
      <HubBezirke districts={d} />
    </NextIntlClientProvider>
  );
}

describe('HubBezirke', () => {
  it('renders a tab and the feature badge for the feature district', () => {
    const html = render(districts);
    expect(html).toContain('Neukölln');
    expect(html).toContain('Diese Woche');
    expect(html).toContain('Entdecke Berlin');
  });

  it('keeps every district CTA in the DOM (incl. the inactive panel) for crawlable links', () => {
    const html = render(districts);
    expect(html).toContain('href="/bezirk/neukoelln"');
    expect(html).toContain('href="/bezirk/kreuzberg"'); // inactive panel still present
    expect(html).toContain('Alle Spots in Neukölln');
  });

  it('keeps every restaurant link in the DOM (incl. the inactive panel)', () => {
    const html = render(districts);
    expect(html).toContain('href="/restaurant/cafe-botanico"');
    expect(html).toContain('href="/restaurant/zola"'); // inactive panel still present
  });

  it('hides the inactive panel via the hidden attribute', () => {
    const html = render(districts);
    expect(html).toContain('id="bz-panel-kreuzberg"');
    expect(html).toContain('hidden=""');
  });

  it('renders nothing when there are no districts', () => {
    expect(render([])).toBe('');
  });
});
