import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MapRestaurant } from '@/lib/types';

vi.mock('next-intl', () => ({ useLocale: () => 'de' }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'map.lockedDetailKicker' ? 'Noch verdeckt' : key),
  }),
}));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/lib/map', () => ({ abbreviateBezirk: (s: string | null) => s }));
const detail = { current: null as null | Record<string, string> };
vi.mock('@/lib/map/useRestaurantDetail', () => ({
  useRestaurantDetail: () => ({ detail: detail.current, loading: false }),
}));
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ signInWithGoogle: vi.fn() }),
  useMagicLink: () => ({ sendLink: vi.fn(), state: 'idle', errorMessage: '', reset: vi.fn() }),
}));

import LockedDetail from './LockedDetail';

function spot(over: Partial<MapRestaurant> = {}): MapRestaurant {
  return {
    _id: 'r1',
    name: 'Testspot',
    slug: 'testspot',
    lat: 52.52,
    lng: 13.4,
    bezirk: { name: 'Kreuzberg' },
    categories: [{ slug: 'lunch', name: 'Lunch' }],
    mustEatCount: 0,
    ...over,
  } as MapRestaurant;
}

function html(r: MapRestaurant, total = 345) {
  return renderToStaticMarkup(
    <LockedDetail
      restaurant={r}
      totalSpots={total}
      unlocksWithAccount={false}
      contentRef={null}
      onClose={() => {}}
    />
  );
}

/** The same spot, but sitting in the signed tier — an account opens it. */
function signupHtml(r: MapRestaurant, total = 345) {
  return renderToStaticMarkup(
    <LockedDetail
      restaurant={r}
      totalSpots={total}
      unlocksWithAccount
      contentRef={null}
      onClose={() => {}}
    />
  );
}

describe('LockedDetail story excerpt', () => {
  afterEach(() => {
    detail.current = null;
  });

  it("opens with the spot's own story, above whatever is being sold", () => {
    detail.current = { description: 'Im Erdgeschoss des Grand Hyatt.' };
    const out = html(spot());
    expect(out).toContain('Im Erdgeschoss des Grand Hyatt.');
    // Before the paywall: the reader meets the restaurant, then the price.
    expect(out.indexOf('Im Erdgeschoss')).toBeLessThan(out.indexOf('Noch verdeckt'));
    expect(out.indexOf('Im Erdgeschoss')).toBeLessThan(out.indexOf('/pack/lunch'));
  });

  it('prefers the long story, exactly as the unlocked sheet does', () => {
    // Same source and fallback order, so the cut lands inside the very text
    // the unlocked sheet would show — not inside a different, shorter one.
    detail.current = { description: 'Die lange Geschichte.', shortDescription: 'Der Einzeiler.' };
    const out = html(spot());
    expect(out).toContain('Die lange Geschichte.');
    expect(out).not.toContain('Der Einzeiler.');
  });

  it('falls back to the one-liner when there is no story', () => {
    detail.current = { shortDescription: 'Der Einzeiler.' };
    expect(html(spot())).toContain('Der Einzeiler.');
  });

  it('shows it on the free tier too, above the signup', () => {
    detail.current = { description: 'Japanische Küche am Potsdamer Platz.' };
    const out = signupHtml(spot());
    expect(out.indexOf('Japanische Küche')).toBeLessThan(out.indexOf('Starter Pack'));
  });

  it('renders nothing rather than a gap while the fetch is still out', () => {
    detail.current = null;
    expect(html(spot())).not.toContain('excerpt');
  });

  it('never links to the restaurant page it borrows the prose from', () => {
    // The prose is public on /restaurant/<slug>; pointing there is still the
    // thing that sells against the pack (user decision, 2026-08-19).
    detail.current = { description: 'Japanische Küche am Potsdamer Platz.' };
    expect(html(spot())).not.toContain('/restaurant/testspot');
  });
});

describe('LockedDetail', () => {
  it('never links to the restaurant page', () => {
    /* Those articles exist for search. Telling a paying-curious visitor that
       this spot is readable for free sells against the pack directly above it
       (user decision, 2026-08-19). This is the assertion that decision needs. */
    const out = html(spot());
    expect(out).not.toContain('/restaurant/testspot');
    expect(out).not.toContain('frei lesen');
  });

  it('drops the "you can read it anyway" line', () => {
    expect(html(spot())).not.toContain('nur die Map kostet');
  });

  it('leads with the pack that actually unlocks this spot', () => {
    const out = html(spot());
    expect(out).toContain('/pack/lunch');
    expect(out).toContain('Lunch');
  });

  it('names no price — the CTA carries the action, the pack page the price', () => {
    // The rotated price badge went once the cards gained a CTA (user,
    // 2026-08-23): art, badge, label, spectrum and pill on one card was more
    // than the card could hold.
    const out = html(spot());
    expect(out).not.toContain('2,99');
    expect(out).not.toContain('9,99');
    expect(out).not.toContain('€');
  });

  it('offers all-Berlin with its size, not a bare slogan', () => {
    const out = html(spot());
    expect(out).toContain('/pack/all-berlin');
    expect(out).toContain('Ganz Berlin · 345 Spots');
  });

  it('says the spot is face down once, not twice', () => {
    // The kicker states it; a headline underneath repeated it one type step
    // larger and said nothing new (user, 2026-08-23).
    const out = html(spot());
    expect(out).toContain('Noch verdeckt');
    expect(out).not.toContain('Liegt noch nicht auf deiner Map.');
    expect(out).toContain('Ein Pack schaltet diesen Spot frei. Und jeden anderen darin.');
  });

  it('falls back to all-Berlin alone when no category pack applies', () => {
    const out = html(spot({ categories: [] }));
    expect(out).toContain('/pack/all-berlin');
    expect(out).not.toContain('/pack/lunch');
  });

  it('states a spot count for all-Berlin only', () => {
    /* A category count invites the comparison that sinks the bundle: Dinner
       alone is 225 of 340 spots and Lunch 205, so "225 Spots · 2,99 €" beside
       the bundle argues against the bundle every time. */
    const out = html(spot());
    const lunchBlock = out.slice(out.indexOf('/pack/lunch'), out.indexOf('/pack/all-berlin'));
    expect(lunchBlock).not.toContain('Spots');
    expect(out.slice(out.indexOf('/pack/all-berlin'))).toContain('Spots');
  });

  it('says what a tap on each pack does', () => {
    // The cards are pack art, not buttons — but art alone never named the
    // action, while the free offer beside them ends in a plain CTA.
    const out = html(spot());
    expect(out).toContain('Lunch holen');
    expect(out).toContain('map.listEndCta');
  });

  it('shows the category pack as its own art', () => {
    expect(html(spot())).toContain('booster_lunch.webp');
  });

  it('fans out all nine packs for all-Berlin, the way /packs does', () => {
    // One generic bag cannot say "everything". Nine can.
    const out = html(spot());
    for (const art of [
      'booster_breakfast',
      'booster_coffee',
      'booster_dinner',
      'booster_drinks',
      'booster_fastfood',
      'booster_finedining',
      'booster_lunch',
      'booster_pizza',
      'booster_sweets',
    ]) {
      expect(out).toContain(`${art}.webp`);
    }
  });

  it('still names the spot — the name is not what the paywall covers', () => {
    expect(html(spot())).toContain('Testspot');
  });
});

describe('LockedDetail, signed-tier spot', () => {
  it('offers the account instead of a pack', () => {
    const out = signupHtml(spot());
    // Leads with the tapped spot, but does not undersell the tier behind it.
    expect(out).toContain('Schaltet diesen Spot frei. Und viele weitere.');
  });

  it('wears the same Starter Pack identity as the home page', () => {
    // Two different-looking asks for the same free account read as two
    // different products. Same art, same badge, same name, same CTA.
    const out = signupHtml(spot());
    expect(out).toContain('booster_free.webp');
    expect(out).toContain('Gratis');
    expect(out).toContain('Starter Pack');
    expect(out).toContain('Starter Pack holen');
  });

  it('names the covered state here too — the Gratis badge prices, it does not state', () => {
    // Both branches say the spot is still face down; only the offer under it
    // differs. Dropping this from the free branch left it saying nothing at
    // all about why the sheet stops.
    expect(signupHtml(spot())).toContain('Noch verdeckt');
    expect(html(spot())).toContain('Noch verdeckt');
  });

  it('sells nothing here — a price under a free spot argues against itself', () => {
    const out = signupHtml(spot());
    expect(out).not.toContain('/pack/lunch');
    expect(out).not.toContain('/pack/all-berlin');
    expect(out).not.toContain('2,99 €');
    expect(out).not.toContain('9,99 €');
  });

  it('drops the pack wording that would contradict the free offer', () => {
    expect(signupHtml(spot())).not.toContain('Liegt noch nicht auf deiner Map.');
  });

  it('carries both sign-in paths', () => {
    const out = signupHtml(spot());
    expect(out).toContain('type="email"');
    expect(out).toContain('Mit Google anmelden');
  });

  it('keeps naming the spot, exactly as the pack variant does', () => {
    expect(signupHtml(spot())).toContain('Testspot');
  });
});
