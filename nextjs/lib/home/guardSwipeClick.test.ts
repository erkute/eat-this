// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { guardSwipeClick } from './guardSwipeClick';

describe('guardSwipeClick', () => {
  it.each([[40, 0], [0, 40]])('blocks a swipe in either direction (%s, %s), then allows a fresh tap', (x, y) => {
    const rail = document.createElement('div');
    const cleanup = guardSwipeClick(rail);
    const pointer = (type: string, clientX = 0, clientY = 0) => rail.dispatchEvent(Object.assign(new MouseEvent(type, { clientX, clientY }), { pointerId: 1, pointerType: 'touch' }));
    const click = (detail = 1) => rail.dispatchEvent(new MouseEvent('click', { detail, cancelable: true }));
    pointer('pointerdown'); pointer('pointermove', x, y); pointer('pointerup', x, y);
    expect(click()).toBe(false);
    expect(click(0)).toBe(true);
    pointer('pointerdown'); pointer('pointerup', 2, 2);
    expect(click()).toBe(true);
    pointer('pointerdown'); pointer('pointercancel');
    expect(click()).toBe(false);
    cleanup();
    expect(click()).toBe(true);
  });
  it('keeps a deliberate tap usable while the card shelf settles into its snap position', () => {
    const scroller = document.createElement('div');
    const rail = document.createElement('div');
    scroller.appendChild(rail);
    document.body.appendChild(scroller);
    const cleanup = guardSwipeClick(rail);
    scroller.dispatchEvent(new Event('scroll'));
    expect(rail.dispatchEvent(new MouseEvent('click', { detail: 1, cancelable: true }))).toBe(true);
    cleanup();
    scroller.remove();
  });

});
