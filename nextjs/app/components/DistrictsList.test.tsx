import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
vi.mock('./MapIntentLink', () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
import DistrictsList from './DistrictsList';

const districts = [{ name: 'Kreuzberg', slug: 'kreuzberg', count: 12, spots: [] }] as any;

describe('DistrictsList', () => {
  it('renders a district row linking to the map', () => {
    const html = renderToStaticMarkup(<DistrictsList districts={districts} locale="de" />);
    expect(html).toContain('/map?bezirk=kreuzberg');
    expect(html).toContain('Kreuzberg');
    expect(html).toContain('12');
  });
  it('renders nothing when empty', () => {
    expect(renderToStaticMarkup(<DistrictsList districts={[]} locale="de" />)).toBe('');
  });
});
