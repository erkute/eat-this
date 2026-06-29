import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';

vi.mock('./MapIntentLink', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children?: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import CategoryQuickPick from './CategoryQuickPick';

describe('CategoryQuickPick', () => {
  it('renders the placeholder trigger', () => {
    const html = renderToStaticMarkup(
      <CategoryQuickPick categoryNames={{ pizza: 'Pizza' }} placeholder="Worauf hast du Lust?" />
    );
    expect(html).toContain('Worauf hast du Lust?');
  });

  it('renders category links to the map', () => {
    const html = renderToStaticMarkup(
      <CategoryQuickPick categoryNames={{ pizza: 'Pizza', doener: 'Döner' }} placeholder="x" />
    );
    expect(html).toContain('/map?cat=pizza');
    expect(html).toContain('/map?cat=doener');
  });
});
