// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MapMustEat } from '@/lib/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    values ? `${key}:${Object.values(values).join(',')}` : key,
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
  it('keeps numbered slots in one sequence regardless of whether their images are available', () => {
    const restaurant = { _id: 'r1', name: 'Spot', slug: 'spot', lat: 0, lng: 0 };
    render(
      <ProfileAlbum
        mustEats={[
          { _id: 'third', order: 3, dish: 'Third', image: '/api/must-eat-image/third', restaurant },
          { _id: 'first', order: 1, restaurant },
          {
            _id: 'second',
            order: 2,
            dish: 'Second',
            image: '/api/must-eat-image/second',
            restaurant,
          },
        ]}
        faceUpIds={new Set(['second', 'third'])}
      />
    );
    expect(
      screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))
    ).toEqual(['albumCard 001, Spot, Berlin', 'Second', 'Third']);
  });

  /* Der leere Platz sagt, wohin man muss: Spot, Bezirk und Nummer stehen auf dem
     Rücken. Das Gericht kennt das Album nicht — es kommt gar nicht erst an. */
  it('names spot and number on a covered card, the district only as page title', () => {
    const covered: MapMustEat = {
      _id: 'c1',
      order: 31,
      restaurant: { _id: 'r1', name: 'Bar Basta', slug: 'bar-basta', lat: 52.5, lng: 13.4 },
    };
    render(<ProfileAlbum mustEats={[covered]} faceUpIds={new Set()} groupOf={() => 'Mitte'} />);

    expect(screen.getByText('Bar Basta')).toBeTruthy();
    // Der Bezirk steht nur als Seitentitel, nicht noch einmal auf der Karte.
    expect(screen.getAllByText('Mitte')).toHaveLength(1);
    // Keine Nummer auf der Karte; nur im zugänglichen Namen.
    expect(screen.queryByText(/031/)).toBeNull();
    expect(screen.getByRole('button', { name: 'albumCard 031, Bar Basta, Mitte' })).toBeTruthy();
  });

  const spot = (id: string, name: string, order: number, restaurantId: string): MapMustEat => ({
    _id: id,
    order,
    restaurant: { _id: restaurantId, name, slug: name.toLowerCase(), lat: 52.5, lng: 13.4 },
  });

  it('lays the album out as one page per district, each with its title', () => {
    render(
      <ProfileAlbum
        mustEats={[
          spot('a', 'Alpha', 1, 'r1'),
          spot('b', 'Beta', 2, 'r2'),
          spot('c', 'Gamma', 3, 'r3'),
        ]}
        faceUpIds={new Set()}
        groupOf={(m) => (m._id === 'b' ? 'Wedding' : 'Mitte')}
      />
    );

    // Über allem steht „Dein Deck“, die Bezirke sind seine Unterabschnitte.
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('deckHeading');
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(['Mitte', 'Wedding']);
    expect(screen.getAllByRole('region')).toHaveLength(2);
  });

  it('holds back the count and the hand until the data of this visit is there', () => {
    const open: MapMustEat = {
      _id: 'o1',
      order: 1,
      dish: 'Ramen',
      image: '/api/must-eat-image/o1',
      restaurant: { _id: 'r1', name: 'Bar Basta', slug: 'bar-basta', lat: 52.5, lng: 13.4 },
    };
    const { container, rerender } = render(
      <ProfileAlbum mustEats={[open]} faceUpIds={new Set(['o1'])} countReady={false} />
    );
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-busy')).toBe('true');
    expect(bar.querySelector('strong')?.textContent).not.toMatch(/\d/);
    expect(container.querySelector('[class*="handFan"]')).toBeNull();

    rerender(<ProfileAlbum mustEats={[open]} faceUpIds={new Set(['o1'])} countReady />);
    expect(screen.getByRole('progressbar').getAttribute('aria-busy')).toBe('false');
    expect(screen.getByRole('progressbar').querySelector('strong')?.textContent).toBe('1');
    expect(container.querySelector('[class*="handFan"]')).not.toBeNull();
  });

  it('shows no spot labels on an open card', () => {
    const open: MapMustEat = {
      _id: 'o1',
      order: 5,
      dish: 'Ramen',
      image: '/api/must-eat-image/o1',
      restaurant: { _id: 'r1', name: 'Bar Basta', slug: 'bar-basta', lat: 52.5, lng: 13.4 },
    };
    render(<ProfileAlbum mustEats={[open]} faceUpIds={new Set(['o1'])} />);

    expect(screen.queryByText('Bar Basta')).toBeNull();
    expect(screen.getByRole('button', { name: 'Ramen' })).toBeTruthy();
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

    const { container } = render(<ProfileAlbum mustEats={mustEats} faceUpIds={new Set(['m1'])} />);

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

  it('zeigt auf einer verdeckten Karte nur den Rücken, nie Gericht oder Bild', () => {
    const covered: MapMustEat = {
      _id: 'm2',
      order: 26,
      restaurant: { _id: 'r2', name: 'Cafe Kranzler', slug: 'kranzler', lat: 0, lng: 0 },
    };

    const { container } = render(<ProfileAlbum mustEats={[covered]} faceUpIds={new Set()} />);

    const slot = screen.getByLabelText('albumCard 026, Cafe Kranzler, Berlin');
    expect(slot.querySelector('img')?.getAttribute('src')).toContain('/pics/card-back.webp');
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

    render(<ProfileAlbum mustEats={[covered, open]} faceUpIds={new Set(['m4'])} />);

    fireEvent.click(screen.getByLabelText('albumCard 004, Atelier Dough, Berlin'));
    expect(
      screen.getByRole('link', { name: 'albumToSpot:Atelier Dough' }).getAttribute('href')
    ).toBe('/map?me=m3');
  });

  it('öffnet auch aus einer offenen Karte das zugehörige Must-Eat-Detail', () => {
    const open: MapMustEat = {
      _id: 'm4',
      dish: 'Donut',
      order: 17,
      image: '/api/must-eat-image/m4',
      restaurant: { _id: 'r4', name: 'Bubar', slug: 'bubar', lat: 0, lng: 0 },
    };

    render(<ProfileAlbum mustEats={[open]} faceUpIds={new Set(['m4'])} />);

    fireEvent.click(screen.getByLabelText('Donut'));
    expect(screen.getByRole('link', { name: 'albumOpenSpot' }).getAttribute('href')).toBe(
      '/map?me=m4'
    );
  });
});

describe('ProfileAlbum – Hand im Zählerband', () => {
  const restaurant = { _id: 'r1', name: 'Spot', slug: 'spot', lat: 0, lng: 0 };
  const card = (id: string, order: number): MapMustEat => ({
    _id: id,
    order,
    dish: id,
    image: `/api/must-eat-image/${id}`,
    restaurant,
  });
  const handOrder = (container: HTMLElement) =>
    [...container.querySelectorAll('[aria-hidden="true"] button img')].map(
      (img) => img.getAttribute('src')?.match(/must-eat-image\/(\w+)/)?.[1]
    );

  it('zeigt die zuletzt aufgedeckten Karten, die neueste in der Mitte', () => {
    const mustEats = ['a', 'b', 'c', 'd', 'e'].map((id, i) => card(id, i + 1));
    const { container } = render(
      <ProfileAlbum
        mustEats={mustEats}
        faceUpIds={new Set(['a', 'b', 'c', 'd', 'e'])}
        unlockedAt={
          new Map([
            ['a', 3_000],
            ['b', 1_000],
            ['c', 2_000],
          ])
        }
      />
    );
    expect(handOrder(container)).toEqual(['c', 'a', 'b']);
  });

  it('füllt ohne Zeitpunkte mit den höchsten Nummern auf', () => {
    const mustEats = ['a', 'b', 'c', 'd'].map((id, i) => card(id, i + 1));
    const { container } = render(
      <ProfileAlbum mustEats={mustEats} faceUpIds={new Set(['a', 'b', 'c', 'd'])} />
    );
    expect(handOrder(container)).toEqual(['c', 'd', 'b']);
  });

  it('öffnet eine Karte aus der Hand wie aus dem Raster', () => {
    const { container } = render(
      <ProfileAlbum mustEats={[card('m4', 17)]} faceUpIds={new Set(['m4'])} />
    );
    fireEvent.click(container.querySelector('[aria-hidden="true"] button')!);
    expect(screen.getByRole('link', { name: 'albumOpenSpot' }).getAttribute('href')).toBe(
      '/map?me=m4'
    );
  });
});
