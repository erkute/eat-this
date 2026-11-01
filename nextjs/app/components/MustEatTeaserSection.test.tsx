import { beforeEach, describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { MustEatPreview } from '@/lib/sanity.server';
import { translations } from '@/lib/i18n/translations';

const account = vi.hoisted(() => ({ uid: null as string | null, dataUid: null as string | null, loading: false, open: [] as string[] }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: account.uid ? { uid: account.uid } : null, loading: account.loading }) }));
vi.mock('@/lib/map/useMapData', () => ({ useMapData: () => ({ dataUid: account.dataUid, mustEats: [{ _id: 'me-1', image: '/api/must-eat-image/me-1?v=owned' }], revealedMustEatIds: new Set(account.open) }) }));

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

function render(list: MustEatPreview[], locale: 'de' | 'en' = 'de', publicOpen = false) {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={routerStub}>
      <NextIntlClientProvider
        locale={locale}
        messages={translations[locale]}
        timeZone="Europe/Berlin"
      >
        <MustEatTeaserSection
          mustEats={list}
          initialData={{ restaurants: [], categories: [], mustEats: list.map(card => ({ ...card, restaurant: { _id: 'sofi', name: 'SOFI', slug: 'sofi', lat: 0, lng: 0 }, image: publicOpen ? '/api/must-eat-image/'+card._id+'?v=public' : undefined })), totalCount: 0, revealedMustEatIds: publicOpen ? list.map(card => card._id) : [] }}
          name="SOFI"
          locale={locale}
          classNames={{ section: 'section', heading: 'heading' }}
        />
      </NextIntlClientProvider>
    </AppRouterContext.Provider>
  );
}

describe('MustEatTeaserSection', () => {
  beforeEach(() => { account.uid = null; account.dataUid = null; account.loading = false; account.open = []; });

  it('shows an account-owned card and keeps other cards covered', () => {
    account.uid = account.dataUid = 'owner'; account.open = ['me-1'];
    const html = render(mustEats('me-1', 'me-2'));
    expect(html).toContain('v=owned');
    expect(html.match(/data-card-state="open"/g)).toHaveLength(1);
    expect(html.match(/data-card-state="covered"/g)).toHaveLength(1);
  });

  it('shows public artwork before auth resolves and keeps it during cache loading', () => {
    account.loading = true;
    expect(render(mustEats('me-1'), 'de', true)).toContain('v=public');
    account.loading = false; account.uid = account.dataUid = 'owner';
    expect(render(mustEats('me-1'), 'de', true)).toContain('v=public');
    expect(render(mustEats('me-1'), 'de', true)).toContain('data-card-state="open"');
  });

  it('hides stale private artwork after sign-out or account changes', () => {
    account.dataUid = 'old-account'; account.open = ['me-1'];
    expect(render(mustEats('me-1'))).not.toContain('v=owned');
    account.uid = 'new-account';
    expect(render(mustEats('me-1'))).not.toContain('v=owned');
    account.uid = 'old-account'; account.loading = true;
    expect(render(mustEats('me-1'))).not.toContain('v=owned');
  });

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

  it('counts the cards and names the spot, in both languages', () => {
    expect(render(mustEats('a'))).toContain(
      'Ein Gericht von SOFI hat es auf unsere Karten geschafft.'
    );
    expect(render(mustEats('a', 'b'))).toContain(
      'Zwei Gerichte von SOFI haben es auf unsere Karten geschafft.'
    );
    expect(render(mustEats('a', 'b'), 'en')).toContain(
      'Two dishes from SOFI made it onto our cards.'
    );
  });

  it('uses each card as the map link without an additional CTA', () => {
    const html = render(mustEats('me-1', 'me-2'));
    expect(html.match(/<a\b[^>]*href="\/map\?me=[^"]+"/g)).toHaveLength(2);
    expect(html).not.toContain('et-btn');
    expect(html).not.toContain('>Aufdecken<');
  });
});
