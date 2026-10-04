// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { guardSwipeClick } from './guardSwipeClick';

describe('guardSwipeClick', () => {
  it.each([[40, 0], [0, 40]])('blocks a swipe in either direction (%s, %s), then allows a fresh tap', (x, y) => {
    const rail = document.createElement('div');
    const stop = vi.fn();
    const cleanup = guardSwipeClick(rail, stop);
    const pointer = (type: string, clientX = 0, clientY = 0) => rail.dispatchEvent(Object.assign(new MouseEvent(type, { clientX, clientY }), { pointerId: 1, pointerType: 'touch' }));
    const click = (detail = 1) => rail.dispatchEvent(new MouseEvent('click', { detail, cancelable: true }));
    pointer('pointerdown'); pointer('pointermove', x, y); pointer('pointerup', x, y);
    expect(click()).toBe(false);
    expect(stop).toHaveBeenCalled();
    expect(click(0)).toBe(true);
    pointer('pointerdown'); pointer('pointerup', 2, 2);
    expect(click()).toBe(true);
    pointer('pointerdown'); pointer('pointercancel');
    expect(click()).toBe(false);
    cleanup();
    expect(click()).toBe(true);
  });
  it('cancels pending navigation when an app scroll container moves', () => {
    const scroller = document.createElement('div');
    const rail = document.createElement('div');
    scroller.appendChild(rail);
    document.body.appendChild(scroller);
    const stop = vi.fn();
    const cleanup = guardSwipeClick(rail, stop);
    scroller.dispatchEvent(new Event('scroll'));
    expect(stop).toHaveBeenCalledOnce();
    cleanup();
    scroller.remove();
  });

});
