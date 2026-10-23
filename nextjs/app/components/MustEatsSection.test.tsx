import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import type { MapMustEat } from '@/lib/types';
import type { InitialMustEatsData } from '@/lib/map/initial-surface-data';

// The server shell composes two client islands that pull in Firebase/auth and
// browser-only context. This test targets the shell itself (H1, stats, band
// copy, closing CTA), so stub the islands out — their behaviour is covered by
// the pure-helper tests and the live app's providers.
const galleryCopy = vi.fn();
vi.mock('@/app/components/MustEatsGallery', () => ({
  default: (props: { copy: Record<string, string> }) => {
    galleryCopy(props.copy);
    return null;
  },
}));
vi.mock('@/app/components/SiteFooter', () => ({
  default: () => null,
}));
vi.mock('@/app/components/MustEatsOnboarding', () => ({
  default: () => null,
}));

import MustEatsSection from '@/app/components/MustEatsSection';

const EMPTY: InitialMustEatsData = {
  mustEats: [],
  revealedMustEatIds: [],
};

function mustEat(id: string, faceUp: boolean): MapMustEat {
  return {
    _id: id,
    order: Number(id) || undefined,
    ...(faceUp ? { dish: `Dish ${id}`, image: `https://cdn/${id}.png` } : {}),
    restaurant: { _id: `r-${id}`, name: `Spot ${id}`, slug: id, lat: 52.5, lng: 13.4 },
  };
}

/** Three face-up cards and five covered ones. */
function catalog(): InitialMustEatsData {
  const up = ['1', '2', '3'];
  return {
    mustEats: [...up, '4', '5', '6', '7', '8'].map((id) => mustEat(id, up.includes(id))),
    revealedMustEatIds: up.map((id) => id),
  };
}

function render(locale: 'de' | 'en' = 'de', data: InitialMustEatsData = EMPTY) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <MustEatsSection initialMapData={data} locale={locale} />
    </NextIntlClientProvider>
  );
}

describe('MustEatsSection', () => {
  it('renders the Must Eats H1', () => {
    const html = render();
    expect(html).toMatch(/<h1[^>]*>Must<br\/?>Eats<\/h1>/);
  });

  it('renders the explanatory sub copy (de)', () => {
    const html = render();
    expect(html).toContain('Unsere Auswahl der Gerichte');
    expect(html).toContain('die anderen entdeckst du direkt am Spot.');
  });

  it('renders the explanatory sub copy (en)', () => {
    const html = render('en');
    expect(html).toContain('Our pick of the dishes');
    expect(html).toContain('the rest you discover right at the spot.');
  });

  it('never states a Must Eat in the singular per spot', () => {
    // Ein Spot kann MEHRERE Must Eats haben (mustEatCountByRestaurant in
    // lib/map/server-initial-map-data.ts zählt sie hoch, der Pager blättert
    // zwischen ihnen). Die Behauptung "ein Gericht pro Spot" stand hier schon
    // dreimal drin und ist dreimal aufgefallen — deshalb ein eigener Test statt
    // einer Zeile im Copy-Test.
    for (const locale of ['de', 'en'] as const) {
      const html = render(locale);
      for (const forbidden of [
        'pro Spot',
        'das eine Gericht',
        'each spot',
        'that spot',
        'the one dish',
      ]) {
        expect(html).not.toContain(forbidden);
      }
    }
  });

  it('keeps the band copy free of command chains', () => {
    // Copy-Regel des Owners: kurze Hauptsätze, keine aneinandergereihten
    // Imperative ("Steh vor dem Spot, tipp die Karte an — offen").
    // Die Band-Copy geht als Prop in die (gemockte) Gallery, nicht ins Markup.
    galleryCopy.mockClear();
    render();

    expect(galleryCopy).toHaveBeenCalledWith(
      expect.objectContaining({
        coveredBody: 'Hinter jeder Karte steckt unsere Empfehlung — ein Gericht, das du probieren musst. Bist du am Spot, drehst du sie mit einem Tap um. Dann liegt sie in deinem Deck.',
      })
    );
  });

  it('states the deck as total / face-up / covered', () => {
    const html = render('de', catalog());

    // 8 cards, 3 of them face-up, so 5 are still covered.
    expect(html).toMatch(/>8<\/dd>/);
    expect(html).toMatch(/>3<\/dd>/);
    expect(html).toMatch(/>5<\/dd>/);
    expect(html).toContain('Karten');
    expect(html).toContain('liegen offen');
  });

  it('hands the gallery band headings with the live counts', () => {
    galleryCopy.mockClear();
    render('de', catalog());

    expect(galleryCopy).toHaveBeenCalledWith(
      expect.objectContaining({ coveredTitle: '5 warten vor Ort.' })
    );
  });

  it('defines the term in the face-up band instead of restating the count', () => {
    // Wie viele offen liegen, sagt die Kopfzeile und zeigt das Raster. Was ein
    // Must Eat IST, stand nirgends auf der Seite — das ist die Aufgabe dieses
    // Kopfes. Zahlen gehören deshalb nicht hinein.
    galleryCopy.mockClear();
    render('de', catalog());

    const copy = galleryCopy.mock.calls[0][0];
    expect(copy.openKicker).toBe('Must Eat?');
    expect(copy.openTitle).toBe('Weil Entdecken mehr Spaß macht als Suchen.');
    expect(copy.openBody).toBe(
      'Must Eats sind die Gerichte, für die sich der Weg durch Berlin lohnt. Am Spot bestellst du das Gericht und deckst seine Karte auf. So wächst deine Sammlung mit jedem Teller.'
    );
    expect(copy.openTitle).not.toMatch(/\d/);
    expect(copy.openBody).not.toMatch(/\d/);
  });

  it('puts the lowest-numbered face-up card on the cover', () => {
    // The catalog may arrive in any order; the cover is card 2, not card 3.
    const data = catalog();
    const html = render('de', { ...data, mustEats: [...data.mustEats].reverse() });

    expect(html).toContain('https://cdn/1.png');
    expect(html).not.toContain('https://cdn/3.png');
  });

  it('shows no cover and no card back up top when nothing is face-up', () => {
    const html = render('de', {
      mustEats: [mustEat('covered', false)],
      revealedMustEatIds: [],
    });

    expect(html).not.toContain('<figure');
    expect(html).not.toContain('/pics/card-back.webp');
  });

  it('keeps the empty catalog to the head and the close — no zero stats', () => {
    const html = render('de', EMPTY);

    expect(html).not.toContain('<dl');
    expect(html).not.toContain('<figure');
    expect(html).toContain('Hol sie dir.');
  });

  it('sends the primary closing CTA to the map, packs second', () => {
    const html = render();

    expect(html).toContain('Hol sie dir.');
    expect(html).toMatch(/href="\/map"/);
    expect(html).toMatch(/href="\/packs"/);
    // The map link is the primary action, so it comes first in the DOM.
    expect(html.indexOf('href="/map"')).toBeLessThan(html.indexOf('href="/packs"'));
  });

  it('says the deck keeps growing, not just where new cards come from', () => {
    // Die Zahlen oben ("24 Karten") lesen sich sonst wie ein abgeschlossenes
    // Set. Der Katalog wächst aber laufend weiter, unabhängig davon, was heute
    // auf dieser Seite steht — der Abschluss ist die Stelle, an der ein
    // Besucher fragt, ob das schon alles war. „Und wir entdecken immer wieder
    // neue" machte dabei die Redaktion zum Sammler (Betreiber, 07.09.2026:
    // „kann raus oder muss besser formuliert werden") — jetzt wächst der
    // Katalog, ohne dass jemand im Satz steht.
    expect(render()).toContain('Und es kommen laufend neue dazu.');
    expect(render('en')).toContain('And new ones keep coming.');
  });

  it('locale-prefixes both closing links for en', () => {
    const html = render('en');
    expect(html).toMatch(/href="\/en\/map"/);
    expect(html).toMatch(/href="\/en\/packs"/);
  });

  it('closes with a single pack shot, not the nine-pack billboard', () => {
    // The page advertises the Must Eats. A wall of pack art at the end made the
    // last impression "shop" rather than "these dishes", and the same offer is
    // already on onboarding slide 3 and in the burger menu.
    const html = render();
    const packArt = html.match(/src="\/pics\/home\/starter-pack-front\.webp"/g) ?? [];

    expect(packArt).toEqual(['src="/pics/home/starter-pack-front.webp"']);
    expect(html).not.toContain('/pics/booster/booster_free.webp');
  });
});
