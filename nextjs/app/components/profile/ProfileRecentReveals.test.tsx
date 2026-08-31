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
  /* Die Schwelle von drei Karten liess ausgerechnet die Neuen ohne den einen
     Abschnitt, der die Seite lebendig macht. Sie ist weg — die Form traegt
     jetzt auch einen Eintrag: Linie ueber die volle Breite, Datum obenauf. */
  it('zeigt die Zeitleiste schon ab der ersten Aufdeckung', () => {
    const { container } = render(
      <ProfileRecentReveals mustEats={ALL} unlockedAt={revealedAt(1)} />
    );

    expect(container.querySelector('section')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(1);
  });

  it('bleibt still, solange nichts aufgedeckt ist', () => {
    const { container } = render(
      <ProfileRecentReveals mustEats={ALL} unlockedAt={revealedAt(0)} />
    );

    expect(container.querySelector('section')).toBeNull();
  });

  it('renders one entry per revealed card', () => {
    const { container } = render(
      <ProfileRecentReveals mustEats={ALL} unlockedAt={revealedAt(3)} />
    );

    expect(container.querySelectorAll('li')).toHaveLength(3);
  });

  it('ignores face-up cards the user never revealed themselves', () => {
    // Only self-revealed cards carry an unlockedAt; the rest are public
    // face-ups and have no moment to show.
    const { container } = render(
      <ProfileRecentReveals mustEats={ALL} unlockedAt={new Map([['me-0', 1_700_000_000_000]])} />
    );

    expect(container.querySelectorAll('li')).toHaveLength(1);
    expect([...container.querySelectorAll('li p')].map((p) => p.textContent)).toContain('Dish 0');
  });

  it('shows the newest reveal first', () => {
    const { container } = render(
      <ProfileRecentReveals mustEats={ALL} unlockedAt={revealedAt(4)} />
    );
    const dishes = [...container.querySelectorAll('li')].map(
      (li) => li.querySelectorAll('p')[1]?.textContent
    );

    expect(dishes[0]).toBe('Dish 0');
    expect(dishes.at(-1)).toBe('Dish 3');
  });
});
