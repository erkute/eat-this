import gsap from 'gsap';
import { appScroller } from '@/lib/dom/appScroller';

const THRESHOLD = 0.2;

/**
 * Einflüge der Startseite, wenn eine Section zum ersten Mal ins Bild kommt
 * (Ansage 21.10.2026: „GSAP-Animationen wie auf der Live-Seite" — der
 * Kartenstapel des Magazins, das Austeilen der Must Eats). Ausgelöst per
 * IntersectionObserver, nie über die Scrollposition. Steht die Section beim
 * Laden schon im Bild (Neuladen mitten auf der Seite, Sprung per Anker),
 * bleibt sie, wie sie ist: sichtbarer Inhalt wartet nie auf eine Animation.
 */
export function onFirstView(
  section: Element,
  prepare: () => void,
  play: () => void,
): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  let armed = false;
  const io = new IntersectionObserver(
    ([entry]) => {
      // `isIntersecting` wäre schon bei einem Pixel wahr; erst ab dem
      // Schwellwert gilt die Section als im Bild.
      const inView = entry.isIntersecting && entry.intersectionRatio >= THRESHOLD;
      if (!armed) {
        armed = true;
        if (inView) {
          io.disconnect();
          return;
        }
        prepare();
        return;
      }
      if (!inView) return;
      io.disconnect();
      play();
    },
    { root: appScroller(), threshold: THRESHOLD },
  );
  io.observe(section);
  return () => io.disconnect();
}

export const visible = (elements: Iterable<HTMLElement>) =>
  Array.from(elements).filter((el) => el.getClientRects().length > 0);

const centre = (el: Element) => {
  const box = el.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};

/** Wie ausgeteilte Karten leicht schief, nie zweimal gleich. */
const TILTS = [-7, 5, -3, 6, -5, 4];

/**
 * Teilt `items` von einem Stapel aus auf ihre Plätze im Layout aus. Der Stapel
 * liegt um `pile` (Bildschirmpunkt), das oberste Element landet zuerst. Nur
 * Transformationen bewegen sich; die Plätze liefert das Layout.
 */
export function dealFromPile(
  items: HTMLElement[],
  pile: { x: number; y: number },
  options: { duration?: number; stagger?: number; lift?: number; scale?: number } = {},
): gsap.core.Timeline {
  const { duration = 0.8, stagger = 0.09, lift = 0, scale = 0.92 } = options;
  // Erst alle Plätze lesen, dann schreiben.
  const spots = items.map(centre);
  const timeline = gsap.timeline();
  items.forEach((item, index) => {
    gsap.set(item, { zIndex: items.length - index, position: 'relative' });
    timeline.fromTo(
      item,
      {
        x: pile.x - spots[index].x,
        y: pile.y - spots[index].y + lift,
        rotation: TILTS[index % TILTS.length],
        scale,
      },
      {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        duration,
        ease: 'power3.out',
        clearProps: 'transform,zIndex,position',
      },
      index * stagger,
    );
  });
  return timeline;
}

/** Legt `items` schon vor dem Auftritt auf den Stapel, damit beim
 *  Hereinscrollen nichts kurz an seinem Platz aufblitzt. */
export function stackOnPile(items: HTMLElement[], pile: { x: number; y: number }, lift = 0, scale = 0.92) {
  const spots = items.map(centre);
  items.forEach((item, index) => {
    gsap.set(item, {
      zIndex: items.length - index,
      position: 'relative',
      x: pile.x - spots[index].x,
      y: pile.y - spots[index].y + lift,
      rotation: TILTS[index % TILTS.length],
      scale,
    });
  });
}

export const CLEAR_DEAL = 'transform,zIndex,position';
