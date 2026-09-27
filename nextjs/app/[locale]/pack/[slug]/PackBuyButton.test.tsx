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
  it('lets an embedding surface own the complete button class', () => {
    const html = renderToStaticMarkup(<PackBuyButton {...props} className="overview-buy" />);

    expect(html).toContain('class="overview-buy"');
    expect(html).not.toMatch(/class="[^"]+ overview-buy"/);
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
