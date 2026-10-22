import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PackBuyButton from './PackBuyButton';

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null }) }));
const ownership = vi.hoisted(() => ({ owned: new Set<string>() as Set<string> | null }));
vi.mock('@/app/components/PackOwnership', () => ({ usePackOwnership: () => ownership.owned }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));
afterEach(() => {
  ownership.owned = new Set();
});

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

const props = {
  packId: 'category-breakfast',
  packName: 'Breakfast',
  amountCents: 299,
  locale: 'de' as const,
  label: 'Kaufen',
  pendingLabel: 'Lädt',
  ownedLabel: 'Öffnen',
  ownedHref: '/profile',
  errorLabel: 'Fehler',
};

describe('PackBuyButton styling contract', () => {
  // Der Kauf ist immer der grosse Hausknopf (et-btn, globals.css); eine
  // einbettende Fläche gibt nur ihre Layout-Klasse dazu (22.10.2026: „alle
  // Buttons gleich").
  it('is always the large house button; an embedding surface only adds layout', () => {
    expect(renderToStaticMarkup(<PackBuyButton {...props} />)).toContain('class="et-btn et-btn-lg"');
    const html = renderToStaticMarkup(<PackBuyButton {...props} className="overview-buy" />);
    expect(html).toContain('class="et-btn et-btn-lg overview-buy"');
  });
});

describe('PackBuyButton ownership', () => {
  it.each(['category-breakfast', 'all-berlin'])('opens the map immediately for %s owners', (id) => {
    ownership.owned = new Set([id]);
    const html = renderToStaticMarkup(<PackBuyButton {...props} />);
    expect(html).toContain('href="/profile"');
    expect(html).not.toContain('<button');
  });
  it('does not treat another category as owned', () => {
    ownership.owned = new Set(['category-pizza']);
    const html = renderToStaticMarkup(<PackBuyButton {...props} />);
    expect(html).toContain('Kaufen');
    expect(html).not.toContain('disabled');
  });
  it('waits for ownership before offering a purchase', () => {
    ownership.owned = null;
    const html = renderToStaticMarkup(<PackBuyButton {...props} />);
    expect(html).toContain('disabled');
    expect(html).not.toContain('Kaufen');
  });
});
