import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';

const authState = vi.hoisted(() => ({
  user: null as { displayName?: string | null; email?: string | null } | null,
  loading: false,
}));

vi.mock('@/lib/auth', () => ({ useAuth: () => authState }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    className,
  }: {
    children: ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock('./MapIntentLink', () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import HubHeroCopy from './HubHeroCopy';

function render(locale: 'de' | 'en' = 'de') {
  return renderToStaticMarkup(<HubHeroCopy locale={locale} />);
}

describe('HubHeroCopy', () => {
  beforeEach(() => { authState.user = null; authState.loading = false; });

  it('renders one accessible headline and the three selected Must Eats', () => {
    const html = render();
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('We tell you what to eat');
    expect(html).toContain('data-hero-mark');
    expect(html).toContain('Spicy Thai Sausage · Bar Basta');
    expect(html).toContain('Kinmedai Sashimi · November Brasserie');
    expect(html).toContain('Sabich · Kitten Deli');
    expect(html).toContain('href="/must-eats"');
    expect(html).toContain('href="/map"');
    expect(html).toContain('kostenlosen Map');
    expect(html).toContain('Zur Map');
    expect(render('en')).toContain('free map');
    expect(render('en')).toContain('Explore the map');
  });

  it('keeps exactly the same hero before and after sign-in, including hydration', () => {
    const guest = render();
    authState.loading = true;
    expect(render()).toBe(guest);
    authState.loading = false;
    authState.user = { displayName: 'Alex Tester', email: 'alex@example.com' };
    expect(render()).toBe(guest);
    expect(guest).not.toContain('data-auth-only');
    expect(guest).not.toContain('data-guest-only');
    expect(guest).not.toContain('href="/profile"');
  });
});
