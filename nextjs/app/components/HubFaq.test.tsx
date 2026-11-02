import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HubFaq from '@/app/components/HubFaq';

vi.mock('@/lib/sanity.server', () => ({
  getPackContents: async () => ({ allBerlin: { mustEats: 137 } }),
}));

describe('HubFaq', () => {
  it('renders the FAQ heading and at least one question/answer in a details element', async () => {
    const html = renderToStaticMarkup(await HubFaq({ locale: 'de' }));
    expect(html).toContain('Noch Fragen?');
    expect(html).toContain('<details');
    expect(html).not.toMatch(/<details[^>]*\sopen/);
    expect(html).toContain('<summary');
    // first DE FAQ question
    expect(html).toContain('Was kostet Eat This?');
    expect(html).toContain('aktuell 137 Must Eats in Berlin');
  });

  it('uses homeV2 section structure with hv-title heading', async () => {
    const html = renderToStaticMarkup(await HubFaq({ locale: 'de' }));
    expect(html).toContain('homeV2');
    expect(html).toContain('hv-title');
    expect(html).toContain('hv-head');
  });
});
