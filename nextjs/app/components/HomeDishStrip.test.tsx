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

import HomeDishStrip from './HomeDishStrip';

describe('HomeDishStrip', () => {
  it('opens each dish on the map', () => {
    const html = renderToStaticMarkup(<HomeDishStrip locale="de" />);
    // Everything clickable on the home page leads back to the map.
    expect(html).toContain('/map?r=gazzo');
    expect(html).toContain('/map?r=all-in');
    expect(html).not.toContain('/restaurant/');
    expect(html).toContain('Burger');
  });

  it('renders embedded in Must Eats, not as its own band', () => {
    const html = renderToStaticMarkup(<HomeDishStrip locale="de" />);
    expect(html).not.toContain('Das willst du essen');
    expect(html).toContain('Gerichte, für die sich der Weg lohnt');
    expect(html).not.toContain('<section');
  });
});
