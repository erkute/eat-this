import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';

vi.mock('./MapIntentLink', () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({ default: () => <img alt="" /> }));

import HomeDishStrip from './HomeDishStrip';

describe('HomeDishStrip', () => {
  it('renders cutout dishes linking to the map', () => {
    const html = renderToStaticMarkup(<HomeDishStrip locale="de" />);
    expect(html).toContain('Das willst du essen');
    expect(html).toContain('/map?cat=pizza');
    expect(html).toContain('/map?r=all-in');
    expect(html).toContain('Burger');
  });
});
