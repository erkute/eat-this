import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { InitialMustEatsData } from '@/lib/map/initial-surface-data';
import type { MapMustEat } from '@/lib/types';
import { translations } from '@/lib/i18n/translations';

import MustEatsGallery from '@/app/components/MustEatsGallery';

const COPY = {
  numberLabel: 'Nr.',
  openKicker: 'Must Eat?',
  openTitle: 'Open title',
  openBody: 'Open body',
  setKicker: 'Das Set',
  coveredTitle: '2 warten vor Ort.',
  coveredBody: 'Covered body',
  spotAria: 'Spot-Seite öffnen',
  mapAria: 'auf der Map zeigen',
  setMore: 'Alle Karten zeigen',
};

/** Face-up: dish, image, text. Covered: what stripCoveredMustEats and
 *  trimCoveredSpot leave over — id, order, the spot's name and district. */
const open = (order: number, o: Partial<MapMustEat> = {}): MapMustEat => ({
  _id: `m${order}`,
  order,
  dish: `Dish ${order}`,
  image: `/api/must-eat-image/m${order}?v=0123456789ab`,
  description: `Text ${order}`,
  descriptionEn: `Text EN ${order}`,
  restaurant: { _id: `r${order}`, name: `Spot ${order}`, slug: `spot-${order}`, district: 'Mitte', lat: 1, lng: 1 },
  ...o,
});
const covered = (order: number): MapMustEat => ({
  _id: `m${order}`,
  order,
  restaurant: { _id: `r${order}`, name: `Hidden ${order} Mitte`, slug: `hidden-${order}`, district: 'Mitte', lat: 0, lng: 0 },
});

// Arrives face-up first, the way selectMustEatsCatalog hands it over.
const DATA: InitialMustEatsData = {
  mustEats: [open(2), open(5), covered(1), covered(3)],
  revealedMustEatIds: ['m2', 'm5'],
};

const routerStub = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
} as unknown as AppRouterInstance;

function render(data: InitialMustEatsData = DATA, locale: 'de' | 'en' = 'de', coverIds: string[] = []) {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={routerStub}>
      <NextIntlClientProvider locale={locale} messages={translations[locale]} timeZone="Europe/Berlin">
        <MustEatsGallery coverIds={coverIds} initialMapData={data} copy={COPY} />
      </NextIntlClientProvider>
    </AppRouterContext.Provider>
  );
}

function section(html: string, band: string): string {
  const start = html.indexOf(`data-band="${band}"`);
  const end = html.indexOf('</section>', start);
  return html.slice(start, end);
}

describe('MustEatsGallery', () => {
  it('lays out only the covered cards below, by card number — face-up ones stay above', () => {
    const labels = [...section(render(), 'set').matchAll(/aria-label="([^"]+)"/g)].map((m) => m[1]);
    expect(labels).toEqual([
      'Nr. 001, Verdeckt, Hidden 1, auf der Map zeigen',
      'Nr. 003, Verdeckt, Hidden 3, auf der Map zeigen',
    ]);
  });

  it('does not repeat cover cards in the face-up gallery', () => {
    const feature = section(render(DATA, 'de', ['m2']), 'open');
    expect(feature).not.toContain('Dish 2');
    expect(feature).toContain('Dish 5');
  });

  it('captions a covered card with its spot only, not „Verdeckt“ again', () => {
    const set = section(render(), 'set');
    expect(set).not.toMatch(/>Verdeckt</);
  });

  it('links every card, face-up or covered, to its spot on the map', () => {
    const html = render();
    const set = section(html, 'set');
    expect(set).toContain('href="/map?r=hidden-1"');
    expect(section(html, 'open')).toContain('href="/map?r=spot-2"');
    expect(render(DATA, 'en')).toContain('href="/en/map?r=hidden-1"');
  });

  it('falls back to the card itself on the map when the spot has no slug', () => {
    const noSlug = covered(7);
    noSlug.restaurant.slug = '';
    const html = render({ mustEats: [noSlug], revealedMustEatIds: [] });
    expect(html).toContain('href="/map?me=m7"');
  });

  it('starts the set collapsed to one row, with a button for the rest', () => {
    const many = Array.from({ length: 8 }, (_, i) => covered(i + 1));
    const set = section(render({ mustEats: many, revealedMustEatIds: [] }), 'set');
    expect(set).toMatch(/<ol[^>]*data-collapsed=""/);
    expect(set).toMatch(/<button[^>]*class="et-btn"[^>]*aria-expanded="false"[^>]*>Alle Karten zeigen<\/button>/);
  });

  it('drops the button when the set already fits one phone row', () => {
    const set = section(render({ mustEats: [covered(1), covered(2), covered(3)], revealedMustEatIds: [] }), 'set');
    expect(set).not.toContain('Alle Karten zeigen');
  });

  it('captions each face-up card with dish and spot link — no number, no description', () => {
    const feature = section(render(), 'open');
    expect(feature).not.toMatch(/>Nr\. 002</);
    expect(feature).toContain('Dish 2');
    expect(feature).toContain('href="/restaurant/spot-2"');
    expect(feature).not.toContain('Mitte');
    expect(feature).not.toContain('Text 2');
    expect(feature).not.toContain('Verdeckt');
  });

  it('links the spot under its locale on /en', () => {
    expect(render(DATA, 'en')).toContain('href="/en/restaurant/spot-2"');
  });

  it('shows a price only when it carries a number', () => {
    const html = render({
      mustEats: [open(2, { price: '€' }), open(5, { price: '14 €' })],
      revealedMustEatIds: ['m2', 'm5'],
    });
    expect(html).toContain('14 €');
    expect(html).not.toMatch(/>€</);
  });

  it('names the spot under a covered card, without its district and without a text link', () => {
    const set = section(render(), 'set');
    expect(set).toContain('>Hidden 1<');
    expect(set).not.toContain('Hidden 1 Mitte');
    expect(set).not.toMatch(/<a[^>]*>Hidden/);
  });

  it('drops the covered section when every card is face-up', () => {
    expect(render({ mustEats: [open(2)], revealedMustEatIds: ['m2'] })).not.toContain('data-band="set"');
  });

  it('renders nothing for an empty catalog', () => {
    expect(render({ mustEats: [], revealedMustEatIds: [] })).not.toContain('<section');
  });
});
