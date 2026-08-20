import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, className, ...rest }: any) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));

import CategoriesRail from './CategoriesRail';

describe('CategoriesRail', () => {
  it('links each category to its category page', () => {
    const html = renderToStaticMarkup(
      <CategoriesRail categoryNames={{ pizza: 'Pizza' }} locale="de" />
    );
    expect(html).toContain('/kategorie/pizza');
    expect(html).toContain('Pizza');
  });

  it('sells nothing: no pack links, no buy buttons, no signup form', () => {
    const html = renderToStaticMarkup(
      <CategoriesRail categoryNames={{ pizza: 'Pizza', lunch: 'Lunch' }} locale="de" />
    );
    // Packs live on /packs and the map now — a first-time visitor who has not
    // seen the map yet must not meet a shop here.
    expect(html).not.toContain('/pack/');
    expect(html).not.toContain('Öffnen');
    expect(html).not.toContain('Starter Pack');
    expect(html).not.toContain('type="email"');
  });

  it('carries no booster artwork — the pack sachets read as product shots', () => {
    const html = renderToStaticMarkup(
      <CategoriesRail categoryNames={{ pizza: 'Pizza' }} locale="de" />
    );
    expect(html).not.toContain('booster');
    expect(html).not.toContain('<img');
  });

  it('renders nothing when empty', () => {
    const html = renderToStaticMarkup(<CategoriesRail categoryNames={{}} locale="de" />);
    expect(html).toBe('');
  });
});
