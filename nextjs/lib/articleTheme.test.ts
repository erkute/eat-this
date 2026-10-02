// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ARTICLE_THEME_KEY,
  currentArticleTheme,
  setArticleTheme,
  subscribeArticleTheme,
} from './articleTheme';

afterEach(() => {
  document.documentElement.removeAttribute('data-article-theme');
  localStorage.clear();
});

describe('article theme', () => {
  it('is light until someone switches it', () => {
    expect(currentArticleTheme()).toBe('light');
  });

  it('switches to dark on <html> and remembers it', () => {
    setArticleTheme('dark');
    expect(document.documentElement.getAttribute('data-article-theme')).toBe('dark');
    expect(localStorage.getItem(ARTICLE_THEME_KEY)).toBe('dark');
    expect(currentArticleTheme()).toBe('dark');
  });

  it('goes back to light without leaving anything behind', () => {
    setArticleTheme('dark');
    setArticleTheme('light');
    expect(document.documentElement.hasAttribute('data-article-theme')).toBe(false);
    expect(localStorage.getItem(ARTICLE_THEME_KEY)).toBeNull();
  });

  it('tells every toggle on the page when it changes', async () => {
    const seen = vi.fn();
    const stop = subscribeArticleTheme(seen);
    setArticleTheme('dark');
    await Promise.resolve();
    expect(seen).toHaveBeenCalled();
    stop();
  });

  it('still switches when storage is blocked', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    setArticleTheme('dark');
    expect(currentArticleTheme()).toBe('dark');
    spy.mockRestore();
  });
});
