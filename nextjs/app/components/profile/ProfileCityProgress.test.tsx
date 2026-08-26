// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const mapData = { restaurants: [] as unknown[], totalCount: 0, loading: false };
vi.mock('@/lib/map', () => ({ useMapData: () => mapData }));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    key === 'cityCount' ? `von ${vars?.total} Spots auf deiner Map` : key,
}));
vi.mock('@/app/components/MapIntentLink', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import ProfileCityProgress from './ProfileCityProgress';

describe('ProfileCityProgress', () => {
  it('nennt die Zahl und wohin sie führt', () => {
    mapData.restaurants = new Array(154);
    mapData.totalCount = 464;
    mapData.loading = false;
    const { container } = render(<ProfileCityProgress uid="u1" />);
    expect(container.textContent).toContain('154');
    expect(container.textContent).toContain('von 464 Spots auf deiner Map');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/map');
    // Der Balken trägt den echten Anteil, nicht eine gefühlte Breite.
    const fill = container.querySelector('[class*="cityBarFill"]') as HTMLElement;
    expect(fill.style.width).toBe('33%');
  });

  it('zeigt lieber nichts als eine Null, die gleich ersetzt würde', () => {
    mapData.restaurants = [];
    mapData.totalCount = 0;
    mapData.loading = true;
    const { container } = render(<ProfileCityProgress uid="u1" />);
    expect(container.textContent).toBe('');
  });
});
