import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { MustEatPreview } from '@/lib/sanity.server';
import { translations } from '@/lib/i18n/translations';

import MustEatTeaserSection from '@/app/components/MustEatTeaserSection';

const routerStub = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
} as unknown as AppRouterInstance;

const mustEats = (...ids: string[]): MustEatPreview[] =>
  ids.map((_id, index) => ({ _id, order: index + 1 }) as MustEatPreview);

function render(list: MustEatPreview[], locale: 'de' | 'en' = 'de') {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={routerStub}>
      <NextIntlClientProvider
        locale={locale}
        messages={translations[locale]}
        timeZone="Europe/Berlin"
      >
        <MustEatTeaserSection mustEats={list} locale={locale} />
      </NextIntlClientProvider>
    </AppRouterContext.Provider>
  );
}

describe('MustEatTeaserSection', () => {
  it('renders nothing when the restaurant has no must-eat', () => {
    expect(render([])).toBe('');
  });

  // Der Kern: die Karte muss ein Ziel im HTML tragen. Als <button> stand dort
  // keines — kein neuer Tab, kein Mittelklick, und fuer Crawler kein Link.
  it('gives every card a real href to its own must-eat detail', () => {
    const html = render(mustEats('me-1', 'me-2'));

    expect(html).toContain('href="/map?me=me-1"');
    expect(html).toContain('href="/map?me=me-2"');
    expect(html).not.toContain('<button');
  });

  // ?me= ist die Detailansicht genau dieser Karte. Ein generisches /map stand
  // hier schon einmal und liess den Klick auf der Listenansicht liegen.
  it('never falls back to the bare map', () => {
    const html = render(mustEats('me-1'));

    expect(html).not.toMatch(/href="\/(en\/)?map"/);
  });

  it('counts the cards in the heading, in both languages', () => {
    expect(render(mustEats('a'))).toContain('Ein Gericht hat es auf unsere Karten geschafft.');
    expect(render(mustEats('a', 'b'))).toContain(
      'Zwei Gerichte haben es auf unsere Karten geschafft.'
    );
    expect(render(mustEats('a', 'b'), 'en')).toContain('Two dishes made it onto our cards.');
  });
});
