// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ArticleMotion from './ArticleMotion';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('clears the intro after its duration and on leaving without loading scene motion', () => {
  vi.useFakeTimers();
  vi.stubGlobal('CSS', { escape: (slug: string) => slug });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  document.documentElement.setAttribute('data-article-intro', '');
  const view = render(<ArticleMotion slug="test" />);
  expect(document.documentElement.hasAttribute('data-article-intro')).toBe(true);
  act(() => vi.advanceTimersByTime(2000));
  expect(document.documentElement.hasAttribute('data-article-intro')).toBe(false);
  document.documentElement.setAttribute('data-article-intro', '');
  view.unmount();
  expect(document.documentElement.hasAttribute('data-article-intro')).toBe(false);
});
