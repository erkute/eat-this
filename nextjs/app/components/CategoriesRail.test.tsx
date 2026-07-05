import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
vi.mock('./MapIntentLink', () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({ default: () => null }));
import CategoriesRail from './CategoriesRail';

describe('CategoriesRail', () => {
  it('renders a category card linking to the map', () => {
    const html = renderToStaticMarkup(
      <CategoriesRail categoryNames={{ pizza: 'Pizza' }} locale="de" />
    );
    expect(html).toContain('/map?cat=pizza');
    expect(html).toContain('Pizza');
  });
  it('renders nothing when empty', () => {
    const html = renderToStaticMarkup(<CategoriesRail categoryNames={{}} locale="de" />);
    expect(html).toBe('');
  });
});
