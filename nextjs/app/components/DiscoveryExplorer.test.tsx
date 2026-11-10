import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import DiscoveryExplorer from './DiscoveryExplorer';
vi.mock('./DiscoveryMap', () => ({ default: () => null }));
describe('district list', () => {
  it('exposes every CMS district even when its map geometry is absent', () => {
    const html = renderToStaticMarkup(<NextIntlClientProvider locale="en" messages={{}}><DiscoveryExplorer locale="en" entries={[
      { slug: 'friedenau', name: 'Friedenau', href: '/bezirk/friedenau' },
      { slug: 'new-district', name: 'New district', href: '/bezirk/new-district' },
    ]} /></NextIntlClientProvider>);
    expect(html).toContain('href="/en/bezirk/friedenau"');
    expect(html).toContain('href="/en/bezirk/new-district"');
    expect(html).toContain('District list');
  });
});
