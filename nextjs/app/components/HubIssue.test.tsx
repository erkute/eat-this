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
  IssueContents,
  IssueDirectory,
  IssueFaq,
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

describe('IssueContents', () => {
  it('jumps to each chapter', () => {
    const html = renderToStaticMarkup(
      <IssueContents restaurants={[spot('boii-boii'), spot('stoke')]} label="Die Spots" />
    );
    expect(html).toContain(`href="#${spotAnchor('boii-boii')}"`);
    expect(html).toContain(`href="#${spotAnchor('stoke')}"`);
  });

  it('stays away for a single spot', () => {
    expect(renderToStaticMarkup(<IssueContents restaurants={[spot('a')]} label="x" />)).toBe('');
  });
});

describe('IssueSpots', () => {
  const html = renderToStaticMarkup(
    <IssueSpots
      restaurants={[spot('romeos', { shortDescription: 'Sandwiches.', tip: 'Früh kommen.' })]}
      locale="de"
      facetsOf={facets}
    />
  );

  it('carries the anchor the contents strip points at', () => {
    expect(html).toContain(`id="${spotAnchor('romeos')}"`);
  });

  // Der Name ist der gefolgte Link auf die Spot-Seite; die Map-Links tragen
  // Query-Varianten und bleiben nofollow.
  it('links the name to the spot page and the map without follow', () => {
    expect(html).toMatch(/<h3[^>]*><a href="\/restaurant\/romeos"/);
    expect(html).toMatch(/href="\/map\?r=romeos" rel="nofollow"/);
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

describe('IssueFaq', () => {
  // Offen wie Zwischentitel im Heft — nichts zum Aufklappen.
  it('shows every answer without details', () => {
    const html = renderToStaticMarkup(
      <IssueFaq entries={[{ question: 'Wie viele?', answer: 'Sieben.' }]} heading="Fragen" />
    );
    expect(html).toContain('Sieben.');
    expect(html).not.toContain('<details');
  });
});

describe('IssueSiblings', () => {
  const html = renderToStaticMarkup(
    <IssueSiblings
      items={[
        { slug: 'mitte', label: 'Mitte' },
        { slug: 'wedding', label: 'Wedding' },
      ]}
      base="/bezirk"
      heading="Auch in Berlin"
      label="Weitere Bezirke"
    />
  );

  it('separates the districts with one stroke between them', () => {
    expect(html.match(/>\/<\/span>/g)).toHaveLength(1);
    expect(html).toContain('href="/bezirk/wedding"');
  });

  // Ansage 03.10.2026: kein gelbes Quadrat nach dem letzten Bezirk.
  it('ends on the last name, without a closing mark', () => {
    expect(html).toMatch(/Wedding<\/a><\/li><\/ul>/);
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

describe('IssueDirectory', () => {
  const html = renderToStaticMarkup(
    <IssueDirectory
      label="Alle Bezirke"
      entries={[
        {
          slug: 'mitte',
          href: '/bezirk/mitte',
          name: 'Mitte',
          blurb: 'Zwischen Torstraße und Spree.',
          spots: [spot('bar-basta'), spot('sofi')],
          cta: 'Alle',
          ctaLabel: 'Alle Spots in Mitte',
        },
      ]}
    />
  );

  it('links the name and the short way in to the page', () => {
    expect(html).toMatch(/<h2[^>]*><a href="\/bezirk\/mitte">Mitte<\/a><\/h2>/);
    expect(html).toContain('aria-label="Alle Spots in Mitte"');
    expect(html).toContain('Zwischen Torstraße und Spree.');
  });

  it('shows the spots as a strip of links into their pages', () => {
    expect(html).toContain('href="/restaurant/bar-basta"');
    expect(html).toContain('href="/restaurant/sofi"');
  });
});

describe('page ground', () => {
  // Bezirke und Kategorien samt Übersichten stehen seit 03.10.2026 auf Weiss
  // wie der Artikel — nicht mehr in der Ink-Liste von globals.css.
  it('puts district and category pages on white', () => {
    const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
    for (const page of ['bezirk', 'kategorie']) {
      expect(css).toMatch(
        new RegExp(
          `html\\[data-active-page='${page}'\\] \\.app-pages[,\\s\\S]*?\\{\\s*background: var\\(--et-white\\);`
        )
      );
      expect(css.match(new RegExp(`html\\[data-active-page='${page}'\\] body`, 'g'))).toHaveLength(
        1
      );
    }
  });
});
