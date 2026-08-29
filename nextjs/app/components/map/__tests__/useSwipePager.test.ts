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
    useSwipePager(ref, { onPrev: () => {}, onNext: () => {}, hasPrev: true, hasNext: true })
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

/* Auf der Map liegen zwei verschiedene Sheets in derselben Reihe: der offene
   Spot und der gesperrte. Wischt man von einem auf den anderen, tauscht React
   die ganze Komponente aus — der Ref, der die abfahrende Karte trug, ist dann
   leer, und die einfahrende Karte stünde ohne Animation einfach da. Deshalb
   sucht der Pager sie nach dem Tausch im Dokument. */
describe('useSwipePager — page onto a different component', () => {
  it('animates the card that came in, not the one that went out', () => {
    vi.useFakeTimers();
    try {
      const container = document.createElement('div');
      const oldCard = document.createElement('header');
      oldCard.setAttribute('data-detail-hero', '');
      container.appendChild(oldCard);
      document.body.appendChild(container);

      const cardRef = { current: oldCard as HTMLElement | null };
      const newCard = document.createElement('header');
      newCard.setAttribute('data-detail-hero', '');

      renderHook(() =>
        useSwipePager(
          { current: container },
          {
            // Was React beim Komponententausch tut: alte Karte raus, neue rein,
            // Ref leer.
            onNext: () => {
              oldCard.remove();
              container.appendChild(newCard);
              cardRef.current = null;
            },
            hasPrev: false,
            hasNext: true,
            transformRef: cardRef,
            entrySelector: '[data-detail-hero]',
          }
        )
      );

      firePointer('pointerdown', oldCard, 200, 100);
      firePointer('pointermove', oldCard, 100, 100);
      firePointer('pointerup', oldCard, 100, 100);
      expect(oldCard.style.transform).toContain('translateX(-');

      vi.advanceTimersByTime(300); // Ausfahrt vorbei → Tausch + Einfahrt setzen
      expect(newCard.style.transform).toBe(`translateX(${window.innerWidth}px)`);

      vi.advanceTimersToNextFrame(); // rAF startet die Einfahrt
      expect(newCard.style.transform).toBe('translateX(0)');
    } finally {
      vi.useRealTimers();
    }
  });
});
