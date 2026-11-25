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
      restaurantsById={new Map()}
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

const oldPhoto = 'https://cdn.sanity.io/images/test/staging/old-800x800.jpg';
const currentPhoto = 'https://cdn.sanity.io/images/test/staging/current-1200x800.jpg';

it('shows the current catalog photo in place of an older saved URL', () => {
  const catalog = new Map([['a', { slug: 'sofi', photo: currentPhoto }]]);
  const { container } = render(
    <ProfileSpotsContent
      restaurantsById={catalog}
      loading={false}
      toggle={vi.fn()}
      updateNote={vi.fn()}
      setVisited={vi.fn()}
      favorites={[{ restaurantId: 'a', name: 'SOFI', slug: 'old-sofi', photo: oldPhoto }]}
    />
  );
  const image = container.querySelector('img');
  expect(image?.getAttribute('src') ?? '').toContain('current-1200x800.jpg');
  expect(image?.getAttribute('srcset') ?? '').toContain('current-1200x800.jpg');
  expect(screen.getByRole('link', { name: 'SOFI' }).getAttribute('href')).toBe('/map?r=sofi');
});

it('keeps a saved favorite without its old photo if it leaves the catalog', () => {
  const { container } = render(
    <ProfileSpotsContent
      restaurantsById={new Map()}
      loading={false}
      toggle={vi.fn()}
      updateNote={vi.fn()}
      setVisited={vi.fn()}
      favorites={[{ restaurantId: 'a', name: 'SOFI', slug: 'sofi', photo: oldPhoto }]}
    />
  );

  expect(container.querySelector('img')).toBeNull();
  expect(screen.getByRole('link', { name: 'SOFI' }).getAttribute('href')).toBe('/map?r=sofi');
});

it('hides the photo if the current image fails to load', () => {
  const { container } = render(
    <ProfileSpotsContent
      restaurantsById={new Map([['a', { slug: 'sofi', photo: currentPhoto }]])}
      loading={false}
      toggle={vi.fn()}
      updateNote={vi.fn()}
      setVisited={vi.fn()}
      favorites={[{ restaurantId: 'a', name: 'SOFI', photo: oldPhoto }]}
    />
  );

  const image = container.querySelector('img')!;
  expect(image.getAttribute('src')).toContain('current-1200x800.jpg');
  fireEvent.error(image);
  expect(container.querySelector('img')).toBeNull();
  expect(screen.getByRole('link', { name: 'SOFI' }).getAttribute('href')).toBe('/map?r=sofi');
});

it('does not reuse a saved photo when the current catalog no longer offers it', () => {
  const { container } = render(
    <ProfileSpotsContent
      restaurantsById={new Map([['a', { slug: 'sofi' }]])}
      loading={false}
      toggle={vi.fn()}
      updateNote={vi.fn()}
      setVisited={vi.fn()}
      favorites={[{ restaurantId: 'a', name: 'SOFI', photo: oldPhoto }]}
    />
  );

  expect(container.querySelector('img')).toBeNull();
  expect(screen.getByRole('heading', { name: 'SOFI' })).toBeTruthy();
});
