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
    // One CTA only — the nearby prompt lives in the Nearby section now.
    expect(html).toContain('Map öffnen');
    expect(html).not.toContain('Was ist um mich?');
    expect(html).not.toContain('Deine Map');
  });

  it('explains what this is — guests only', () => {
    const html = render();
    expect(html).toContain('Die besten Orte Berlins auf einer Map');
    expect(html).toContain('was du bestellen musst');

    const en = render('en');
    expect(en).toContain('The best places in Berlin on one map');
  });

  it('drops the explainer once a visitor is signed in', () => {
    authState.user = { displayName: 'Ersan Tester', email: 'ersan@example.com' };
    const html = render();
    expect(html).not.toContain('Die besten Orte Berlins');
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
    expect(html.match(/<h1/g)).toHaveLength(1);
    // The explainer is guest copy — one copy only, behind the guest gate.
    expect(html.match(/Die besten Orte Berlins auf einer Map/g)).toHaveLength(1);
  });
});
