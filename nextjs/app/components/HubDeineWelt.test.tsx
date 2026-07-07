import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { translations } from '@/lib/i18n/translations';

// Auth state is swapped per test: while loading (= the SSR pass) the static
// shell must render so globals.css can show it pre-paint for returning
// signed-in visitors (html[data-auth="1"]); resolved-anon renders nothing.
const authState = { user: null as { uid: string } | null, loading: true };
vi.mock('@/lib/auth', () => ({ useAuth: () => authState }));
vi.mock('@/app/components/MapIntentLink', () => ({
  default: ({
    href,
    rel,
    className,
    children,
  }: {
    href: string;
    rel?: string;
    className?: string;
    children: ReactNode;
  }) => (
    <a href={href} rel={rel} className={className}>
      {children}
    </a>
  ),
}));

import HubDeineWelt from '@/app/components/HubDeineWelt';

function render() {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={translations.de} timeZone="Europe/Berlin">
      <HubDeineWelt />
    </NextIntlClientProvider>
  );
}

describe('HubDeineWelt', () => {
  beforeEach(() => {
    authState.user = null;
    authState.loading = true;
  });

  it('SSRs only the signed-in intro shell with the data-auth-only hook while auth is loading', () => {
    const html = render();
    expect(html).toContain('data-auth-only');
    expect(html).toContain('Hey');
    expect(html).toContain('Deine Map wartet');
    expect(html).toContain('Direkt zu empfohlenen Spots um dich herum und empfohlenen Must Eats.');
    expect(html).toContain('Profil');
    expect(html).toContain('Map öffnen');
    expect(html).toContain('/pics/avatar/1.webp?v=3');
    expect(html).not.toContain('Empfohlene Spots');
    expect(html).not.toContain('Must Eats</span>');
    expect(html).not.toContain('href="/profile#profile-panel-must-eats"');
    expect(html).toContain('rel="nofollow"');
  });

  it('renders nothing once auth resolves to logged-out', () => {
    authState.loading = false;
    expect(render()).toBe('');
  });

  it('greets a resolved user by first name and shows the hero headline', () => {
    authState.loading = false;
    authState.user = { uid: 'u1', displayName: 'Ersan Tester' } as never;
    const html = render();
    // Greeting kicker shows first name.
    expect(html).toContain('Hey Ersan');
    // Hero headline is always present for signed-in users.
    expect(html).toContain('Deine Map wartet');
  });
});
