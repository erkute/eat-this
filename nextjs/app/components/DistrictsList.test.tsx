import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
import DistrictsList from './DistrictsList';

const districts = [{ name: 'Kreuzberg', slug: 'kreuzberg', count: 12, spots: [] }] as any;

describe('DistrictsList', () => {
  it('renders a district row linking to its canonical page', () => {
    const html = renderToStaticMarkup(<DistrictsList districts={districts} locale="de" />);
    expect(html).toContain('/bezirk/kreuzberg');
    expect(html).not.toContain('/map?bezirk=');
    expect(html).toContain('Kreuzberg');
    expect(html).toContain('12');
  });
  it('links the section all action to the district index', () => {
    const html = renderToStaticMarkup(<DistrictsList districts={districts} locale="de" />);
    expect(html).toContain('href="/bezirk" class="hv-link ');
    expect(html).toContain('Alle');
  });
  it('renders nothing when empty', () => {
    expect(renderToStaticMarkup(<DistrictsList districts={[]} locale="de" />)).toBe('');
  });
});
