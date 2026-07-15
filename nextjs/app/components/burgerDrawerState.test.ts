// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { closeBurgerDrawer, openBurgerDrawer } from './burgerDrawerState';

describe('burger drawer mobile canvas state', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
    document.body.removeAttribute('style');
    document.body.replaceChildren();
    document.body.innerHTML = `
      <button id="burgerBtn" aria-expanded="false">Menu</button>
      <div id="burgerDrawer" aria-hidden="true" inert hidden>
        <button id="burgerClose">Close</button>
      </div>
    `;

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 240 });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: vi.fn((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }),
    });
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('removes the fixed ink layer before restoring the mobile page canvas', () => {
    const drawer = document.getElementById('burgerDrawer') as HTMLDivElement;
    const openButton = document.getElementById('burgerBtn') as HTMLButtonElement;

    openBurgerDrawer();

    expect(drawer.hidden).toBe(false);
    expect(drawer.classList.contains('active')).toBe(true);
    expect(drawer.hasAttribute('inert')).toBe(false);
    expect(openButton.getAttribute('aria-expanded')).toBe('true');
    expect(document.body.dataset.burgerLockMode).toBe('fixed');
    expect(document.body.style.position).toBe('fixed');
    expect(document.documentElement.style.backgroundColor).toBe('rgb(21, 18, 14)');
    expect(document.body.style.backgroundColor).toBe('rgb(21, 18, 14)');

    closeBurgerDrawer();

    expect(drawer.hidden).toBe(true);
    expect(drawer.classList.contains('active')).toBe(false);
    expect(drawer.hasAttribute('inert')).toBe(true);
    expect(openButton.getAttribute('aria-expanded')).toBe('false');
    expect(document.body.dataset.burgerLockMode).toBeUndefined();
    expect(document.body.style.position).toBe('');
    expect(document.documentElement.style.backgroundColor).toBe('');
    expect(document.body.style.backgroundColor).toBe('');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 240);
  });

  it('restores the original inline colors across repeated open-close cycles', () => {
    document.documentElement.style.backgroundColor = 'white';
    document.body.style.backgroundColor = 'white';

    for (let cycle = 0; cycle < 3; cycle += 1) {
      openBurgerDrawer();
      closeBurgerDrawer(false);
    }

    expect(document.documentElement.style.backgroundColor).toBe('white');
    expect(document.body.style.backgroundColor).toBe('white');
    expect(document.documentElement.dataset.burgerPrevBg).toBeUndefined();
    expect(document.body.dataset.burgerPrevBg).toBeUndefined();
  });
});
