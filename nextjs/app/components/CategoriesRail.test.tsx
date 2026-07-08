import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/auth', () => ({
  useMagicLink: () => ({
    sendLink: vi.fn(),
    state: 'idle',
    errorMessage: '',
    reset: vi.fn(),
  }),
}));
vi.mock('./MapIntentLink', () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({
  default: ({ src }: { src: string }) => <img src={src} alt="" />,
}));
import CategoriesRail from './CategoriesRail';

describe('CategoriesRail', () => {
  it('renders a category card linking to the booster detail page', () => {
    const html = renderToStaticMarkup(
      <CategoriesRail categoryNames={{ pizza: 'Pizza' }} locale="de" />
    );
    expect(html).toContain('/pack/pizza');
    expect(html).toContain('Öffnen');
    expect(html).toContain('Pizza');
  });
  it('renders the starter pack signup before category packs', () => {
    const html = renderToStaticMarkup(
      <CategoriesRail categoryNames={{ pizza: 'Pizza' }} locale="de" />
    );
    expect(html).toContain('Starter Pack');
    expect(html.indexOf('Starter Pack')).toBeLessThan(html.indexOf('Pizza'));
    expect(html).toContain('placeholder="deine@email.com"');
    expect(html).toContain('Anmelden');
  });
  it('keeps the category rail on booster pack art even when Sanity home images exist', () => {
    const html = renderToStaticMarkup(
      <CategoriesRail
        categoryNames={{ pizza: 'Pizza' }}
        categoryImages={{ pizza: 'https://cdn.sanity.io/images/pizza.webp' }}
        locale="de"
      />
    );
    expect(html).toContain('/pics/booster/booster_pizza.webp');
    expect(html).not.toContain('https://cdn.sanity.io/images/pizza.webp');
  });
  it('renders nothing when empty', () => {
    const html = renderToStaticMarkup(<CategoriesRail categoryNames={{}} locale="de" />);
    expect(html).toBe('');
  });
});
