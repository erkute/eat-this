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

/** The sheet as a SIGNED-IN reader sees it: the account is spent, so what is
 *  left to offer is a pack. */
function html(r: MapRestaurant) {
  return renderToStaticMarkup(
    <LockedDetail
      restaurant={r}
      signedIn
      claimPending={false}
      contentRef={null}
      onClose={() => {}}
    />
  );
}

/** The same spot seen by a visitor WITHOUT an account. Since 2026-08-26 that
 *  is every grey dot, not only the ones in the signed tier — signing up claims
 *  the tapped spot, so the offer is true everywhere. */
function signupHtml(r: MapRestaurant) {
  return renderToStaticMarkup(
    <LockedDetail
      restaurant={r}
      signedIn={false}
      claimPending={false}
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
    expect(out.indexOf('Im Erdgeschoss')).toBeLessThan(out.indexOf('href="/packs"'));
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

  it('shows it above the signup as well, not only above the packs', () => {
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

  it('sends the one CTA to the packs page, not to a single product', () => {
    // Auswahl, Größen und Preise gehören auf /packs; diese Sheet muss nur Lust
    // auf den Spot machen (user, 2026-08-24).
    const out = html(spot());
    expect(out).toContain('href="/packs"');
    expect(out).toContain('Packs ansehen');
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

  it('makes exactly one offer — one card, one CTA', () => {
    // Zwei Pack-Karten plus ein Link zur Übersicht waren drei Wege aus einer
    // Sheet mit einer Frage (user, 2026-08-24).
    const out = html(spot());
    expect(out.match(/href="\/pack/g)?.length).toBe(1);
    expect(out).not.toContain('/pack/lunch');
    expect(out).not.toContain('/pack/all-berlin');
  });

  it('keeps the offer short — no counts, no product names to weigh up', () => {
    const out = html(spot());
    expect(out).not.toContain('345');
    expect(out).not.toContain('Ganz Berlin');
    expect(out).toContain('Ein Pack öffnet ihn — und viele weitere dazu.');
  });

  it('says the spot is face down once, not twice', () => {
    // The kicker states it; a headline underneath repeated it one type step
    // larger and said nothing new (user, 2026-08-23).
    const out = html(spot());
    expect(out).toContain('Noch verdeckt');
    expect(out).not.toContain('Liegt noch nicht auf deiner Map.');
    // Und die Karte sagt, was zu holen ist (user, 2026-08-24).
    expect(out).toContain('Diesen Spot freischalten');
  });

  it('makes the same offer to a spot no category pack covers', () => {
    // Das Angebot hängt nicht mehr an der Kategorie des Spots.
    const out = html(spot({ categories: [] }));
    expect(out).toContain('href="/packs"');
    expect(out).toContain('Diesen Spot freischalten');
  });

  it('fans out the packs as art, the way /packs does', () => {
    // One generic bag cannot say "there are several". Nine can.
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

describe('LockedDetail, visitor without an account', () => {
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

  it('never shows a price to someone who has not even left an email', () => {
    /* The rule the 2026-08-26 change exists for: one rung at a time. Before it,
       the offer hung on the tier the spot sat in, so ~144 of ~194 grey dots put
       a pack in front of an anonymous visitor. Now nothing does. */
    const out = signupHtml(spot());
    expect(out).not.toContain('href="/packs"');
    expect(out).not.toContain('Packs ansehen');
  });

  it('holds the sign-up branch while a returning magic link claims the spot', () => {
    /* The email rung signs the reader in on /welcome and drops them back on
       this spot. For the beat between "signed in" and "spot actually open" the
       sheet must not fall through to the pack offer — that is the price tag
       landing on the very spot the mail just promised them. */
    const out = renderToStaticMarkup(
      <LockedDetail
        restaurant={spot()}
        signedIn
        claimPending
        contentRef={null}
        onClose={() => {}}
      />
    );
    expect(out).toContain('Starter Pack');
    expect(out).toContain('Wir schliessen auf');
    expect(out).not.toContain('href="/packs"');
  });

  it('makes the same offer on a spot far beyond the signed tier', () => {
    /* Tier flags no longer reach this component at all — an account opens the
       tapped spot either way, because signing up claims it. */
    const out = signupHtml(spot({ _id: 'r-deep', slug: 'tief-im-katalog' }));
    expect(out).toContain('Schaltet diesen Spot frei. Und viele weitere.');
    expect(out).not.toContain('href="/packs"');
  });
});
