// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useSwipePager } from '../useSwipePager';

// Build: container (the swipe ref) with a [data-h-scroll] carousel child and a
// plain child. The pager must ignore gestures that START inside the carousel
// (so its native horizontal scroll wins), but still page on plain children.
function mount() {
  const container = document.createElement('div');
  const carousel = document.createElement('div');
  carousel.setAttribute('data-h-scroll', '');
  const thumb = document.createElement('button'); // gesture target inside carousel
  carousel.appendChild(thumb);
  const plain = document.createElement('p'); // gesture target outside carousel
  container.append(carousel, plain);
  document.body.appendChild(container);

  const ref = { current: container };
  renderHook(() =>
    useSwipePager(ref, { onCommit: () => {}, hasPrev: true, hasNext: true })
  );
  return { container, thumb, plain };
}

function firePointer(type: string, target: Element, clientX: number, clientY: number) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(ev, { pointerType: 'touch', clientX, clientY });
  target.dispatchEvent(ev);
}

// A clearly-horizontal drag: down at 100,100 then move to 200,100.
function horizontalDrag(downTarget: Element, moveTarget: Element) {
  firePointer('pointerdown', downTarget, 100, 100);
  firePointer('pointermove', moveTarget, 200, 100);
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('useSwipePager — horizontal-scroll opt-out', () => {
  it('does NOT translate the sheet when the gesture starts inside [data-h-scroll]', () => {
    const { container, thumb } = mount();
    horizontalDrag(thumb, thumb);
    // Pager stayed out of it → carousel keeps its native scroll.
    expect(container.style.transform).toBe('');
  });

  it('still translates the sheet for gestures on ordinary content', () => {
    const { container, plain } = mount();
    horizontalDrag(plain, plain);
    expect(container.style.transform).toContain('translateX');
  });
});

/* Den Wechsel selbst spielt der Aufrufer — der Pager meldet nur, wohin und
   wo die Vorschau-Karte beim Loslassen stand, damit die Abfahrt dort
   weitermacht statt zu springen. */
describe('useSwipePager — commit', () => {
  function mountCard(hasNext: boolean) {
    const container = document.createElement('div');
    const card = document.createElement('header');
    container.appendChild(card);
    document.body.appendChild(container);
    const onCommit = vi.fn();
    renderHook(() =>
      useSwipePager(
        { current: container },
        { onCommit, hasPrev: false, hasNext, transformRef: { current: card } }
      )
    );
    return { card, onCommit };
  }

  it('meldet Richtung und Versatz der Vorschau-Karte', () => {
    const { card, onCommit } = mountCard(true);
    firePointer('pointerdown', card, 200, 100);
    firePointer('pointermove', card, 100, 100);
    firePointer('pointerup', card, 100, 100);
    expect(onCommit).toHaveBeenCalledWith('next', -24);
  });

  it('blättert nicht, wenn der Wisch zu kurz ist', () => {
    const { card, onCommit } = mountCard(true);
    firePointer('pointerdown', card, 200, 100);
    firePointer('pointermove', card, 160, 100);
    firePointer('pointerup', card, 160, 100);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('blättert nicht ins Leere', () => {
    const { card, onCommit } = mountCard(false);
    firePointer('pointerdown', card, 200, 100);
    firePointer('pointermove', card, 100, 100);
    firePointer('pointerup', card, 100, 100);
    expect(onCommit).not.toHaveBeenCalled();
  });
});
