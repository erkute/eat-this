// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { armGhostClickGuard } from '../ghostClickGuard';

describe('armGhostClickGuard', () => {
  let button: HTMLButtonElement;
  let clicks: number;
  let disarm: () => void;

  beforeEach(() => {
    clicks = 0;
    button = document.createElement('button');
    button.addEventListener('click', () => {
      clicks += 1;
    });
    document.body.appendChild(button);
    disarm = armGhostClickGuard();
  });

  afterEach(() => {
    disarm();
    button.remove();
  });

  /** Ein echter Tap: erst Zeiger runter, dann Klick. */
  const realTap = () => {
    document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
  };

  it('lets a real tap through — it announced itself with a pointerdown', () => {
    realTap();
    expect(clicks).toBe(1);
  });

  it('swallows a click that no gesture in the page preceded', () => {
    // Genau der Geisterklick: der Finger war auf dem System-Dialog, nicht hier.
    button.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, screenX: 180, screenY: 400 })
    );
    expect(clicks).toBe(0);
  });

  it('never swallows a keyboard activation', () => {
    // Enter auf einem fokussierten Knopf: auch ohne pointerdown, aber ohne
    // Zeiger — detail 0 und keine Bildschirmkoordinaten.
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
    expect(clicks).toBe(1);
  });

  it('stops guarding once disarmed', () => {
    disarm();
    button.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, screenX: 180, screenY: 400 })
    );
    expect(clicks).toBe(1);
  });
});
