/* Seitliches Ziehen auf den Scroll-Bühnen der Startseite (Must Eats, Nearby).
   Dort fahren die Karten am vertikalen Scrollweg zur Seite; wer am Telefon
   quer über die Bühne wischt, erwartet aber, dass die Karten mitgehen.
   Dieses Modul übersetzt den Querwisch in genau diesen Scrollweg — die
   Bewegung selbst bleibt die Scroll-Timeline, es gibt keinen zweiten Zustand.

   Senkrecht wischt weiter der Browser (`touch-action: pan-y`), nativ und mit
   seinem Schwung; ein schräger Wisch, den er als Scroll nimmt, bricht hier
   mit `pointercancel` ab und scrollt trotzdem richtig. Deshalb trägt das
   nicht die iOS-Falle der Foto-Galerie (wischen-nativ-statt-js): dort sollte
   JS die einzige Bewegung sein, hier ist es nur ein zweiter Weg zum selben
   Scroll. Nur Finger und Stift — die Maus scrollt mit dem Rad. */

import { appScroller } from '@/lib/dom/appScroller';

export interface SideDragGeometry {
  /** Scroll-Abstand von jetzt bis dahin, wo Karte 0 in der Mitte steht. */
  start: number;
  /** Scrollweg von einer Karte zur nächsten. */
  step: number;
  count: number;
  /** Fingerweg, der eine Karte weiterschiebt. */
  finger: number;
}

/** Ab hier gehört der Wisch der Bühne: quer und deutlich mehr als senkrecht. */
const SLOP = 8;
/** Wie weit ein Schwung nachläuft, in Millisekunden Fingertempo. */
const FLING_MS = 180;
/** Ab diesem Fingertempo (px/ms) ist ein Wisch ein Blättern. */
const FLICK = 0.4;
const GLIDE_MS = 380;

/** Auf welcher Karte ein Wisch landet: Schwung dazu, dann auf die nächste
 *  ganze Karte, nie über die Bühne hinaus. `speed` ist das Fingertempo in
 *  px/ms, positiv = vorwärts (Finger nach links). */
export function settleIndex(at: number, speed: number, finger: number, count: number): number {
  let target = Math.round(at + (speed * FLING_MS) / finger);
  // Ein deutlicher Schwung blättert mindestens eine Karte, auch wenn der Weg
  // kurz war — sonst federte ein schneller kurzer Wisch auf die alte zurück.
  if (target === Math.round(at) && Math.abs(speed) > FLICK) target += Math.sign(speed);
  return Math.max(0, Math.min(count - 1, target));
}

function scrollPosition(scroller: HTMLElement | null): number {
  return scroller ? scroller.scrollTop : window.scrollY;
}

function scrollToPosition(scroller: HTMLElement | null, top: number): void {
  // `behavior` ausdrücklich: globals.css setzt `scroll-behavior: smooth`.
  if (scroller) scroller.scrollTo({ top, behavior: 'instant' });
  else window.scrollTo({ top, behavior: 'instant' });
}

/**
 * Macht `surface` quer ziehbar. `measure` liefert die Bühne im Moment des
 * Zugriffs (sie hängt an Leiste, Breite, geladenen Bildern). Gibt die
 * Aufräumfunktion zurück.
 */
export function armSideDrag(
  surface: HTMLElement,
  measure: () => SideDragGeometry | null
): () => void {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let pointer: number | null = null;
  let x0 = 0;
  let y0 = 0;
  let owned = false;
  let scroller: HTMLElement | null = null;
  let geometry: SideDragGeometry | null = null;
  let scroll0 = 0;
  let index0 = 0;
  let samples: { x: number; t: number }[] = [];
  let glide = 0;
  let unblock = 0;

  const stopGlide = () => {
    cancelAnimationFrame(glide);
    glide = 0;
    window.removeEventListener('pointerdown', stopGlide, true);
    window.removeEventListener('wheel', stopGlide, true);
  };

  /* Wo der Finger die Bühne hinschiebt, in Karten. Begrenzt auf die Bühne —
     ausser in die Richtung, aus der sie gerade erst hereinkommt: stand sie
     beim Zugriff noch nicht ganz fest, spränge sie sonst beim ersten Pixel. */
  const indexAt = (x: number) => {
    if (!geometry) return 0;
    const at = index0 - (x - x0) / geometry.finger;
    return Math.max(Math.min(0, index0), Math.min(Math.max(geometry.count - 1, index0), at));
  };

  const scrollForIndex = (index: number) => scroll0 + (index - index0) * (geometry?.step ?? 0);

  /* Ein Wisch über eine Karte ist kein Tipp auf sie: der Klick danach wird
     geschluckt. Mobile Browser schicken ihn nach Bewegung meist ohnehin
     nicht — wo doch, öffnete er sonst Spot oder Anmeldung. */
  const swallowClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const blockClick = () => {
    window.clearTimeout(unblock);
    surface.addEventListener('click', swallowClick, true);
    unblock = window.setTimeout(
      () => surface.removeEventListener('click', swallowClick, true),
      400
    );
  };

  const down = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' || !event.isPrimary) return;
    stopGlide();
    pointer = event.pointerId;
    x0 = event.clientX;
    y0 = event.clientY;
    owned = false;
    samples = [{ x: event.clientX, t: event.timeStamp }];
  };

  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    const dx = event.clientX - x0;
    if (!owned) {
      const dy = event.clientY - y0;
      if (Math.abs(dy) > SLOP && Math.abs(dy) >= Math.abs(dx)) {
        // Senkrecht: das macht der Browser.
        pointer = null;
        return;
      }
      if (Math.abs(dx) <= SLOP || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      geometry = measure();
      if (!geometry || geometry.count < 2 || geometry.step <= 0 || geometry.finger <= 0) {
        pointer = null;
        return;
      }
      owned = true;
      scroller = appScroller();
      scroll0 = scrollPosition(scroller);
      index0 = -geometry.start / geometry.step;
      // Ab hier zählt der Weg ab dem Punkt, an dem der Wisch übernommen
      // wurde, sonst spränge die Bühne um die Schwelle.
      x0 = event.clientX;
      surface.setPointerCapture?.(event.pointerId);
    }
    samples.push({ x: event.clientX, t: event.timeStamp });
    if (samples.length > 6) samples.shift();
    scrollToPosition(scroller, scrollForIndex(indexAt(event.clientX)));
  };

  const end = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    pointer = null;
    if (!owned || !geometry) return;
    owned = false;
    blockClick();
    if (event.type === 'pointercancel') return;
    const at = indexAt(event.clientX);
    const first = samples[0];
    const last = samples[samples.length - 1];
    const span = last.t - first.t;
    const speed = span > 0 && span < 160 ? -(last.x - first.x) / span : 0;
    const target = settleIndex(at, speed, geometry.finger, geometry.count);
    const from = scrollPosition(scroller);
    const to = scrollForIndex(target);
    if (reduced?.matches || Math.abs(to - from) < 1) {
      scrollToPosition(scroller, to);
      return;
    }
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / GLIDE_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      scrollToPosition(scroller, from + (to - from) * eased);
      glide = t < 1 ? requestAnimationFrame(tick) : 0;
      if (!glide) stopGlide();
    };
    // Ein neuer Griff oder das Rad hält das Nachgleiten an.
    window.addEventListener('pointerdown', stopGlide, true);
    window.addEventListener('wheel', stopGlide, { capture: true, passive: true });
    glide = requestAnimationFrame(tick);
  };

  surface.addEventListener('pointerdown', down);
  surface.addEventListener('pointermove', move);
  surface.addEventListener('pointerup', end);
  surface.addEventListener('pointercancel', end);
  // Trägt `touch-action: pan-y pinch-zoom` (globals.css): senkrecht und
  // Zoomen bleiben beim Browser, quer kommt hier an.
  surface.setAttribute('data-side-drag', '');

  return () => {
    stopGlide();
    window.clearTimeout(unblock);
    surface.removeEventListener('click', swallowClick, true);
    surface.removeEventListener('pointerdown', down);
    surface.removeEventListener('pointermove', move);
    surface.removeEventListener('pointerup', end);
    surface.removeEventListener('pointercancel', end);
    surface.removeAttribute('data-side-drag');
  };
}
