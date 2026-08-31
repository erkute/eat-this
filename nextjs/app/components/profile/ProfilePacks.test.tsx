// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const state = vi.hoisted(() => ({ owned: new Set<string>() as Set<string> | null }));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    key === 'packsRemaining' ? `Noch ${vars?.count} Packs offen` : key,
}));
vi.mock('@/lib/firebase/useOwnedEntitlements', () => ({
  useOwnedEntitlements: () => state.owned,
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    className,
    children,
  }: React.PropsWithChildren<{ href: string; className?: string }>) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({
  // Keep the delivery attributes visible in the DOM assertion.
  default: (props: {
    src: string;
    alt: string;
    width: number;
    height: number;
    sizes: string;
    loading: 'lazy' | 'eager';
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={props.src}
      alt={props.alt}
      width={props.width}
      height={props.height}
      sizes={props.sizes}
      loading={props.loading}
    />
  ),
}));

import ProfilePacks from './ProfilePacks';

afterEach(() => {
  cleanup();
  state.owned = new Set<string>();
});

describe('ProfilePacks artwork delivery', () => {
  it('uses lazy responsive Next images with a stable asset version', () => {
    const { container } = render(<ProfilePacks uid="user-1" fullCatalog={false} />);
    const images = [...container.querySelectorAll('img')];

    // Nur das Welcome Pack ist offen — die zehn Kaufkarten sind weg.
    expect(images.length).toBe(1);
    for (const image of images) {
      expect(image.getAttribute('src')).toMatch(/\/pics\/booster\/.+\.webp\?v=1$/);
      expect(image.getAttribute('width')).toBe('96');
      expect(image.getAttribute('height')).toBe('139');
      expect(image.getAttribute('sizes')).toBe('(max-width: 760px) 72px, 96px');
      expect(image.getAttribute('loading')).toBe('lazy');
    }
  });

  it('does not render owned packs as locked while ownership is unresolved', () => {
    state.owned = null;
    const { container, getByRole } = render(<ProfilePacks uid="user-1" fullCatalog={false} />);

    expect(getByRole('status').textContent).toBe('dataLoading');
    expect(container.querySelectorAll('a[href^="/pack"]')).toHaveLength(0);
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });
});

describe('ProfilePacks zeigt Besitz, nicht das Sortiment', () => {
  /* Der Laden stand vorher IM Profil: zehn Kaufknoepfe unter einer
     Ueberschrift, die „Meine Packs" heisst. */
  it('nennt die fehlenden Packs in einer Zeile statt in zehn Kaufkarten', () => {
    state.owned = new Set(['category-pizza']);
    const { container } = render(<ProfilePacks uid="user-1" fullCatalog={false} />);

    expect(container.querySelectorAll('img')).toHaveLength(2);
    const more = container.querySelector('a[href="/packs"]');
    expect(more?.textContent).toBe('Noch 8 Packs offen');
  });

  /* Der Widerspruch, wegen dem fullCatalog ueberhaupt existiert: oben stand
     „466 von 466 Spots", darunter zehn verschlossene Packs. Ein Admin-Konto
     hat weder Claim noch Entitlement-Dokument — useOwnedEntitlements kann das
     also nicht wissen. */
  it('zeigt alles offen, wenn der Server den ganzen Katalog meldet', () => {
    state.owned = new Set<string>();
    const { container } = render(<ProfilePacks uid="user-1" fullCatalog />);

    expect(container.querySelectorAll('img')).toHaveLength(10);
    expect(container.querySelector('a[href="/packs"]')).toBeNull();
  });
});
