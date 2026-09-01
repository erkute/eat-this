import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { NewsArticle, PortableTextBlock } from '@/lib/types';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: () => {}, prefetch: () => {} }),
}));
vi.mock('@/app/components/SiteFooter', () => ({ default: () => <footer role="contentinfo" /> }));

import NewsArticleShell from '@/app/components/NewsArticleShell';

const para = (text: string, key = text.slice(0, 8)): PortableTextBlock =>
  ({
    _type: 'block',
    _key: key,
    style: 'normal',
    children: [{ _type: 'span', text }],
  }) as unknown as PortableTextBlock;

const h2 = (text: string): PortableTextBlock =>
  ({
    _type: 'block',
    _key: `h-${text}`,
    style: 'h2',
    children: [{ _type: 'span', text }],
  }) as unknown as PortableTextBlock;

const mustEat = (restaurantName: string, restaurantSlug?: string): PortableTextBlock =>
  ({
    _type: 'mustEatCard',
    _key: `me-${restaurantName}`,
    mustEatId: `id-${restaurantName}`,
    restaurantName,
    restaurantSlug,
    district: 'Schöneberg',
  }) as unknown as PortableTextBlock;

const spot = (restaurantName: string, restaurantSlug: string): PortableTextBlock =>
  ({
    _type: 'spotCard',
    _key: `spot-${restaurantSlug}`,
    restaurantName,
    restaurantSlug,
    district: 'Kreuzberg',
    cuisineType: 'Ice Cream',
  }) as unknown as PortableTextBlock;

function render(content: PortableTextBlock[], over: Partial<NewsArticle> = {}): string {
  return renderToStaticMarkup(
    <NewsArticleShell
      article={{
        _id: 'news-1',
        slug: 'doener',
        title: 'Döner in Berlin',
        titleDe: 'Döner in Berlin',
        date: '2026-04-24',
        content,
        contentDe: content,
        ...over,
      }}
      locale="de"
      isActive
    />
  );
}

describe('NewsArticleShell', () => {
  const opening = 'Ich bin in Berlin aufgewachsen.';

  it('drops the lede when the excerpt repeats the opening paragraph', () => {
    const html = render([para(opening)], { excerptDe: opening, excerpt: opening });
    // The opening survives once — as the article's first paragraph, not twice.
    expect(html.split(opening)).toHaveLength(2);
  });

  it('ignores punctuation and case when comparing lede and opening', () => {
    const html = render([para('„Döner ist Berlin“ — sagen sie.')], {
      excerptDe: 'Döner ist Berlin - sagen sie',
      excerpt: 'Döner ist Berlin - sagen sie',
    });
    expect(html).not.toContain('Döner ist Berlin - sagen sie');
  });

  it('keeps a lede that actually says something else', () => {
    const html = render([para(opening)], {
      excerptDe: 'Fünf Läden, kein Ranking.',
      excerpt: 'Fünf Läden, kein Ranking.',
    });
    expect(html).toContain('Fünf Läden, kein Ranking.');
  });

  // Kolo: the excerpt keeps the first two sentences, drops the third and
  // stitches the next paragraph on. Not a prefix of either one — but the reader
  // sees the same opening twice.
  it('drops a lede that only rewrites the opening', () => {
    const excerpt =
      'Ich trinke zwei Cappuccino am Tag. Einen morgens, einen mittags. ' +
      'Und trotzdem hat mich neulich ein Laden in der Brunnenstraße kalt erwischt.';
    const html = render(
      [
        para(
          'Ich trinke zwei Cappuccino am Tag. Einen morgens, einen mittags. Dazwischen, ' +
            'wenn der Tag es gut meint, ein Filterkaffee. Man kann also sagen: Ich habe Vergleichswerte.'
        ),
        para('Und trotzdem hat mich neulich ein Laden in der Brunnenstraße kalt erwischt.'),
      ],
      { excerptDe: excerpt, excerpt }
    );
    expect(html).not.toContain('Einen morgens, einen mittags. Und trotzdem');
  });

  // Türkisch: the opening sentence is repeated word for word, then the teaser
  // goes its own way. The dash does not end that sentence — the whole clause is
  // one thought, and the lede sits inside it.
  it("drops a lede that opens on the article's opening sentence", () => {
    const excerpt =
      'Berlin ohne türkische Küche ist nicht denkbar. Aber zwischen Döner-Buden und ' +
      'Touristen-Grills gibt es Adressen, die das Handwerk wirklich ernst nehmen.';
    const html = render(
      [
        para(
          'Berlin ohne türkische Küche ist nicht denkbar – die Stadt hat den Döner im Brot ' +
            'groß gemacht und isst ihn millionenfach.'
        ),
      ],
      { excerptDe: excerpt, excerpt }
    );
    expect(html).not.toContain('Aber zwischen Döner-Buden');
  });

  // Donuts EN: same sentence, two words swapped. Still the same opening.
  it('drops a lede whose opening sentence was only reworded', () => {
    const excerpt = "You know what a donut is before you've ever eaten one.";
    const html = render(
      [
        para(
          "You know the donut long before you've ever eaten one. Homer Simpson turned it into an icon."
        ),
      ],
      { excerptDe: excerpt, excerpt }
    );
    expect(html).not.toContain('You know what a donut is');
  });

  // Neukölln: the teaser lists what the paragraph lists, so they share plenty of
  // words — but it opens on its own sentence and earns its place.
  it("keeps a lede that shares the body's vocabulary but opens on its own", () => {
    const excerpt =
      'Zwei Michelin-Sterne in der Friedelstraße, ein Bib-Gourmand-Tresen in der ' +
      'Okerstraße und Knödel im Reuterkiez: Kein Bezirk isst wie Neukölln.';
    const html = render(
      [
        para(
          'Kein Berliner Bezirk hat sich kulinarisch so bewegt wie Neukölln: Aus dem Viertel ' +
            'der Spätis ist die dichteste Restaurant-Landschaft der Stadt geworden — mit zwei ' +
            'Michelin-Sternen in der Friedelstraße und einem Bib-Gourmand-Tresen in der Okerstraße.'
        ),
      ],
      { excerptDe: excerpt, excerpt }
    );
    expect(html).toContain('Zwei Michelin-Sterne in der Friedelstraße');
  });

  // Only the openings are compared: a teaser may close on a phrase it borrows
  // from further down the paragraph without losing the lede.
  it('keeps a lede that opens differently but quotes the body later', () => {
    const excerpt = 'Wir ranken keine Burger — das ist wie ein Ranking der eigenen Freunde.';
    const html = render(
      [
        para(
          'Jede Stadt hat ihre Glaubenskriege. Berlin streitet über Burger. Wir steigen aus: ' +
            'Ein Burger-Ranking ist ungefähr so sinnvoll wie ein Ranking der eigenen Freunde.'
        ),
      ],
      { excerptDe: excerpt, excerpt }
    );
    expect(html).toContain('Wir ranken keine Burger');
  });

  it('names each must-eat band after its restaurant so two never read alike', () => {
    const html = render([mustEat('Hasir'), mustEat('Bursa Uludağ Kebapçısı')]);
    expect(html).toContain('Hasir');
    // normalizeName strips the diacritics the display font can't render.
    expect(html).toContain('Bursa Uludag Kebapcisi');
  });

  // Das Band zeigt auf die Spot-Seite, nicht mehr auf ?me= — dorthin führt im
  // selben Artikel bereits die Spot-Karte, beide landeten also am selben Ort.
  // Von der Spot-Seite kommt man weiter zur Karte: ihr Must-Eat-Teaser
  // deeplinkt auf genau dieses Gericht.
  it('links a must-eat band to the spot page, and to the overview without a slug', () => {
    expect(render([mustEat('Hasir', 'hasir')])).toContain('href="/restaurant/hasir"');
    expect(render([mustEat('Hasir')])).toContain('href="/must-eats"');
  });

  // Die Kartenfläche hat ein Ziel: die Map. Vorher führte der Name auf die
  // Spot-Seite — auf einer Karte, deren sichtbarer Knopf „Auf die Map“ heißt,
  // ist das für niemanden vorhersehbar, zumal die Trefferfläche des Namens
  // über die ganze Karte reicht.
  it('sends both the spot name and the map button to the map', () => {
    const html = render([spot('Spumante', 'spumante')]);
    expect(html.match(/href="\/map\?r=spumante"/g)).toHaveLength(2);
    expect(html).toContain('Auf die Map');
  });

  // Der gefolgte Link auf die Spot-Seite sitzt jetzt auf der Meta-Zeile. Ohne
  // ihn gäben die Guides ihre Relevanz an keine einzige Restaurantseite weiter
  // — Google rankte dann den Guide für Marken-Queries einzelner Spots.
  it('keeps a followed spot-page link on the meta line', () => {
    const html = render([spot('Spumante', 'spumante')]);
    const metaLink = html.match(/<a[^>]*href="\/restaurant\/spumante"[^>]*>/)?.[0] ?? '';
    expect(metaLink).not.toBe('');
    expect(metaLink).not.toContain('nofollow');
  });

  it('nofollows both map links — the map is noindex', () => {
    const html = render([spot('Spumante', 'spumante')]);
    // Die Map ist noindex, dorthin vererbt der indexierbare Artikel nichts.
    const mapLinks = html.match(/<a[^>]*href="\/map\?r=spumante"[^>]*>/g) ?? [];
    expect(mapLinks).toHaveLength(2);
    for (const link of mapLinks) expect(link).toContain('nofollow');
  });

  it('lists the h2 chapters in the rail', () => {
    const html = render([h2('Saucen'), para('x'), h2('Und jetzt zum traurigen Teil')]);
    expect(html).toContain('href="#saucen"');
    expect(html).toContain('href="#und-jetzt-zum-traurigen-teil"');
  });

  it('reports a reading estimate of at least a minute', () => {
    expect(render([para('Kurz.')])).toContain('1 Min. Lesezeit');
  });
});
