// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MapMustEat } from '@/lib/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
/* Der Zoom selbst ist hier nicht der Gegenstand — nur, WAS das Album ihm als
   Ausgang mitgibt. Der Mock rendert darum genau diesen Slot. */
vi.mock('@/app/components/map/LazyMustEatImageLightbox', () => ({
  default: ({ active, action }: { active: boolean; action?: React.ReactNode }) =>
    active ? <div data-testid="zoom">{action}</div> : null,
}));
vi.mock('@/app/components/MapIntentLink', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import ProfileAlbum from './ProfileAlbum';

afterEach(cleanup);

describe('ProfileAlbum', () => {
  /* Zwei Wege, eine Karte zu bekommen — und nur einer hinterlaesst eine Spur.
     Der Stempel ist die einzige Auszeichnung im Deck, die es nicht zu kaufen
     gibt; verschwindet er aus dem Markup, ist der Unterschied wieder
     unsichtbar, so wie er es bis zum 06.09.2026 war. */
  it('stamps a card that was turned over on site, and only that one', () => {
    const mustEats: MapMustEat[] = [
      {
        _id: 'onsite',
        dish: 'Ramen',
        image: '/api/must-eat-image/onsite',
        order: 1,
        restaurant: { _id: 'r1', name: 'A', slug: 'a', lat: 52.5, lng: 13.4 },
      },
      {
        _id: 'bought',
        dish: 'Pizza',
        image: '/api/must-eat-image/bought',
        order: 2,
        restaurant: { _id: 'r2', name: 'B', slug: 'b', lat: 52.5, lng: 13.4 },
      },
    ];

    render(
      <ProfileAlbum
        mustEats={mustEats}
        faceUpIds={new Set(['onsite', 'bought'])}
        stampedIds={new Set(['onsite'])}
        groupOf={() => 'Mitte'}
      />
    );

    // Ein Stempel, nicht zwei — die gekaufte Karte traegt keinen.
    expect(screen.getAllByText('albumStamped')).toHaveLength(1);
    // Und er haengt an der richtigen Karte: der Knopf sagt es auch vorgelesen.
    expect(screen.getByRole('button', { name: 'Ramen — albumStamped' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pizza' })).toBeTruthy();
  });

  /* Das Starter Pack legt in jedes frische Deck fuenfzehn offene Karten, ein
     Kauf weitere. Ein Abzeichen zaehlt davon nichts — nur, wo jemand war.
     Sonst traegt jedes Konto eine Minute nach der Anmeldung „10 Karten", und
     ein gekauftes Pack macht einen Bezirk „komplett", in dem nie jemand
     stand. */
  it('vergibt Abzeichen fuer Stempel, nicht fuer offene Karten', () => {
    const mustEats: MapMustEat[] = [
      {
        _id: 'onsite',
        dish: 'Ramen',
        image: '/api/must-eat-image/onsite',
        order: 1,
        restaurant: { _id: 'r1', name: 'A', slug: 'a', lat: 52.5, lng: 13.4 },
      },
      {
        _id: 'gifted',
        dish: 'Pizza',
        image: '/api/must-eat-image/gifted',
        order: 2,
        restaurant: { _id: 'r2', name: 'B', slug: 'b', lat: 52.5, lng: 13.4 },
      },
    ];

    /* Zwei offene Karten, keine abgestempelt: nichts verdient. */
    const { rerender } = render(
      <ProfileAlbum
        mustEats={mustEats}
        faceUpIds={new Set(['onsite', 'gifted'])}
        stampedIds={new Set()}
        groupOf={() => 'Mitte'}
      />
    );
    expect(screen.queryByText('badgesHeading')).toBeNull();

    /* Eine davon vor Ort umgedreht: die erste Karte — aber der Bezirk ist
       nicht komplett, die zweite liegt nur offen. */
    rerender(
      <ProfileAlbum
        mustEats={mustEats}
        faceUpIds={new Set(['onsite', 'gifted'])}
        stampedIds={new Set(['onsite'])}
        groupOf={() => 'Mitte'}
      />
    );
    expect(screen.getByText('badgesHeading')).toBeTruthy();
    expect(screen.getByText('badgeFirstCard')).toBeTruthy();
    expect(screen.queryByText('badgeDistrict')).toBeNull();
  });

  it('loads protected Must-Eat images directly so the browser sends its capability cookie', () => {
    const mustEats: MapMustEat[] = [
      {
        _id: 'm1',
        dish: 'Ramen',
        image: '/api/must-eat-image/m1',
        restaurant: {
          _id: 'r1',
          name: 'Restaurant',
          slug: 'restaurant',
          lat: 52.5,
          lng: 13.4,
        },
      },
    ];

    const { container } = render(
      <ProfileAlbum
        mustEats={mustEats}
        faceUpIds={new Set(['m1'])}
        stampedIds={new Set()}
        groupOf={() => 'Mitte'}
      />
    );

    // Die Karte im Raster (ein Knopf) — nicht die Kopie im Faecher des Kopfes.
    // Ein Daumennagel aus der Routen-Leiter, nicht das Original (~100 kB):
    // das Raster zog sonst rund 2,5 MB (Prod-Log 25./26.09.2026).
    const image = container.querySelector<HTMLImageElement>(
      'button img[src="/api/must-eat-image/m1?w=360&auto=format&q=80"]'
    );
    expect(image).not.toBeNull();
    expect(image?.getAttribute('loading')).toBe('lazy');
    expect(image?.getAttribute('srcset')).toContain('/api/must-eat-image/m1?w=720');
  });

  /* Safari waehlt die srcset-Variante bei JEDER Attributaenderung neu. Deckte
     sich eine Karte auf, verwendete React das <img> der Rueckseite weiter und
     setzte nacheinander `src`, `srcset`, `sizes` — WebKit holte dabei die 360er
     UND (srcset ohne sizes = 100vw) die 720er. Prod-Log 26.09.2026: ein iPhone
     lud so jede Karte doppelt. Ein neues Element setzt React in der richtigen
     Reihenfolge (sizes, srcset, src). */
  it('baut beim Aufdecken ein neues <img>, statt das der Rueckseite umzuschreiben', () => {
    // Verdeckt kommt die Karte ohne Bild (die Nutzlast streift es ab), offen mit.
    const card = (image?: string): MapMustEat[] => [
      {
        _id: 'm1',
        dish: 'Ramen',
        ...(image ? { image } : {}),
        restaurant: { _id: 'r1', name: 'Restaurant', slug: 'restaurant', lat: 52.5, lng: 13.4 },
      },
    ];
    const props = {
      faceUpIds: new Set<string>(),
      stampedIds: new Set<string>(),
      groupOf: () => 'Mitte',
    };
    // Der Platz im Raster — nicht die Spielerkarte, die ebenfalls ein Knopf ist.
    const slotImage = () =>
      [...container.querySelectorAll<HTMLImageElement>('button img')].find((img) =>
        /card-back|must-eat-image/.test(img.getAttribute('src') ?? '')
      );

    const { container, rerender } = render(<ProfileAlbum {...props} mustEats={card()} />);
    const back = slotImage();
    expect(back?.getAttribute('src')).toContain('card-back');
    rerender(<ProfileAlbum {...props} mustEats={card('/api/must-eat-image/m1')} />);
    const open = slotImage();

    expect(open?.getAttribute('src')).toContain('/api/must-eat-image/m1');
    expect(open).not.toBe(back);
    const order = [...open!.attributes].map((a) => a.name);
    expect(order.indexOf('sizes')).toBeLessThan(order.indexOf('srcset'));
    expect(order.indexOf('srcset')).toBeLessThan(order.indexOf('src'));
  });

  it('zeigt verdeckte Karten ohne Spotnamen oder sichtbare Nummer', () => {
    const covered: MapMustEat = {
      _id: 'm2',
      order: 26,
      restaurant: { _id: 'r2', name: 'Cafe Kranzler', slug: 'kranzler', lat: 0, lng: 0 },
    };

    const { container } = render(
      <ProfileAlbum
        mustEats={[covered]}
        faceUpIds={new Set()}
        stampedIds={new Set()}
        groupOf={() => 'Mitte'}
      />
    );

    const slot = screen.getByLabelText('lockedSubhead — 026');
    expect(slot.textContent).toBe('');
    expect(slot.querySelector('img')?.getAttribute('src')).toContain('/pics/card-back.webp');
    /* Und weiterhin kein Gericht, kein Bild der Karte: nur die Rueckseite. */
    expect(container.querySelector('img[src^="/api/must-eat-image"]')).toBeNull();
  });

  it('öffnet aus einer verdeckten Karte das zugehörige Must-Eat-Detail', () => {
    const covered: MapMustEat = {
      _id: 'm3',
      order: 4,
      restaurant: { _id: 'r3', name: 'Atelier Dough', slug: 'atelier-dough', lat: 0, lng: 0 },
    };
    const open: MapMustEat = {
      _id: 'm4',
      dish: 'Donut',
      order: 17,
      image: '/api/must-eat-image/m4',
      restaurant: { _id: 'r4', name: 'Bubar', slug: 'bubar', lat: 0, lng: 0 },
    };

    render(
      <ProfileAlbum
        mustEats={[covered, open]}
        faceUpIds={new Set(['m4'])}
        stampedIds={new Set()}
        groupOf={() => 'Mitte'}
      />
    );

    fireEvent.click(screen.getByLabelText('lockedSubhead — 004'));
    expect(screen.getByRole('link', { name: 'albumOpenDetail' }).getAttribute('href')).toBe(
      '/map?me=m3'
    );
  });

  it('öffnet auch aus einer offenen Karte das zugehörige Must-Eat-Detail', () => {
    const open: MapMustEat = {
      _id: 'm4',
      dish: 'Donut',
      order: 17,
      image: '/api/must-eat-image/m4',
      restaurant: { _id: 'r4', name: 'Bubar', slug: 'bubar', lat: 0, lng: 0 },
    };

    render(
      <ProfileAlbum
        mustEats={[open]}
        faceUpIds={new Set(['m4'])}
        stampedIds={new Set()}
        groupOf={() => 'Mitte'}
      />
    );

    fireEvent.click(screen.getByLabelText('Donut'));
    expect(screen.getByRole('link', { name: 'albumOpenDetail' }).getAttribute('href')).toBe(
      '/map?me=m4'
    );
  });
});
