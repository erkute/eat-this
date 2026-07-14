import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({ default: () => null }));

import HomeDishStrip from './HomeDishStrip';

describe('HomeDishStrip', () => {
  it('renders cutout dishes linking to canonical restaurant pages', () => {
    const html = renderToStaticMarkup(<HomeDishStrip locale="de" />);
    expect(html).toContain('Das willst du essen');
    expect(html).toContain('/restaurant/gazzo');
    expect(html).toContain('/restaurant/all-in');
    expect(html).not.toContain('/map?r=');
    expect(html).not.toContain('/map?cat=pizza');
    expect(html).toContain('Burger');
  });
});
