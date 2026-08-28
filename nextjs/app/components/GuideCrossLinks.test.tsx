import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { GuideTeaser } from '@/lib/sanity.server';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import GuideCrossLinks from '@/app/components/GuideCrossLinks';

const guide = (slug: string, over: Partial<GuideTeaser> = {}): GuideTeaser =>
  ({
    slug,
    title: `Titel ${slug}`,
    excerpt: `Vorspann ${slug}`,
    noIndex: false,
    ...over,
  }) as GuideTeaser;

const render = (guides: (GuideTeaser | null)[], locale: 'de' | 'en' = 'de') =>
  renderToStaticMarkup(<GuideCrossLinks guides={guides} locale={locale} />);

describe('GuideCrossLinks', () => {
  // Der Zweck des Blocks: der Hub gibt dem Guide einen gefolgten Link mit
  // beschreibendem Ankertext. Ohne ihn stehen für Google zwei konkurrierende
  // Antworten auf dieselbe Query nebeneinander.
  it('links the guide by its own headline', () => {
    const html = render([guide('restaurants-kreuzberg')]);
    expect(html).toContain('href="/news/restaurants-kreuzberg"');
    expect(html).toContain('Titel restaurants-kreuzberg');
    expect(html).toContain('Vorspann restaurants-kreuzberg');
  });

  // `sweets` hat drei Guides, `drinks` und `fast-food` je zwei — ein 1:1-Feld
  // hätte die übrigen unverlinkt gelassen.
  it('renders every guide a hub competes with, in the given order', () => {
    const html = render([
      guide('beste-eisdielen-berlin'),
      guide('donuts-berlin'),
      guide('beste-baeckereien-berlin'),
    ]);
    for (const s of ['beste-eisdielen-berlin', 'donuts-berlin', 'beste-baeckereien-berlin']) {
      expect(html).toContain(`href="/news/${s}"`);
    }
    expect(html.indexOf('beste-eisdielen-berlin')).toBeLessThan(html.indexOf('donuts-berlin'));
  });

  // Der Hub darf nicht auf etwas zeigen, das gar nicht im Index stehen soll.
  it('drops noIndex guides', () => {
    const html = render([guide('sichtbar'), guide('versteckt', { noIndex: true })]);
    expect(html).toContain('href="/news/sichtbar"');
    expect(html).not.toContain('versteckt');
  });

  // Die meisten Hubs haben keinen Guide — dort darf keine leere Linie stehen.
  it('renders nothing without a usable guide', () => {
    expect(render([])).toBe('');
    expect(render([null])).toBe('');
    expect(render([guide('x', { noIndex: true })])).toBe('');
  });

  it('follows the page language in the kicker', () => {
    expect(render([guide('a')], 'de')).toContain('Ausführlich im Magazin');
    expect(render([guide('a')], 'en')).toContain('In depth in the magazine');
  });
});
