/* Der Magazin-Stapel der Startseite ab 768px: die Hefte liegen als Fächer
   auf dem Tisch (MagazineGrid), und jedes Blättern ist eine eigene, getimte
   Bewegung wie im „Card stack" der GSAP-Demos — nicht mehr der Scrollweg
   eines unsichtbaren Querscrollers. Der trug die Hefte bis 01.10.2026: ein
   Klick liess ihn mit Schwung über zwei Hefte gleiten, das erste schoss in
   rund 60 ms aus dem Bild, und der Fächer sprang um (Ansage: „blinkt so
   komisch, dann verschwinden die einfach plötzlich").

   Jetzt hat jedes Heft eine Tiefe (0 = vorn, Kommazahlen dazwischen), und
   GSAP fährt sie in der Zeit. Weiterblättern:
   - das vordere Heft wird angehoben, dann nach links aus dem Bild geworfen
     — über allen anderen, unter der Überschrift durch;
   - die übrigen rücken versetzt eine Lage vor, das vorderste zuerst;
   - ausserhalb des Bilds legt sich das geworfene unter das Ende des
     Fächers, wo es niemand sieht: der Stapel ist ein Ring.
   Zurück fliegt das hinterste von links wieder obenauf. Wer mehrere Hefte
   weiter will (Punkt, Klick in den Fächer), bekommt sie nacheinander
   ausgeteilt, nie alle auf einmal.

   Eingaben, alle zum selben Zustand: Ziehen (Maus, Finger, Stift — das
   vordere Heft geht mit der Hand und wird beim Loslassen geworfen oder
   federt zurück), seitliches Wischen auf dem Trackpad (eine Geste, ein
   Heft), Klick auf ein Heft im Fächer, die Punkte (DECK_GO_EVENT),
   Tastaturfokus auf einem hinteren Heft. Die Maus über dem Tisch fächert
   weiter auf. Wie weit, steht in CSS (`--fan-*` an `.stage`), damit der
   Fächer schon vor dem Hydrieren richtig liegt. */

import gsap from 'gsap';
import { DECK_GO_EVENT } from './magazineDeck';

export interface FanGeometry {
  /** So viele Hefte liegen sichtbar hinter dem vorderen; dahinter genau
   *  unter dem letzten. */
  spread: number;
  /** Wie viel kleiner jede Lage wird. */
  shrink: number;
  /** In Ruhe → aufgeblättert, pro Lage: Versatz in % eines Hefts, Hub in px,
   *  Drehung in Grad. */
  x: [number, number];
  y: [number, number];
  r: [number, number];
}

export interface Pose {
  x: number;
  y: number;
  r: number;
  s: number;
}

/** Bewegung ausserhalb des Fächers: Wurf, Hand, Anheben. */
interface Toss {
  x: number;
  y: number;
  r: number;
  s: number;
}

const FALLBACK: FanGeometry = {
  spread: 4,
  shrink: 0.04,
  x: [-16, -21],
  y: [-5, -11],
  r: [-2.6, -3.8],
};

const T = {
  /** Anheben, bevor es fliegt. */
  lift: 0.14,
  /** Wurf aus dem Bild. */
  toss: 0.5,
  /** Eine Lage vorrücken; die hinteren folgen je um `stagger` später. */
  shift: 0.7,
  stagger: 0.05,
  /** Abstand zwischen zwei ausgeteilten Heften. */
  deal: 0.18,
  /** Zurückblättern: von links wieder obenauf. */
  back: 0.75,
};

/** Ab hier ist ein Druck ein Ziehen und kein Klick. */
const SLOP = 6;
/** Ab diesem Tempo (px/ms) ist ein Loslassen ein Wurf, auch wenn der Weg kurz war. */
const FLICK = 0.45;
/** Trackpad: so viel Querweg, dann blättert die Geste ein Heft. */
const WHEEL_STEP = 40;
/** So lange Ruhe, dann ist eine Trackpad-Geste samt Nachschwung vorbei. */
const WHEEL_IDLE = 220;

export function ringDepth(i: number, front: number, count: number): number {
  return (((i - front) % count) + count) % count;
}

/** Schritte von einem Heft zum anderen, den kürzeren Weg um den Ring;
 *  positiv = weiterblättern. */
export function stepsBetween(from: number, to: number, count: number): number {
  const ahead = ringDepth(to, from, count);
  return ahead <= count / 2 ? ahead : ahead - count;
}

// `|| 0`: kein „-0%" im Transform.
const round = (n: number) => Math.round(n * 1000) / 1000 || 0;

export function fanPose(depth: number, fan: number, geo: FanGeometry): Pose {
  const d = Math.min(Math.max(depth, 0), geo.spread);
  const mix = ([rest, open]: [number, number]) => rest + (open - rest) * fan;
  return {
    x: round(d * mix(geo.x)),
    y: round(d * mix(geo.y)),
    r: round(d * mix(geo.r)),
    s: round(1 - geo.shrink * d),
  };
}

function cardTransform(pose: Pose, toss: Toss): string {
  return (
    `translate(${round(toss.x)}px, ${round(toss.y)}px) rotate(${round(toss.r)}deg) ` +
    `translate(${pose.x}%, ${pose.y}px) rotate(${pose.r}deg) scale(${round(pose.s * toss.s)})`
  );
}

function readGeometry(stage: HTMLElement): FanGeometry {
  const css = getComputedStyle(stage);
  const num = (name: string, fallback: number) => {
    const value = parseFloat(css.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    spread: num('--fan-spread', FALLBACK.spread),
    shrink: num('--fan-shrink', FALLBACK.shrink),
    x: [num('--fan-x-rest', FALLBACK.x[0]), num('--fan-x-open', FALLBACK.x[1])],
    y: [num('--fan-y-rest', FALLBACK.y[0]), num('--fan-y-open', FALLBACK.y[1])],
    r: [num('--fan-r-rest', FALLBACK.r[0]), num('--fan-r-open', FALLBACK.r[1])],
  };
}

interface Card {
  el: HTMLElement;
  depth: number;
  toss: Toss;
  /** Unterwegs ausserhalb des Fächers (geworfen oder im Anflug): ganz oben. */
  flying: boolean;
  /** Ebene im Flug, siehe `lift`. */
  air: number;
}

const still = (): Toss => ({ x: 0, y: 0, r: 0, s: 1 });

export function armMagazineTable(stage: HTMLElement, deck: HTMLElement): () => void {
  const cards: Card[] = Array.from(deck.querySelectorAll<HTMLElement>('[data-deck-index]')).map(
    (el, i) => ({ el, depth: i, toss: still(), flying: false, air: 0 })
  );
  const count = cards.length;
  if (count < 2) return () => {};
  const dots = Array.from(stage.querySelectorAll<HTMLElement>('[data-deck-dot]'));

  let geo = readGeometry(stage);
  let front = 0;
  const view = { fan: 0 };

  // Gezeichnet wird einmal pro Frame, nach allen Tweens.
  let dirty = true;
  const touch = () => (dirty = true);
  const render = () => {
    if (!dirty) return;
    dirty = false;
    for (const card of cards) {
      card.el.style.transform = cardTransform(fanPose(card.depth, view.fan, geo), card.toss);
    }
  };
  gsap.ticker.add(render);

  /** Wer vorn liegt, liegt oben; was fliegt, über allem. */
  const layer = () => {
    cards.forEach((card, i) => {
      card.el.style.zIndex = String(card.flying ? card.air : count - ringDepth(i, front, count));
    });
  };
  /** Sind mehrere Hefte zugleich in der Luft, braucht jedes seine Ebene —
   *  bei gleicher entschied die DOM-Reihenfolge, und das zuerst geworfene
   *  rutschte unter die nachfolgenden. Geworfene: das frühere bleibt oben,
   *  es lag ja oben. Anfliegende: das spätere landet obenauf. */
  let flights = 0;
  const lift = (card: Card, direction: 'out' | 'in') => {
    if (!cards.some((c) => c.flying)) flights = 0;
    flights++;
    card.flying = true;
    card.air = 1000 + (direction === 'out' ? -flights : flights);
    layer();
  };
  const mark = () => {
    dots.forEach((dot, n) => {
      if (n === front) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  };

  /** Wie weit ein Heft fliegen muss, bis es samt Drehung und Schatten links
   *  aus dem Fenster ist. */
  const outOfView = (card: Card) =>
    card.el.getBoundingClientRect().right + card.el.offsetWidth * 0.6;

  /** Alle anderen auf ihre Lage — das vorderste zuerst, die hinteren folgen. */
  const shift = (skip: Card) => {
    cards.forEach((card, i) => {
      if (card === skip || card.flying) return;
      const depth = ringDepth(i, front, count);
      gsap.to(card, {
        depth,
        duration: T.shift,
        delay: Math.min(depth, geo.spread) * T.stagger,
        ease: 'power3.inOut',
        overwrite: 'auto',
        onUpdate: touch,
      });
    });
  };

  /** Ausserhalb des Bilds: unter das Heft, das im Ring direkt davor liegt,
   *  genau dort, wo es gerade ist — von dort kommt es mit ihm hervor. Beim
   *  Austeilen mehrerer Hefte rutscht dieses noch selbst nach hinten; an
   *  seinem Ziel statt an seiner Lage blitzte das gelandete daneben heraus. */
  const land = (card: Card) => {
    const depth = ringDepth(cards.indexOf(card), front, count);
    let start = 0;
    for (let d = depth - 1; d >= 0; d--) {
      const ahead = cards[(front + d) % count];
      if (ahead.flying) continue;
      start = ahead.depth;
      break;
    }
    card.flying = false;
    card.toss = still();
    card.depth = start;
    layer();
    gsap.to(card, { depth, duration: 0.45, ease: 'power2.out', onUpdate: touch });
    touch();
  };

  const toss = (card: Card, flung: boolean) => {
    gsap.killTweensOf(card.toss);
    lift(card, 'out');
    const h = card.el.offsetHeight;
    const out = {
      x: card.toss.x - outOfView(card),
      y: h * 0.04,
      r: -16,
      s: 1,
      ease: flung ? 'power2.out' : 'power1.in',
      duration: T.toss,
    };
    const tl = gsap.timeline({ onUpdate: touch, onComplete: () => land(card) });
    // Aus der Hand fliegt es gleich; sonst wird es erst angehoben.
    if (!flung) {
      tl.to(card.toss, {
        x: -card.el.offsetWidth * 0.06,
        y: -h * 0.02,
        r: -3,
        s: 1.03,
        duration: T.lift,
        ease: 'power2.out',
      });
    }
    tl.to(card.toss, out);
  };

  const forward = (flung = false) => {
    const leaving = cards[front];
    front = (front + 1) % count;
    mark();
    toss(leaving, flung);
    shift(leaving);
  };

  const backward = () => {
    front = (front - 1 + count) % count;
    mark();
    const coming = cards[front];
    gsap.killTweensOf(coming);
    gsap.killTweensOf(coming.toss);
    // Es lag unsichtbar unter dem Ende des Fächers: von dort ausserhalb des
    // Bilds, dann obenauf.
    coming.depth = 0;
    coming.toss = { x: -outOfView(coming), y: coming.el.offsetHeight * 0.04, r: -16, s: 1 };
    lift(coming, 'in');
    gsap.to(coming.toss, {
      x: 0,
      y: 0,
      r: 0,
      s: 1,
      duration: T.back,
      ease: 'power3.out',
      onUpdate: touch,
      onComplete: () => {
        coming.flying = false;
        layer();
      },
    });
    shift(coming);
    touch();
  };

  // Mehrere Hefte weiter: nacheinander austeilen.
  let pending = 0;
  let dealing: gsap.core.Tween | null = null;
  const deal = () => {
    dealing = null;
    if (!pending) return;
    if (pending > 0) {
      pending--;
      forward();
    } else {
      pending++;
      backward();
    }
    if (pending) dealing = gsap.delayedCall(T.deal, deal);
  };
  const goTo = (index: number) => {
    pending = stepsBetween(front, index, count);
    if (!dealing) deal();
  };
  const step = (dir: number) => {
    pending = Math.max(1 - count, Math.min(count - 1, pending + dir));
    if (!dealing) deal();
  };

  // ── Ziehen ──
  let drag: {
    id: number;
    x0: number;
    y0: number;
    live: boolean;
    samples: { x: number; t: number }[];
  } | null = null;
  let swallow = false;

  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    drag = { id: event.pointerId, x0: event.clientX, y0: event.clientY, live: false, samples: [] };
    drag.samples.push({ x: event.clientX, t: event.timeStamp });
  };

  const move = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x0;
    const dy = event.clientY - drag.y0;
    if (!drag.live) {
      if (Math.abs(dy) > SLOP && Math.abs(dy) > Math.abs(dx)) {
        drag = null; // senkrecht: das ist Scrollen
        return;
      }
      if (Math.abs(dx) <= SLOP) return;
      drag.live = true;
      pending = 0;
      dealing?.kill();
      dealing = null;
      gsap.killTweensOf(cards[front].toss);
      deck.setAttribute('data-dragging', '');
      deck.setPointerCapture?.(event.pointerId);
    }
    drag.samples.push({ x: event.clientX, t: event.timeStamp });
    if (drag.samples.length > 6) drag.samples.shift();
    const card = cards[front];
    // Nach rechts zieht es zäh: dort liegt nichts, was es freigäbe.
    const x = dx < 0 ? dx : dx * 0.35;
    card.toss = { x, y: 0, r: Math.max(-8, Math.min(8, x * 0.02)), s: 1.02 };
    touch();
  };

  const up = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const { live, samples, x0 } = drag;
    drag = null;
    if (!live) return;
    deck.removeAttribute('data-dragging');
    // Der Klick, der auf das Loslassen folgt, gehört zum Ziehen.
    swallow = true;
    window.setTimeout(() => (swallow = false), 0);
    const first = samples[0];
    const last = samples[samples.length - 1];
    const span = last.t - first.t;
    const speed = span > 0 && span < 160 ? (last.x - first.x) / span : 0;
    const dx = event.clientX - x0;
    const reach = cards[front].el.offsetWidth * 0.25;
    if (event.type !== 'pointercancel' && (dx < -reach || speed < -FLICK)) {
      forward(true);
      return;
    }
    gsap.to(cards[front].toss, {
      x: 0,
      y: 0,
      r: 0,
      s: 1,
      duration: 0.5,
      ease: 'power3.out',
      onUpdate: touch,
    });
    if (event.type !== 'pointercancel' && (dx > reach || speed > FLICK)) backward();
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
    if (index === front) return;
    event.preventDefault();
    goTo(index);
  };

  // Tab auf ein hinteres Heft holt es nach vorn, damit man sieht, was fokussiert ist.
  const focus = (event: FocusEvent) => {
    const target = event.target as HTMLElement;
    const cover = target.closest<HTMLElement>('[data-deck-index]');
    if (!cover) return;
    let visible = false;
    try {
      visible = target.matches(':focus-visible');
    } catch {
      visible = false;
    }
    const index = Number(cover.dataset.deckIndex);
    if (visible && index !== front) goTo(index);
  };

  // ── Trackpad: eine Geste, ein Heft ──
  let wheelSum = 0;
  let wheelDone = false;
  let wheelIdle: number | undefined;
  const wheel = (event: WheelEvent) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    // Sonst blättert der Browser bei seitlichem Wischen eine Seite zurück.
    event.preventDefault();
    window.clearTimeout(wheelIdle);
    wheelIdle = window.setTimeout(() => {
      wheelSum = 0;
      wheelDone = false;
    }, WHEEL_IDLE);
    if (wheelDone) return;
    wheelSum += event.deltaX;
    if (Math.abs(wheelSum) < WHEEL_STEP) return;
    wheelDone = true;
    step(Math.sign(wheelSum));
  };

  const go = (event: Event) => {
    event.preventDefault();
    goTo((event as CustomEvent<number>).detail);
  };

  // Die Maus über dem Tisch fächert weiter auf.
  const fan = (open: boolean) =>
    gsap.to(view, {
      fan: open ? 1 : 0,
      duration: open ? 0.7 : 0.5,
      ease: 'power3.out',
      overwrite: true,
      onUpdate: touch,
    });
  const enter = (event: PointerEvent) => event.pointerType === 'mouse' && fan(true);
  const leave = (event: PointerEvent) => event.pointerType === 'mouse' && fan(false);

  // Bilder und Links nicht als Ziehbild mitnehmen.
  const noGhost = (event: DragEvent) => event.preventDefault();

  const resize = () => {
    geo = readGeometry(stage);
    touch();
  };

  layer();
  mark();
  render();

  deck.addEventListener('pointerdown', down);
  deck.addEventListener('pointermove', move);
  deck.addEventListener('pointerup', up);
  deck.addEventListener('pointercancel', up);
  deck.addEventListener('click', click, true);
  deck.addEventListener('focusin', focus);
  deck.addEventListener('wheel', wheel, { passive: false });
  deck.addEventListener(DECK_GO_EVENT, go);
  deck.addEventListener('pointerenter', enter);
  deck.addEventListener('pointerleave', leave);
  deck.addEventListener('dragstart', noGhost);
  window.addEventListener('resize', resize);

  return () => {
    gsap.ticker.remove(render);
    dealing?.kill();
    gsap.killTweensOf(view);
    window.clearTimeout(wheelIdle);
    cards.forEach((card, i) => {
      gsap.killTweensOf(card);
      gsap.killTweensOf(card.toss);
      card.el.style.transform = '';
      card.el.style.zIndex = String(count - i);
    });
    dots.forEach((dot) => dot.removeAttribute('aria-current'));
    deck.removeAttribute('data-dragging');
    deck.removeEventListener('pointerdown', down);
    deck.removeEventListener('pointermove', move);
    deck.removeEventListener('pointerup', up);
    deck.removeEventListener('pointercancel', up);
    deck.removeEventListener('click', click, true);
    deck.removeEventListener('focusin', focus);
    deck.removeEventListener('wheel', wheel);
    deck.removeEventListener(DECK_GO_EVENT, go);
    deck.removeEventListener('pointerenter', enter);
    deck.removeEventListener('pointerleave', leave);
    deck.removeEventListener('dragstart', noGhost);
    window.removeEventListener('resize', resize);
  };
}
