// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const state = vi.hoisted(() => ({ owned: new Set<string>() as Set<string> | null }));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => (key === 'packsMore' ? 'Booster Packs ansehen' : key),
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
  it('fuehrt zum Sortiment mit EINEM Knopf statt zehn Kaufkarten', () => {
    state.owned = new Set(['category-pizza']);
    const { container } = render(<ProfilePacks uid="user-1" fullCatalog={false} />);

    expect(container.querySelectorAll('img')).toHaveLength(2);
    const more = container.querySelector('a[href="/packs"]');
    expect(more?.textContent).toBe('Booster Packs ansehen');
  });

  /* „Noch 9 Packs offen" hiess gemeint „neun stehen noch aus", stand aber
     ueber einer Reihe GEOEFFNETER Packs und las sich damit als „neun sind
     offen" — genau verkehrt herum (Nutzer, 31.08.2026). Der Knopf sagt jetzt,
     wohin er fuehrt, und das stimmt bei jedem Besitzstand. */
  it('sagt dasselbe, egal wie viel schon jemandem gehoert', () => {
    state.owned = new Set<string>();
    const nichts = render(<ProfilePacks uid="user-1" fullCatalog={false} />);
    const a = nichts.container.querySelector('a[href="/packs"]')?.textContent;
    cleanup();

    state.owned = new Set(['category-pizza', 'category-coffee']);
    const zwei = render(<ProfilePacks uid="user-1" fullCatalog={false} />);
    const b = zwei.container.querySelector('a[href="/packs"]')?.textContent;

    expect(a).toBe('Booster Packs ansehen');
    expect(b).toBe(a);
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
