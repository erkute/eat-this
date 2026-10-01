/* Die Maus am Magazin-Stapel der Startseite (MagazineGrid, nur ab 768px mit
   echtem Zeiger, HubMotion). Der Stapel ist ein nativer Querscroller, dessen
   Scroll-Timeline die Hefte bewegt; mit der Maus ging er bisher nur über die
   Punkte oder seitliches Trackpad-Wischen (Ansage 01.10.2026: „Magazine mit
   der Maus bewegen, aufblättern"). Hier drei Wege mehr, alle zum selben
   Scroll — es gibt keinen zweiten Zustand:

   - Ziehen: das oberste Heft geht mit der Hand, losgelassen gleitet der
     Stapel mit Schwung auf das nächste ganze Heft (GSAP auf `scrollLeft`).
     Während des Ziehens ist das Einrasten aus (`data-gliding`), sonst
     spränge der Scroller bei jedem Pixel zurück auf den Rastpunkt.
   - Darüberfahren fächert den Stapel weiter auf (`--fan` 0 → 1 am Stapel,
     die Lagen rechnet CSS daraus).
   - Ein Klick auf ein Heft hinten im Fächer holt es nach vorn, statt den
     Artikel zu öffnen; erst das vordere öffnet ihn. Nur für echte Klicks —
     Enter auf einem fokussierten Heft öffnet es wie immer.

   Finger und Trackpad bleiben nativ (siehe wischen-nativ-statt-js). */

import gsap from 'gsap';
import { settleIndex } from './sideDrag';

/** Ab hier ist ein Druck ein Ziehen und kein Klick. */
const SLOP = 5;

export function armDeckMouse(stage: HTMLElement, deck: HTMLElement): () => void {
  const covers = () => Array.from(deck.querySelectorAll<HTMLElement>('[data-deck-index]'));
  /** Mausweg, der ein Heft weiterblättert: eine Heftbreite. */
  const finger = () => covers()[0]?.offsetWidth || deck.clientWidth;
  const front = () => Math.round(deck.scrollLeft / Math.max(1, deck.clientWidth));

  let glide: gsap.core.Tween | null = null;
  const release = () => {
    glide = null;
    deck.removeAttribute('data-gliding');
  };
  const glideTo = (index: number) => {
    glide?.kill();
    deck.setAttribute('data-gliding', '');
    const left = index * deck.clientWidth;
    if (Math.abs(deck.scrollLeft - left) < 1) {
      deck.scrollLeft = left;
      release();
      return;
    }
    glide = gsap.to(deck, {
      scrollLeft: left,
      duration: 0.75,
      ease: 'power3.out',
      onComplete: release,
      onInterrupt: release,
    });
  };

  let pointer: number | null = null;
  let x0 = 0;
  let scroll0 = 0;
  let dragging = false;
  let samples: { x: number; t: number }[] = [];
  let swallow = false;

  const down = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    glide?.kill();
    pointer = event.pointerId;
    x0 = event.clientX;
    scroll0 = deck.scrollLeft;
    dragging = false;
    samples = [{ x: event.clientX, t: event.timeStamp }];
  };

  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    const dx = event.clientX - x0;
    if (!dragging) {
      if (Math.abs(dx) <= SLOP) return;
      dragging = true;
      deck.setAttribute('data-gliding', '');
      deck.setPointerCapture?.(event.pointerId);
    }
    samples.push({ x: event.clientX, t: event.timeStamp });
    if (samples.length > 6) samples.shift();
    deck.scrollLeft = scroll0 - (dx * deck.clientWidth) / finger();
  };

  const up = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    pointer = null;
    if (!dragging) return;
    dragging = false;
    // Der Klick, der auf das Loslassen folgt, gehört zum Ziehen.
    swallow = true;
    window.setTimeout(() => (swallow = false), 0);
    const first = samples[0];
    const last = samples[samples.length - 1];
    const span = last.t - first.t;
    const speed = span > 0 && span < 160 ? -(last.x - first.x) / span : 0;
    const at = deck.scrollLeft / Math.max(1, deck.clientWidth);
    glideTo(settleIndex(at, speed, finger(), covers().length));
  };

  const click = (event: MouseEvent) => {
    if (swallow) {
      event.preventDefault();
      event.stopPropagation();
      swallow = false;
      return;
    }
    // `detail` 0: per Tastatur ausgelöst — das öffnet den Artikel.
    if (event.detail === 0) return;
    const cover = (event.target as Element).closest<HTMLElement>('[data-deck-index]');
    if (!cover) return;
    const index = Number(cover.dataset.deckIndex);
    if (index === front()) return;
    event.preventDefault();
    glideTo(index);
  };

  // Bilder und Links nicht als Ziehbild mitnehmen.
  const noGhost = (event: DragEvent) => event.preventDefault();

  const fan = (open: boolean) =>
    gsap.to(stage, {
      '--fan': open ? 1 : 0,
      duration: open ? 1.1 : 0.6,
      ease: open ? 'elastic.out(1, 0.55)' : 'power3.out',
      overwrite: true,
    });
  const enter = (event: PointerEvent) => event.pointerType === 'mouse' && fan(true);
  const leave = (event: PointerEvent) => event.pointerType === 'mouse' && fan(false);

  deck.addEventListener('pointerdown', down);
  deck.addEventListener('pointermove', move);
  deck.addEventListener('pointerup', up);
  deck.addEventListener('pointercancel', up);
  deck.addEventListener('click', click, true);
  deck.addEventListener('dragstart', noGhost);
  deck.addEventListener('pointerenter', enter);
  deck.addEventListener('pointerleave', leave);

  return () => {
    glide?.kill();
    release();
    gsap.killTweensOf(stage);
    stage.style.removeProperty('--fan');
    deck.removeEventListener('pointerdown', down);
    deck.removeEventListener('pointermove', move);
    deck.removeEventListener('pointerup', up);
    deck.removeEventListener('pointercancel', up);
    deck.removeEventListener('click', click, true);
    deck.removeEventListener('dragstart', noGhost);
    deck.removeEventListener('pointerenter', enter);
    deck.removeEventListener('pointerleave', leave);
  };
}
