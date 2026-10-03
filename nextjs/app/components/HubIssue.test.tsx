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

  // „Spot-Seite" war kein Wort für einen Knopf (Ansage 03.10.2026).
  it('calls the second way „Zum Spot"', () => {
    expect(html).toContain('>Zum Spot</a>');
    expect(html).not.toContain('Spot-Seite');
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
          more: 'Alle Spots in Mitte',
        },
      ]}
    />
  );

  it('links the name and the short way in to the page', () => {
    expect(html).toMatch(/<h2[^>]*><a href="\/bezirk\/mitte">Mitte<\/a><\/h2>/);
    // Eine Etikett-Zeile statt Knopf (Wahl 03.10.2026), sprechend genug ohne
    // eigenes aria-label.
    expect(html).toMatch(/<a [^>]*href="\/bezirk\/mitte"[^>]*>Alle Spots in Mitte<\/a>/);
    expect(html).toContain('Zwischen Torstraße und Spree.');
  });

  it('shows the spots as a strip of links into their pages', () => {
    expect(html).toContain('href="/restaurant/bar-basta"');
    expect(html).toContain('href="/restaurant/sofi"');
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
  // Bezirke und Kategorien samt Übersichten stehen seit 03.10.2026 auf Weiss
  // wie der Artikel, die Spot-Seite ebenso — nicht mehr in der Ink-Liste von
  // globals.css.
  it('puts district, category and spot pages on white', () => {
    const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
    for (const page of ['bezirk', 'kategorie', 'restaurant']) {
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
