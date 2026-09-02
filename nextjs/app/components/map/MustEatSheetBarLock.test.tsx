// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import MustEatSheetBarLock from './MustEatSheetBarLock';

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({ matches })),
  });
};

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'matchMedia');
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  document.documentElement.removeAttribute('style');
  document.body.removeAttribute('style');
});

describe('MustEatSheetBarLock', () => {
  it('paints html, body and theme-color ink on the phone and restores everything on unmount', () => {
    mockMatchMedia(true);
    document.body.style.setProperty('background-color', 'rgb(1, 2, 3)');

    const { unmount } = render(<MustEatSheetBarLock />);

    // jsdom normalisiert Farben zu rgb(); #15120e ist rgb(21, 18, 14).
    expect(document.documentElement.style.getPropertyValue('background-color')).toBe(
      'rgb(21, 18, 14)'
    );
    expect(document.documentElement.style.getPropertyPriority('background-color')).toBe(
      'important'
    );
    expect(document.body.style.getPropertyValue('background-color')).toBe('rgb(21, 18, 14)');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#15120e'
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
    expect(meta.getAttribute('content')).toBe('#15120e');
    unmount();
    expect(meta.getAttribute('content')).toBe('#d9382a');
    expect(meta.isConnected).toBe(true);
  });

  it('leaves the desktop rail alone', () => {
    mockMatchMedia(false);
    render(<MustEatSheetBarLock />);
    expect(document.documentElement.style.getPropertyValue('background-color')).toBe('');
    expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
  });
});
