// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { MapMustEat } from '@/lib/types';

vi.mock('next-intl', () => ({
  useLocale: () => 'de',
  useTranslations: () => (key: string) => key,
}));
// A plain <a href="/map"> would trip next/no-html-link-for-pages in the
// production lint pass, so the stub is a span — the tests only care that the
// card renders inside it.
vi.mock('@/app/components/MapIntentLink', () => ({
  default: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
}));

import ProfileRecentReveals from './ProfileRecentReveals';

function mustEat(n: number): MapMustEat {
  return {
    _id: `me-${n}`,
    dish: `Dish ${n}`,
    image: `/api/must-eat-image/me-${n}`,
    restaurant: { _id: `r-${n}`, name: `Spot ${n}`, slug: `spot-${n}`, lat: 0, lng: 0 },
  };
}

function revealedAt(count: number): ReadonlyMap<string, number> {
  return new Map(
    Array.from({ length: count }, (_, i) => [`me-${i}`, 1_700_000_000_000 - i * 86_400_000])
  );
}

const ALL = Array.from({ length: 6 }, (_, i) => mustEat(i));

afterEach(cleanup);

describe('ProfileRecentReveals', () => {
  it('stays quiet below three reveals — one card under a full-width heading is not a strip', () => {
    for (const count of [0, 1, 2]) {
      const { container } = render(
        <ProfileRecentReveals mustEats={ALL} unlockedAt={revealedAt(count)} />
      );
      expect(container.querySelector('section'), `${count} reveals`).toBeNull();
      cleanup();
    }
  });

  it('renders once three cards have a reveal moment', () => {
    const { container } = render(
      <ProfileRecentReveals mustEats={ALL} unlockedAt={revealedAt(3)} />
    );

    expect(container.querySelector('section')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(3);
  });

  it('ignores face-up cards the user never revealed themselves', () => {
    // Only self-revealed cards carry an unlockedAt; the rest are public
    // face-ups and have no moment to show.
    const { container } = render(
      <ProfileRecentReveals mustEats={ALL} unlockedAt={new Map([['me-0', 1_700_000_000_000]])} />
    );

    expect(container.querySelector('section')).toBeNull();
  });

  it('shows the newest reveal first', () => {
    const { container } = render(
      <ProfileRecentReveals mustEats={ALL} unlockedAt={revealedAt(4)} />
    );
    const dishes = [...container.querySelectorAll('li p:first-of-type')].map((p) => p.textContent);

    expect(dishes[0]).toBe('Dish 0');
    expect(dishes.at(-1)).toBe('Dish 3');
  });
});
