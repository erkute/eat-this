// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MapMustEat } from '@/lib/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) => {
    if (key === 'albumGroupProgress')
      return `${vars?.group}: ${vars?.done} von ${vars?.total} aufgedeckt`;
    if (key === 'albumToSpot') return `Zu ${vars?.name}`;
    return key;
  },
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

const player = { name: 'Ersan', avatarIdx: 1, onPick: () => {} };

afterEach(cleanup);

describe('ProfileAlbum', () => {
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
        groupOf={() => 'Mitte'}
        player={player}
      />
    );

    const image = container.querySelector<HTMLImageElement>('img[src="/api/must-eat-image/m1"]');
    expect(image).not.toBeNull();
    expect(image?.getAttribute('loading')).toBe('lazy');
  });

  /* Die Bezirke gab es hier immer; bis zum 04.09.2026 brachen sie das Raster
     in sieben angebrochene Zeilen. Jetzt sind sie Reiter — die Gruppierung
     lebt in der Filterleiste weiter, nicht mehr im Rost. */
  it('stellt die Bezirke als Reiter mit eigenem Zaehler und filtert danach', () => {
    const at = (id: string, district: string, open: boolean, order: number): MapMustEat => ({
      _id: id,
      dish: id,
      order,
      ...(open ? { image: `/api/must-eat-image/${id}` } : {}),
      restaurant: { _id: `r-${id}`, name: 'R', slug: 'r', lat: 0, lng: 0, district },
    });
    const mustEats = [
      at('a', 'Kreuzberg', true, 5),
      at('b', 'Kreuzberg', false, 12),
      at('c', 'Mitte', false, 7),
    ];

    render(
      <ProfileAlbum
        mustEats={mustEats}
        faceUpIds={new Set(['a'])}
        groupOf={(m) => m.restaurant.district ?? 'Berlin'}
        player={player}
      />
    );

    /* Der Zaehler steht im aria-label, nicht nur als „1/2" im Text: „ein
       Zweitel" ist keine Ansage. */
    const kreuzberg = screen.getByRole('button', { name: 'Kreuzberg: 1 von 2 aufgedeckt' });
    expect(screen.getByRole('button', { name: 'Mitte: 0 von 1 aufgedeckt' })).toBeTruthy();

    /* Die Nummer ist die der KARTE (`order`), dreistellig wie im Druck —
       nicht die laufende Position im Raster. */
    expect(screen.getByLabelText('lockedSubhead — 007')).toBeTruthy();

    fireEvent.click(kreuzberg);
    expect(kreuzberg.getAttribute('aria-pressed')).toBe('true');
    /* Karte 007 liegt in Mitte und ist mit dem Kreuzberg-Reiter aus dem Rost. */
    expect(screen.queryByLabelText('lockedSubhead — 007')).toBeNull();
    expect(screen.getByLabelText('lockedSubhead — 012')).toBeTruthy();
  });

  /* Ein leerer Platz ohne Beschriftung ist ein Loch; mit dem Lokal darauf ist
     er eine Aufgabe. Der Name kommt aus der Huelle der verdeckten Karte —
     die traegt kein Gericht und kein Bild, aber sehr wohl ihren Spot. */
  it('beschriftet den leeren Platz mit Nummer und Lokal', () => {
    const covered: MapMustEat = {
      _id: 'm2',
      order: 26,
      restaurant: { _id: 'r2', name: 'Cafe Kranzler', slug: 'kranzler', lat: 0, lng: 0 },
    };

    const { container } = render(
      <ProfileAlbum
        mustEats={[covered]}
        faceUpIds={new Set()}
        groupOf={() => 'Mitte'}
        player={player}
      />
    );

    const slot = screen.getByLabelText('lockedSubhead — 026');
    expect(slot.textContent).toContain('026');
    expect(slot.textContent).toContain('Cafe Kranzler');
    /* Und weiterhin kein Gericht, kein Bild der Karte: nur die Rueckseite. */
    expect(container.querySelector('img[src^="/api/must-eat-image"]')).toBeNull();
  });

  /* Der Zoom einer verdeckten Karte war eine Sackgasse: Rueckseite gross, und
     der einzige Weg weiter war Zumachen. Er fuehrt jetzt auf den SPOT — ein
     Spot traegt mehrere Karten, und wer hier steht, will wissen, wo er hin
     muss. Aufgedeckte Karten bekommen den Ausgang nicht: dort ist nichts
     mehr zu holen. */
  it('fuehrt aus dem Zoom einer verdeckten Karte zum Spot, aus einer offenen nicht', () => {
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
        groupOf={() => 'Mitte'}
        player={player}
      />
    );

    fireEvent.click(screen.getByLabelText('lockedSubhead — 004'));
    const exit = screen.getByRole('link', { name: 'Zu Atelier Dough' });
    expect(exit.getAttribute('href')).toBe('/map?r=atelier-dough');

    cleanup();
    render(
      <ProfileAlbum
        mustEats={[covered, open]}
        faceUpIds={new Set(['m4'])}
        groupOf={() => 'Mitte'}
        player={player}
      />
    );
    fireEvent.click(screen.getByLabelText('Donut'));
    expect(screen.getByTestId('zoom').querySelector('a')).toBeNull();
  });
});
