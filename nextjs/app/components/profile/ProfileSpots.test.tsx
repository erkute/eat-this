// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
vi.mock('next-intl', () => ({
  useLocale: () => 'de',
  useTranslations: () => (key: string) => key,
}));
vi.mock('@/lib/map/useFavorites', () => ({ useFavorites: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('@/app/components/MapIntentLink', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
import { ProfileSpotsContent } from './ProfileSpots';
afterEach(cleanup);
it('combines visited status with spot, district and personal note search', () => {
  render(
    <ProfileSpotsContent
      restaurantSlugs={new Map()}
      loading={false}
      toggle={vi.fn()}
      updateNote={vi.fn()}
      setVisited={vi.fn()}
      favorites={[
        { restaurantId: 'a', name: 'SOFI', district: 'Mitte', note: 'Croissant', visited: false },
        {
          restaurantId: 'b',
          name: 'EIVGI’S',
          district: 'Schöneberg',
          note: 'Sabich',
          visited: true,
        },
      ]}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'spotWasThere' }));
  expect(screen.queryByRole('heading', { name: 'SOFI' })).toBeNull();
  expect(screen.getByRole('heading', { name: 'EIVGI’S' })).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Schöneberg Sabich' } });
  expect(screen.getByRole('heading', { name: 'EIVGI’S' })).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Croissant' } });
  expect(screen.getByRole('status').textContent).toBe('searchEmpty');
  fireEvent.click(screen.getByRole('button', { name: 'spotsAll' }));
  expect(screen.getByRole('heading', { name: 'SOFI' })).toBeTruthy();
});
