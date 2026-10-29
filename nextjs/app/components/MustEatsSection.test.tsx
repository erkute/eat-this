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
vi.mock('@/app/components/MustEatsStarterButton', () => ({
  default: ({ label }: { label: string }) => <button type="button">{label}</button>,
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
    expect(html).toMatch(/<h1[^>]*>Must Eats<\/h1>/);
  });

  it('renders the explanatory sub copy (de)', () => {
    const html = render();
    expect(html).toContain('Berlin hat viel auf der Karte. Wir sagen dir, was du bestellen solltest.');
  });

  it('renders the explanatory sub copy (en)', () => {
    const html = render('en');
    expect(html).toContain('Berlin has a lot on the menu. We tell you what to order.');
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

  it('hands the covered band its copy with the live count', () => {
    // Text wörtlich vom Betreiber (28.10.2026). Die Band-Copy geht als Prop in
    // die (gemockte) Gallery, nicht ins Markup.
    galleryCopy.mockClear();
    render('de', catalog());

    expect(galleryCopy).toHaveBeenCalledWith(
      expect.objectContaining({
        coveredTitle: '5 gute Gründe, loszugehen.',
        coveredBody:
          'Weitere 5 Karten sind noch verdeckt. Auf der Map findest du ihre Spots. Mit deinem Konto und freigegebenem Standort deckst du sie direkt vor Ort mit einem Tap auf und sammelst die Empfehlungen in deinem Deck.',
      })
    );
  });

  it('heads the face-up band without a count', () => {
    galleryCopy.mockClear();
    render('de', catalog());

    const copy = galleryCopy.mock.calls[0][0];
    expect(copy.openKicker).toBe('Schon aufgedeckt');
    expect(copy.openTitle).toBe('Das solltest du bestellen.');
    expect(copy.openTitle).not.toMatch(/\d/);
    expect(copy.openBody).not.toMatch(/\d/);
  });

  it('fans the two last face-up cards on the cover, the lowest of those in front', () => {
    // The catalog may arrive in any order; cards 3 and 9 form the cover.
    const data = catalog();
    data.mustEats.push(mustEat('9', true));
    data.revealedMustEatIds.push('9');
    const html = render('de', { ...data, mustEats: [...data.mustEats].reverse() });
    const figure = html.slice(html.indexOf('<figure'), html.indexOf('</figure>'));

    expect(figure).toContain('data-count="2"');
    expect(figure).not.toContain('aria-hidden');
    expect(figure).toContain('href="/map?r=3"');
    expect(figure).toContain('aria-label="Dish 3, auf der Map zeigen"');
    expect(figure).not.toContain('https://cdn/1.png');
    expect(figure).toContain('https://cdn/9.png');
    // Hinten → vorn im DOM: die vorderste Karte steht zuletzt.
    expect(figure).not.toContain('https://cdn/2.png');
    expect(figure.lastIndexOf('https://cdn/3.png')).toBeGreaterThan(figure.lastIndexOf('https://cdn/9.png'));
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

  it('closes with sign-up for guests and the map for accounts', () => {
    const html = render();
    const closing = html.slice(html.lastIndexOf('<section'));
    const guest = closing.slice(closing.indexOf('data-guest-only'), closing.indexOf('data-auth-only'));
    const auth = closing.slice(closing.indexOf('data-auth-only'));

    expect(closing).toContain('Hol sie dir.');
    // Gast: das Starter Pack zuerst, die Map als zweite Antwort, keine Packs.
    expect(guest).toContain('Starter Pack');
    expect(guest.indexOf('>Konto erstellen<')).toBeLessThan(guest.indexOf('href="/map"'));
    expect(guest).not.toContain('href="/packs"');
    // Konto: die Map vorn, Booster Packs dahinter.
    expect(auth.indexOf('href="/map"')).toBeLessThan(auth.indexOf('href="/packs"'));
  });

  it('describes the growing catalogue without promising automatically opened cards', () => {
    expect(render()).toContain('Nach und nach kommen neue Gerichte dazu, die du entdecken und als Karten sammeln kannst.');
    expect(render('en')).toContain('More dishes will be added over time for you to discover and collect as cards.');
    expect(render()).not.toContain('Alle 20 Karten liegen sofort offen');
    expect(render('en')).not.toContain('All 20 cards go straight into your deck face up');
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
    const packArt = html.match(/src="\/pics\/home\/starter-pack-front\.webp\?v=20261028"/g) ?? [];

    expect(packArt).toEqual(['src="/pics/home/starter-pack-front.webp?v=20261028"']);
    expect(html).not.toContain('/pics/booster/booster_free.webp');
    expect(html).not.toContain('/pics/booster/booster.webp');
    expect(html).toContain('/pics/booster/booster_lunch.webp?v=20261028');
  });
});
