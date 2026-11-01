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
  it('counts the complete catalogue, including covered cards, in both languages', () => {
    for (const locale of ['de', 'en'] as const) {
      const html = render(locale, catalog());
      expect(html).toMatch(/<dd>8<\/dd>/);
      expect(html).toContain('Must Eats in Berlin.');
      const head = html.slice(0, html.indexOf('</header>'));
      expect(head).toContain(locale === 'de' ? '20 weitere bekommst du mit deinem Konto im Starter Pack.' : 'your account adds 20 more in your Starter Pack.');
      expect(head).toContain(locale === 'de' ? 'Sammlung starten' : 'Start collecting');
      expect(head).toContain(locale === 'de' ? 'Dein Start: 30 Must Eats.' : 'Start with 30 Must Eats.');
    }
  });

  it('renders the Must Eats H1', () => {
    const html = render();
    expect(html).toMatch(/<h1[^>]*>Must Eats<\/h1>/);
  });

  it('renders the explanatory sub copy (de)', () => {
    const html = render();
    expect(html).toContain('Gerichte, die man kennen sollte.');
  });

  it('renders the explanatory sub copy (en)', () => {
    const html = render('en');
    expect(html).toContain('Dishes worth knowing.');
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

  it('explains discovering covered cards at the spot', () => {
    galleryCopy.mockClear();
    render('de', catalog());

    expect(galleryCopy).toHaveBeenCalledWith(
      expect.objectContaining({
        coveredTitle: 'Der Rest bleibt erstmal verdeckt.',
        coveredBody:
          'Viele Must Eats zeigen wir dir erst, wenn du am richtigen Spot stehst. Auf der Map siehst du, wo es etwas zu entdecken gibt. Vor Ort deckst du die Karte auf und fügst sie deiner Sammlung hinzu.',
      })
    );
  });

  it('heads the face-up band without a count', () => {
    galleryCopy.mockClear();
    render('de', catalog());

    const copy = galleryCopy.mock.calls[0][0];
    expect(copy.openKicker).toBe('Eine erste Auswahl');
    expect(copy.openTitle).toBe('Was probierst du als Nächstes?');
    expect(copy.openTitle).not.toMatch(/\d/);
  });

  it('fans up to five face-up cards on the cover in card order', () => {
    // Der Fächer bleibt auch bei ungeordnetem Katalog nach Kartennummer sortiert.
    const data = catalog();
    data.mustEats.push(mustEat('9', true));
    data.revealedMustEatIds.push('9');
    const html = render('de', { ...data, mustEats: [...data.mustEats].reverse() });
    const figure = html.slice(html.indexOf('<figure'), html.indexOf('</figure>'));

    expect(figure).toContain('data-count="4"');
    expect(figure).not.toContain('aria-hidden');
    expect(figure).toContain('href="/map?r=3"');
    expect(figure).toContain('aria-label="Dish 3, auf der Map zeigen"');
    expect(figure).toContain('https://cdn/1.png');
    expect(figure).toContain('https://cdn/9.png');
    // Hinten → vorn im DOM: die vorderste Karte steht zuletzt.
    expect(figure).toContain('https://cdn/2.png');
    expect(figure.lastIndexOf('https://cdn/3.png')).toBeGreaterThan(figure.lastIndexOf('https://cdn/9.png'));
  });

  it('shows no cover and no card back up top when nothing is face-up', () => {
    const html = render('de', {
      mustEats: [mustEat('covered', false)],
      revealedMustEatIds: [],
    });

    // The closing pack poster has covered cards of its own; up top there are none.
    const top = html.slice(0, html.indexOf('data-pack-poster'));
    expect(top).not.toContain('<figure');
    expect(top).not.toContain('/pics/card-back.webp');
  });

  it('keeps the empty catalog to the head and the close — no zero stats', () => {
    const html = render('de', EMPTY);

    expect(html).not.toContain('<dl');
    expect(html).not.toContain('<figure');
    expect(html).toContain('Hol sie dir.');
  });

  it('closes with sign-up for guests and the map for accounts', () => {
    const html = render();
    const closing = html.slice(html.indexOf('<section data-guest-only'));
    const guest = closing.slice(0, closing.indexOf('data-auth-only'));
    const auth = closing.slice(closing.indexOf('data-auth-only'));

    expect(closing).toContain('Hol sie dir.');
    // Gast: das Starter Pack zuerst, die Map als zweite Antwort, keine Packs.
    expect(guest).toContain('Starter Pack');
    expect(guest).toContain('20 Karten. Der Anfang deiner Sammlung.');
    expect(guest).toContain('20 weitere Must Eats im Starter Pack.');
    expect(guest.indexOf('>Konto erstellen<')).toBeLessThan(guest.indexOf('href="/map"'));
    expect(guest).not.toContain('href="/packs"');
    // Konto: die Map vorn, Booster Packs dahinter.
    expect(auth.indexOf('href="/map"')).toBeLessThan(auth.indexOf('href="/packs"'));
  });

  it('describes the growing catalogue without promising automatically opened cards', () => {
    expect(render()).toContain('Neue Empfehlungen kommen regelmäßig dazu.');
    expect(render('en')).toContain('New recommendations are added regularly.');
    expect(render()).not.toContain('Alle 20 Karten liegen sofort offen');
    expect(render('en')).not.toContain('All 20 cards go straight into your deck face up');
  });

  it('locale-prefixes both closing links for en', () => {
    const html = render('en');
    expect(html).toMatch(/href="\/en\/map"/);
    expect(html).toMatch(/href="\/en\/packs"/);
  });

  it('closes with the pack poster: the Starter Pack for guests, Booster Packs for accounts', () => {
    const html = render();
    const guest = html.slice(html.indexOf('<section data-guest-only'), html.indexOf('<section data-auth-only'));
    const auth = html.slice(html.indexOf('<section data-auth-only'));

    expect(guest).toContain('data-offer="starter"');
    expect(guest.match(/starter-pack-front\.webp/g)).toHaveLength(1);
    expect(guest).not.toContain('/pics/booster/');
    expect(auth).toContain('data-offer="booster"');
    expect(auth).not.toContain('starter-pack-front.webp');
    expect(auth.match(/\/pics\/booster\/booster_\w+\.webp/g)).toHaveLength(5);
  });
});
