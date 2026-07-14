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
  beforeEach(() => {
    authState.user = null;
    authState.loading = false;
  });

  it('renders the reference copy for signed-out visitors', () => {
    const html = render();
    expect(html).toContain('Was du essen solltest.');
    expect(html).toContain('We tell you');
    expect(html).toContain('Was ist um mich?');
    expect(html).not.toContain('Deine Map');
  });

  it('keeps the same hero structure while restoring signed-in copy', () => {
    authState.user = { displayName: 'Ersan Tester', email: 'ersan@example.com' };
    const html = render();
    expect(html).toContain('Hey Ersan');
    expect(html).toContain('Deine Map');
    expect(html).toContain('wartet.');
    expect(html).toContain('href="/profile"');
    expect(html).toContain('Profil');
    expect(html).not.toContain('Was ist um mich?');
  });

  it('renders matched pre-paint shells while auth is loading', () => {
    authState.loading = true;
    const html = render();
    expect(html).toContain('data-guest-only');
    expect(html).toContain('data-auth-only');
    expect(html).toContain('We tell you');
    expect(html).toContain('Deine Map');
  });
});
