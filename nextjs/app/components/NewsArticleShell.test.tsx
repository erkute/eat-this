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

  // Pizza: the article opens on a short sentence, and the lede welds it to the
  // next one. From the lede's side that is a small overlap — but the article's
  // opening sentence sits at the lede's start word for word.
  it("drops a lede that welds the article's short opening sentence to the next", () => {
    const excerpt =
      'Berlin hat kein Pizza-Problem, sondern das gegenteilige: es gibt verdammt viel gute Pizza. ' +
      'Fünf Pizzerien für fünf verschiedene Überzeugungen — von Sauerteig bis NY-Slice.';
    const html = render(
      [
        para(
          'Berlin hat kein Pizza-Problem. Berlin hat inzwischen eher das gegenteilige Problem: ' +
            'Es gibt verdammt viel gute Pizza.'
        ),
        para('Vor ein paar Jahren reichte ein Holzofen aus Neapel.'),
      ],
      { excerptDe: excerpt, excerpt }
    );
    expect(html).not.toContain('Fünf Pizzerien für fünf');
  });

  // Fine Dining: the lede opens on its own words and only closes on the
  // article's opening sentence, after a colon of its own. That is a lede.
  it("keeps a lede that closes on the article's opening sentence", () => {
    const excerpt =
      'Ein Stern über eng gestellten Tischen, ein Menü ohne Pfeffer und Olivenöl, ein Grill ' +
      'als ganzes Konzept: Berlins Spitzenküche hat aufgehört, sich zu benehmen.';
    const html = render(
      [
        para(
          'Berlins Spitzenküche hat aufgehört, sich zu benehmen. Das Haus mit Stern und grünem ' +
            'Stern an der Torstraße stellt seine Tische eng und ohne Decken.'
        ),
      ],
      { excerptDe: excerpt, excerpt }
    );
    expect(html).toContain('Ein Stern über eng gestellten Tischen');
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
  // Spot-Seite — auf einer Karte, deren sichtbarer Knopf „Zur Map“ heißt,
  // ist das für niemanden vorhersehbar, zumal die Trefferfläche des Namens
  // über die ganze Karte reicht.
  it('sends both the spot name and the map button to the map', () => {
    const html = render([spot('Spumante', 'spumante')]);
    expect(html.match(/href="\/map\?r=spumante"/g)).toHaveLength(2);
    // „Zur Map" wie überall in der App — „Auf die Map" klang doof (02.10.2026).
    expect(html).toContain('Zur Map');
    expect(html).not.toContain('Auf die Map');
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

  it('nofollows both map links — they carry a query', () => {
    const html = render([spot('Spumante', 'spumante')]);
    // Nicht mehr, weil die Map noindex wäre — sie ist seit dem 01.09.2026
    // indexierbar. Beide Links tragen `?r=`, und jede Query-Variante zählt die
    // Search Console sonst einzeln auf.
    const mapLinks = html.match(/<a[^>]*href="\/map\?r=spumante"[^>]*>/g) ?? [];
    expect(mapLinks).toHaveLength(2);
    for (const link of mapLinks) expect(link).toContain('nofollow');
  });

  it('lists the spots of a guide under the head, by name, each a jump', () => {
    const conclusion = {
      _type: 'block',
      _key: 'fazit',
      style: 'conclusion',
      markDefs: [],
      children: [{ _type: 'span', _key: 'f', text: 'Fünf Pizzen, fünf Wege' }],
    } as unknown as PortableTextBlock;
    const html = render([
      h2('Saucen'),
      spot('Spumante', 'spumante'),
      h2('Kolo Coffee – Mikrorösterei mit Bohnen'),
      spot('Kolo', 'kolo'),
      conclusion,
    ]);
    const head = html.slice(0, html.indexOf('</header>'));
    // „nicht Kapitel nennen" (02.10.2026): die Zeile zählt Spots auf.
    expect(head).toContain('aria-label="Die Spots"');
    // Das Fazit ist kein Spot.
    expect(head).not.toContain('Fünf Pizzen');
    expect(head).toContain('href="#saucen"');
    expect(head).toMatch(/href="#kolo-coffee-[^"]*"[^>]*>Kolo Coffee<\/a>/);
  });

  // Ansage 02.10.2026: „das brauche ich hier nicht, nur wenn Spots gelistet
  // sind" — ein Essay mit Zwischenüberschriften bekommt keine Zeile.
  it('shows no chapter row for an essay that lists no spots', () => {
    const html = render([
      h2('Von der Sterneküche'),
      para('x'),
      h2('Das Croissant'),
      spot('Crapulix', 'crapulix'),
    ]);
    expect(html).not.toContain('aria-label="Die Spots"');
  });

  it('reports a reading estimate of at least a minute', () => {
    expect(render([para('Kurz.')])).toContain('1 Min. Lesezeit');
  });

  describe('issue', () => {
    const issues = (slugs: string[]) =>
      slugs.map(
        (slug, i) =>
          ({
            _id: `id-${slug}`,
            slug,
            title: `Story ${slug}`,
            date: `2026-09-${String(20 - i).padStart(2, '0')}`,
            imageUrl: `https://cdn.sanity.io/${slug}.webp`,
          }) as NewsArticle
      );

    const renderWith = (related: NewsArticle[], over: Partial<NewsArticle> = {}) =>
      renderToStaticMarkup(
        <NewsArticleShell
          article={{
            _id: 'news-1',
            slug: 'doener',
            title: 'Döner in Berlin',
            titleDe: 'Döner in Berlin',
            date: '2026-04-24',
            imageUrl: 'https://cdn.sanity.io/doener.webp',
            alt: 'Döner im Brot',
            categoryLabelDe: 'Guides',
            content: [para('Text.')],
            contentDe: [para('Text.')],
            ...over,
          }}
          relatedArticles={related}
          locale="de"
          isActive
        />
      );

    it('names its issue in the credits under the head, counted from the oldest article', () => {
      // Newest first: four articles, `doener` is the second newest → Issue 3.
      const html = renderWith(issues(['pizza', 'doener', 'eis', 'donuts']));
      const credits = html.slice(html.indexOf('</h1>'), html.indexOf('Min. Lesezeit'));
      expect(credits).toContain('<span>Issue 3</span>');
      expect(credits.indexOf('Issue 3')).toBeLessThan(credits.indexOf('24. April 2026'));
      // Nothing stands above the photo: the page opens with the head itself.
      expect(html.slice(0, html.indexOf('<header'))).not.toContain('Issue');
    });

    it('opens like Kaleidoscope: headline and credits, then the photo, then the lede', () => {
      const html = renderWith(issues(['doener']), {
        excerptDe: 'Wo Berlin seinen Döner wirklich isst.',
      });
      const at = (needle: string) => html.indexOf(needle);
      expect(at('</h1>')).toBeLessThan(at('24. April 2026'));
      expect(at('24. April 2026')).toBeLessThan(at('alt="Döner im Brot"'));
      expect(at('alt="Döner im Brot"')).toBeLessThan(at('Wo Berlin seinen Döner'));
      expect(at('Wo Berlin seinen Döner')).toBeLessThan(at('</header>'));
    });

    // Nur ein Auftakt in Providence: mit Vorspann beginnt der Text normal.
    it('marks the text as led when the head carries a lede', () => {
      const led = renderWith(issues(['doener']), { excerptDe: 'Wo Berlin seinen Döner isst.' });
      expect(led).toMatch(/data-article-content=""[^>]*data-lede=""/);
      expect(renderWith(issues(['doener']))).not.toContain('data-lede');
    });

    it('puts the rubric as a label right above the headline', () => {
      const html = renderWith(issues(['doener']));
      expect(html).toMatch(/>Guides<\/span><h1[^>]*>Döner in Berlin<\/h1>/);
    });

    // Am Telefon schrumpft die Schlagzeile, bis ihr längstes Wort passt.
    it('tells the headline its longest word, a hyphen counting as a break', () => {
      const long = renderWith(issues(['doener']), {
        titleDe: 'Berlin zwischen Smashburger und Mitternachtshunger',
      });
      expect(long).toMatch(/<h1[^>]*style="--title-longest:18"/);
      const compound = renderWith(issues(['doener']), { titleDe: 'Bistro-Abende in Berlin' });
      expect(compound).toMatch(/<h1[^>]*style="--title-longest:7"/);
    });

    it('does not show its own cover again — the tap opened the magazine', () => {
      const html = renderWith(issues(['pizza', 'doener', 'eis']));
      const header = html.slice(0, html.indexOf('</header>'));
      expect(header).not.toContain('data-magazine-cover');
      expect(header).toContain('alt="Döner im Brot"');
      expect(html.match(/<h1/g)).toHaveLength(1);
    });

    it('carries no number for a draft that is not in the run yet', () => {
      const html = renderWith(issues(['pizza', 'eis']));
      expect(html.slice(0, html.indexOf('</header>'))).not.toContain('Issue');
    });

    it('marks the page for the magazine opener to land on', () => {
      expect(renderWith(issues(['doener']))).toContain('data-article-slug="doener"');
    });

    it('shows the next issues as covers with their own numbers', () => {
      const html = renderWith(issues(['pizza', 'doener', 'eis', 'donuts']));
      // Darunter liegen Hefte, also „Weitere Ausgaben" — nicht mehr „Weiter
      // auf dem Teller" (Ansage 02.10.2026).
      expect(html).toContain('>Weitere Ausgaben</h2>');
      expect(html).not.toContain('Weiter auf dem Teller');
      const related = html.slice(html.indexOf('Weitere Ausgaben'));
      expect(related).toContain('href="/news/pizza"');
      expect(related).toContain('data-cover-issue="4"');
      expect(related).toContain('href="/news/donuts"');
      expect(related).toContain('data-cover-issue="1"');
      expect(related).not.toContain('href="/news/doener"');
    });

    const articleCard = (articleSlug: string): PortableTextBlock =>
      ({ _type: 'articleCard', _key: `ac-${articleSlug}`, articleSlug }) as unknown as PortableTextBlock;

    it('zeigt einen Artikel-Verweis im Text als Heft mit dem aktuellen Titel', () => {
      const content = [para('Text.'), articleCard('pizza')];
      const html = renderWith(issues(['pizza', 'doener']), { content, contentDe: content });
      const body = html.slice(0, html.indexOf('Weitere Ausgaben'));
      expect(body).toContain('href="/news/pizza"');
      expect(body).toContain('data-cover-issue="2"');
      expect(body).toContain('Story pizza');
    });

    it('lässt einen Verweis auf einen unveröffentlichten oder den eigenen Artikel weg', () => {
      const content = [para('Text.'), articleCard('gibts-nicht'), articleCard('doener')];
      const html = renderWith(issues(['pizza', 'doener']), { content, contentDe: content });
      const body = html.slice(0, html.indexOf('Weitere Ausgaben'));
      expect(body).not.toContain('href="/news/gibts-nicht"');
      expect(body).not.toContain('href="/news/doener"');
    });

    it('stellt einen Verweis hinter das Fazit statt hinein', () => {
      const conclusion = {
        _type: 'block',
        _key: 'fazit',
        style: 'conclusion',
        children: [{ _type: 'span', text: 'Fazit' }],
      } as unknown as PortableTextBlock;
      const content = [conclusion, para('Schluss.'), articleCard('pizza')];
      const html = renderWith(issues(['pizza', 'doener']), { content, contentDe: content });
      const aside = html.slice(html.indexOf('data-block="conclusion"'), html.indexOf('</aside>'));
      expect(aside).toContain('Schluss.');
      expect(aside).not.toContain('href="/news/pizza"');
    });
  });
});
