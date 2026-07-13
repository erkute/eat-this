// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const state = vi.hoisted(() => ({owned: new Set<string>() as Set<string> | null}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('@/lib/firebase/useOwnedEntitlements', () => ({
  useOwnedEntitlements: () => state.owned,
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, className, children }: React.PropsWithChildren<{ href: string; className?: string }>) => (
    <a href={href} className={className}>{children}</a>
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
    const { container } = render(<ProfilePacks uid="user-1" />);
    const images = [...container.querySelectorAll('img')];

    expect(images.length).toBe(10);
    for (const image of images) {
      expect(image.getAttribute('src')).toMatch(/\/pics\/booster\/.+\.webp\?v=1$/);
      expect(image.getAttribute('width')).toBe('166');
      expect(image.getAttribute('height')).toBe('190');
      expect(image.getAttribute('sizes')).toBe('(max-width: 760px) 136px, 166px');
      expect(image.getAttribute('loading')).toBe('lazy');
    }
  });

  it('does not render owned packs as locked while ownership is unresolved', () => {
    state.owned = null;
    const { container, getByRole } = render(<ProfilePacks uid="user-1" />);

    expect(getByRole('status').textContent).toBe('dataLoading');
    expect(container.querySelectorAll('a')).toHaveLength(0);
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });
});
