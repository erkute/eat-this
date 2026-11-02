// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import DiscoveryMotion from './DiscoveryMotion';

const animation = vi.hoisted(() => ({ context: vi.fn(() => ({ add() {}, revert() {} })) }));
vi.mock('gsap', () => ({ gsap: { context: animation.context } }));

afterEach(() => vi.unstubAllGlobals());

it('does not initialize animation work on a page without a discovery pack', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  render(<main><DiscoveryMotion /></main>);
  await act(() => vi.dynamicImportSettled());
  expect(animation.context).not.toHaveBeenCalled();
});
