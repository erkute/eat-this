import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { RestaurantCard } from '@/lib/types';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: () => {}, prefetch: () => {} }),
}));

import {
  IssueMagazine,
  IssueRegister,
  IssueSiblings,
  IssueSpots,
  spotAnchor,
} from '@/app/components/HubIssue';

const spot = (slug: string, over: Partial<RestaurantCard> = {}): RestaurantCard => ({
  _id: slug,
  name: slug.replace(/-/g, ' '),
  slug,
  cuisineType: 'Italian',
  priceRange: { min: 10, max: 20, currency: 'EUR' },
  categories: [{ slug: 'pizza' } as never],
  photo: `https://cdn.sanity.io/images/p/d/${slug}.jpg`,
  ...over,
});
const facets = (r: RestaurantCard) => (r.categories ?? []).map((c) => c.slug as string);

describe('IssueSpots', () => {
  const html = renderToStaticMarkup(
    <IssueSpots
      restaurants={[spot('romeos', { shortDescription: 'Sandwiches.', tip: 'Früh kommen.' })]}
      locale="de"
      facetsOf={facets}
    />
  );

  it('keeps a stable spot anchor', () => {
    expect(html).toContain(`id="${spotAnchor('romeos')}"`);
  });

  it('uses a single spot link for the whole card', () => {
    expect(html).toMatch(/<h3[^>]*><a href="\/restaurant\/romeos"/);
    expect(html.match(/href="\/restaurant\/romeos"/g)).toHaveLength(1);
    expect(html).not.toContain('/map?');
  });

  it('keeps the tip separate from the card link without duplicate buttons', () => {
    expect(html).toContain('<details');
    expect(html).not.toContain('>Zum Spot</a>');
    expect(html).not.toContain('>Zur Map</a>');
  });

  it('prints description, tip, cuisine and price', () => {
    expect(html).toContain('Sandwiches.');
    expect(html).toContain('Tipp');
    expect(html).toContain('Früh kommen.');
    expect(html).toContain('Italienisch · 10–20 €');
  });
});

describe('IssueRegister', () => {
  it('groups the spots under their first letter, accents folded', () => {
    const html = renderToStaticMarkup(
      <IssueRegister
        restaurants={[spot('aerde'), spot('albatross'), spot('oekolo', { name: 'Öko' })]}
        locale="de"
        facetsOf={facets}
      />
    );
    const letters = [...html.matchAll(/aria-hidden="true">([A-Z#])<\/p>/g)].map((m) => m[1]);
    expect(letters).toEqual(['A', 'O']);
    expect(html).toContain('href="/restaurant/albatross"');
  });
});

describe('IssueSiblings', () => {
  const html = renderToStaticMarkup(
    <IssueSiblings
      items={[
        { slug: 'mitte', label: 'Mitte', photo: 'https://cdn.sanity.io/images/p/d/sofi.jpg' },
        { slug: 'wedding', label: 'Wedding' },
      ]}
      base="/bezirk"
      heading="Andere Bezirke"
      label="Weitere Bezirke"
    />
  );

  // Seit 03.10.2026 eine Bildleiste wie im Kopf statt der Wortzeile.
  it('shows each hub as a photo with its name, linked to its page', () => {
    expect(html).toMatch(/<a href="\/bezirk\/mitte"><span[^>]*><img[^>]*sofi\.jpg/);
    expect(html).toMatch(/>Mitte<\/span><\/a>/);
  });

  it('falls back to the initial without a photo', () => {
    expect(html).toMatch(/<a href="\/bezirk\/wedding"><span[^>]*><span[^>]*>W<\/span>/);
  });
});

describe('IssueSpots on a category page', () => {
  it('names the district, which the page itself does not', () => {
    const html = renderToStaticMarkup(
      <IssueSpots
        restaurants={[spot('stoke', { bezirk: { name: 'Kreuzberg', slug: 'kreuzberg' } })]}
        locale="de"
        facetsOf={facets}
        showDistrict
      />
    );
    expect(html).toContain('Italienisch · Kreuzberg · 10–20 €');
  });
});

describe('IssueMagazine', () => {
  // Der Schluss der Übersichten (Ansage 03.10.2026: „da ist einfach Stille").
  it('lays out the newest issues and a way to all of them', () => {
    const html = renderToStaticMarkup(
      <IssueMagazine
        issues={[
          { slug: 'crapulix', title: 'Crapulix', image: null, date: null, issue: 27, cover: null },
          {
            slug: 'franzoesisch',
            title: 'Französisch',
            image: null,
            date: null,
            issue: 26,
            cover: null,
          },
        ]}
        locale="de"
        heading="Aus dem Magazin"
      />
    );
    expect(html).toContain('href="/news/crapulix"');
    expect(html).toContain('href="/news/franzoesisch"');
    expect(html).toContain('href="/news"');
    expect(html).toContain('Alle Ausgaben');
  });

  it('stays away without issues', () => {
    expect(renderToStaticMarkup(<IssueMagazine issues={[]} locale="de" heading="x" />)).toBe('');
  });
});

describe('page ground', () => {
  it('uses the shared canvas for public content', () => {
    const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
    expect(css).toContain('html[data-active-page] .app-pages {\n  background: var(--et-ground);');
  });
});
