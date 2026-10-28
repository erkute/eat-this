// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import MustEatSheetBarLock from './MustEatSheetBarLock';

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({ matches })),
  });
};

beforeEach(() => {
  const style = document.createElement('style');
  style.dataset.barLockTheme = '';
  style.textContent = ':root { --et-ground: #ffffff; } html[data-theme="dark"] { --et-ground: #15120e; }';
  document.head.appendChild(style);
});

afterEach(() => {
  cleanup();
  document.querySelector('[data-bar-lock-theme]')?.remove();
  Reflect.deleteProperty(window, 'matchMedia');
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  document.documentElement.removeAttribute('style');
  document.documentElement.removeAttribute('data-theme');
  document.body.removeAttribute('style');
});

describe('MustEatSheetBarLock', () => {
  it('paints html, body and theme-color white on the phone and restores everything on unmount', () => {
    mockMatchMedia(true);
    document.body.style.setProperty('background-color', 'rgb(1, 2, 3)');

    const { unmount } = render(<MustEatSheetBarLock />);

    // Die Browserfläche folgt dem hellen Must-Eat-Sheet.
    expect(document.documentElement.style.getPropertyValue('background-color')).toBe(
      'rgb(255, 255, 255)'
    );
    expect(document.documentElement.style.getPropertyPriority('background-color')).toBe(
      'important'
    );
    expect(document.body.style.getPropertyValue('background-color')).toBe('rgb(255, 255, 255)');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#ffffff'
    );

    unmount();

    expect(document.documentElement.style.getPropertyValue('background-color')).toBe('');
    expect(document.body.style.getPropertyValue('background-color')).toBe('rgb(1, 2, 3)');
    // The map runs without a theme-color on purpose — a meta this lock created
    // must not survive it.
    expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
  });

  it('hands an existing theme-color back unchanged', () => {
    mockMatchMedia(true);
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', '#d9382a');
    document.head.appendChild(meta);

    const { unmount } = render(<MustEatSheetBarLock />);
    expect(meta.getAttribute('content')).toBe('#ffffff');
    unmount();
    expect(meta.getAttribute('content')).toBe('#d9382a');
    expect(meta.isConnected).toBe(true);
  });

  it('follows theme changes while the mobile sheet is open', async () => {
    mockMatchMedia(true);
    render(<MustEatSheetBarLock />);
    document.documentElement.setAttribute('data-theme', 'dark');
    await waitFor(() => expect(document.body.style.backgroundColor).toBe('rgb(21, 18, 14)'));
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#15120e');
    document.documentElement.setAttribute('data-theme', 'light');
    await waitFor(() => expect(document.body.style.backgroundColor).toBe('rgb(255, 255, 255)'));
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#ffffff');
  });

  it('uses the actual surface token rather than a hardcoded theme color', () => {
    mockMatchMedia(true);
    document.documentElement.style.setProperty('--et-ground', '#f0e5d0');
    render(<MustEatSheetBarLock />);
    expect(document.body.style.backgroundColor).toBe('rgb(240, 229, 208)');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#f0e5d0');
  });

  it('leaves the desktop rail alone', () => {
    mockMatchMedia(false);
    render(<MustEatSheetBarLock />);
    expect(document.documentElement.style.getPropertyValue('background-color')).toBe('');
    expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
  });
});
