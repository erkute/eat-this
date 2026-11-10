// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ prefetch: vi.fn(), surface: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ prefetch, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) =>
    <a {...props} data-prefetch={String(prefetch)} />,
  useRouter: () => ({ prefetch: mocks.prefetch }),
}));
vi.mock('./map/preloadMapSurface', () => ({ preloadMapSurface: mocks.surface }));
import MapIntentLink from './MapIntentLink';

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('MapIntentLink resource intent', () => {
  it('does not prefetch routes just because the link enters the viewport', () => {
    render(<MapIntentLink href="/map">Map</MapIntentLink>);
    expect(screen.getByRole('link').getAttribute('data-prefetch')).toBe('false');
    expect(mocks.prefetch).not.toHaveBeenCalled();
    expect(mocks.surface).not.toHaveBeenCalled();
  });

  it.each(['mouseEnter', 'focus', 'touchStart'] as const)('warms the map on %s', event => {
    render(<MapIntentLink href="/map?r=spot">Map</MapIntentLink>);
    fireEvent[event](screen.getByRole('link'));
    expect(mocks.prefetch).toHaveBeenCalledWith('/map?r=spot');
    expect(mocks.surface).toHaveBeenCalledOnce();
  });

  it('warms the Must Eats route without downloading MapLibre', () => {
    render(<MapIntentLink href="/must-eats">Cards</MapIntentLink>);
    fireEvent.focus(screen.getByRole('link'));
    expect(mocks.prefetch).toHaveBeenCalledWith('/must-eats');
    expect(mocks.surface).not.toHaveBeenCalled();
  });
});
