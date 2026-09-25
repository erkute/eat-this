// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SiteImage from './SiteImage';

const ASSET =
  'https://cdn.sanity.io/images/ehwjnjr2/production/abc-1600x1200.jpg?w=800&auto=format&q=80';

describe('SiteImage', () => {
  it('lädt Sanity-Bilder direkt von der CDN, ohne /_next/image', () => {
    const { container } = render(<SiteImage src={ASSET} alt="Spot" width={400} height={300} />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toMatch(
      /^https:\/\/cdn\.sanity\.io\/.*\?w=\d+&auto=format&q=80$/
    );
    expect(img.getAttribute('srcset')).not.toContain('/_next/image');
  });

  it('lässt eigene Bilder beim Optimierer', () => {
    const { container } = render(
      <SiteImage src="/buddy/buddy.webp" alt="" width={120} height={120} />
    );
    expect(container.querySelector('img')!.getAttribute('src')).toMatch(
      /^\/_next\/image\?url=%2Fbuddy%2Fbuddy\.webp&w=\d+&q=75$/
    );
  });
});
