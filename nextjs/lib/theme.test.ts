// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_KEY,
  currentTheme,
  setTheme,
  subscribeTheme,
} from './theme';

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
});

describe('shared theme', () => {
  it('is light until someone switches it', () => {
    expect(currentTheme()).toBe('light');
  });

  it('switches to dark on <html> and remembers it', () => {
    setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(currentTheme()).toBe('dark');
  });

  it('remembers an explicit light choice', () => {
    setTheme('dark');
    setTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  it('tells every toggle on the page when it changes', async () => {
    const seen = vi.fn();
    const stop = subscribeTheme(seen);
    setTheme('dark');
    await Promise.resolve();
    expect(seen).toHaveBeenCalled();
    stop();
  });

  it('still switches when storage is blocked', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    setTheme('dark');
    expect(currentTheme()).toBe('dark');
    spy.mockRestore();
  });
});
