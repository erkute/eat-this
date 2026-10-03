// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { armRailDrag, settleLeft } from './railDrag';

describe('settleLeft', () => {
  const starts = [0, 320, 640, 960];

  it('rastet auf der nächsten Karte ein', () => {
    expect(settleLeft(starts, 140, 0)).toBe(0);
    expect(settleLeft(starts, 170, 0)).toBe(320);
    expect(settleLeft(starts, 700, 0.1)).toBe(640);
  });

  it('blättert bei einem Schwung eine Karte weiter, nie zurück auf die alte', () => {
    expect(settleLeft(starts, 380, 1.2)).toBe(640);
    expect(settleLeft(starts, 600, -1.2)).toBe(320);
  });

  it('bleibt in der Leiste', () => {
    expect(settleLeft(starts, 990, 3)).toBe(960);
    expect(settleLeft(starts, -20, -3)).toBe(0);
    expect(settleLeft([], 50, 0)).toBe(50);
  });
});

describe('armRailDrag', () => {
  /* Im Raster ab 1024px scrollt nichts — dort schluckte ein leicht
     verrutschter Klick die Karte (gemessen 02.10.2026). */
  it('zieht nicht, wo nichts scrollt, und lässt den Klick durch', () => {
    const rail = document.createElement('ul');
    rail.innerHTML = '<li><a href="#x">x</a></li>';
    document.body.appendChild(rail);
    Object.defineProperty(rail, 'scrollWidth', { value: 600 });
    Object.defineProperty(rail, 'clientWidth', { value: 600 });
    rail.setPointerCapture = () => {};
    const disarm = armRailDrag(rail);
    const at = (type: string, x: number) =>
      rail.dispatchEvent(
        Object.assign(new MouseEvent(type, { clientX: x, button: 0, bubbles: true }), {
          pointerType: 'mouse',
          pointerId: 1,
        })
      );
    at('pointerdown', 10);
    at('pointermove', 30);
    expect(rail.hasAttribute('data-dragging')).toBe(false);
    at('pointerup', 30);
    let clicks = 0;
    rail.querySelector('a')!.addEventListener('click', (e) => {
      clicks++;
      e.preventDefault();
    });
    rail.querySelector('a')!.click();
    expect(clicks).toBe(1);
    disarm();
    rail.remove();
  });
});
