/* „Was ist um dich?" (HubNearby): die Nächste groß, die übrigen klein in der
   Querleiste, auf jeder Karte ein grauer Stempel mit der Gehzeit (Wahl vom
   02.10.2026 nach Prototyp „D · Die Nächste", Stempel grau, mit Zähler).

   Drei Bewegungen:
   - Beim Hereinkommen schlagen die Stempel nacheinander ein (`armNearbyStamps`,
     aus HubMotion).
   - Nach „Freigeben" sortiert sich alles nach Nähe: die neue Nächste fliegt in
     den großen Platz, die alte schrumpft in die Leiste, Neue werden von unten
     eingeworfen (`rememberCards`).
   - Dabei laufen die Stempel wie ein Zählwerk von „?" auf die Gehzeit: jede
     Ziffer ist eine Walze (`spinCounters`).
   Bewegt wird nur per translate/rotate/scale, nie per Opacity (Hausregel für
   Brand-Flächen). GSAP Flip wird erst beim Tipp auf „Freigeben" geladen: der
   Startseite kostet das nichts, solange niemand fragt. */
import gsap from 'gsap';

type FlipPlugin = (typeof import('gsap/Flip'))['Flip'];

let plugin: Promise<FlipPlugin> | null = null;
const loadFlip = () =>
  (plugin ??= import('gsap/Flip').then(({ Flip }) => {
    gsap.registerPlugin(Flip);
    return Flip;
  }));

const reducedMotion = () =>
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ── Zählwerk ──
   Jede Ziffer steht auf einer Walze: alle Zeichen untereinander, CYCLES-mal
   wiederholt. Welches Zeichen im Fenster steht, setzt das CSS über
   `--reel-y` (in Prozent der Walzenhöhe — unabhängig davon, wann die
   Schrift lädt);
   gedreht wird nur für die Dauer des Zählens per GSAP. */
export const COUNTER_GLYPHS = ['?', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '.'];
export const COUNTER_CYCLES = 3;
const REEL_LENGTH = COUNTER_GLYPHS.length * COUNTER_CYCLES;
/** Wie weit die Walze steht, damit Zeichen `index` im Fenster ist (in %). */
export const reelPercent = (index: number) => -(index * 100) / REEL_LENGTH;

/** Die Zeichen einer Walze, als ein Textblock mit einem Zeichen pro Zeile. */
export const COUNTER_REEL = Array.from(
  { length: REEL_LENGTH },
  (_, i) => COUNTER_GLYPHS[i % COUNTER_GLYPHS.length]
).join('\n');

/** Dreht jede Walze von „?" zwei Runden weiter auf ihr Zeichen. */
export function spinCounters(root: Element, delay = 0): void {
  root.querySelectorAll<HTMLElement>('[data-reel]').forEach((reel, k) => {
    const at = COUNTER_GLYPHS.indexOf(reel.dataset.reel ?? '');
    if (at < 0) return;
    gsap.fromTo(
      reel,
      { y: 0, yPercent: reelPercent(0) },
      {
        yPercent: reelPercent(at + COUNTER_GLYPHS.length * (COUNTER_CYCLES - 1)),
        duration: 1.15 + k * 0.05,
        delay,
        ease: 'power3.out',
        // Danach steht die Walze wieder per CSS (`--reel-y`), damit spätere
        // Werte ohne Zählen ankommen.
        onComplete: () => {
          gsap.set(reel, { clearProps: 'transform' });
        },
      }
    );
  });
}

/* ── Stempel beim Hereinkommen ── */

/** Die Stempel schlagen nacheinander ein, sobald die Karten ins Bild kommen;
 *  die Karte darunter zuckt. Einmal pro Seitenaufruf. */
export function armNearbyStamps(): () => void {
  const spread = document.querySelector<HTMLElement>('[data-hub-nearby] [data-nearby-spread]');
  if (!spread || typeof IntersectionObserver === 'undefined') return () => {};
  const stamps = () => Array.from(spread.querySelectorAll<HTMLElement>('[data-stamp]'));
  gsap.set(stamps(), { scale: 0 });
  let tl: gsap.core.Timeline | null = null;
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      // Neu abfragen: die Karten können seit dem Laden gewechselt haben.
      const all = stamps();
      gsap.set(all, { scale: 0 });
      tl = gsap.timeline();
      all.forEach((stamp, i) => {
        const at = 0.1 + i * 0.11;
        tl!.fromTo(
          stamp,
          { scale: 2.8, rotation: -26 },
          { scale: 1, rotation: -7, duration: 0.2, ease: 'power4.in', immediateRender: false },
          at
        );
        const card = stamp.closest('a');
        if (card) {
          tl!.to(card, { y: 4, duration: 0.05, ease: 'power1.out', yoyo: true, repeat: 1 }, at + 0.2);
        }
      });
    },
    { rootMargin: '0px 0px -25% 0px' }
  );
  io.observe(spread);
  return () => {
    io.disconnect();
    tl?.kill();
    gsap.set(stamps(), { clearProps: 'transform' });
  };
}

/* ── Umsortieren nach „Freigeben" ── */

/** Die Karten an ihrer Flip-Kennung (`data-flip-id`): die Große und die der
 *  Leiste. Flip ordnet über die Kennung zu, auch wenn eine Karte vom großen
 *  Platz in die Leiste wechselt und dabei ein neues Element ist. */
const cardsOf = (board: HTMLElement) =>
  Array.from(board.querySelectorAll<HTMLElement>('[data-flip-id]'));

export interface CardsFlip {
  /** Spielt den Weg von der gemerkten Lage zur jetzigen. */
  play: (board: HTMLElement) => void;
}

/** Merkt sich, wo die Karten gerade stehen. Ohne Bewegung: `null`. */
export async function rememberCards(board: HTMLElement): Promise<CardsFlip | null> {
  if (reducedMotion()) return null;
  const Flip = await loadFlip();
  const state = Flip.getState(cardsOf(board));
  return {
    play(board) {
      // Die Leiste beginnt wieder am Anfang, gleich neben der Nächsten.
      board.querySelector('[data-nearby-rail]')?.scrollTo({ left: 0, behavior: 'instant' });
      const cards = cardsOf(board);
      let fresh: Element[] = [];
      Flip.from(state, {
        targets: cards,
        duration: 0.9,
        ease: 'power3.inOut',
        // Groß ↔ klein per scale: die Leiste ist ein Flex-Rahmen, eine
        // Breite liesse sich dort nicht tweenen.
        scale: true,
        // Die Eingeworfenen räumen selbst auf, sie fliegen länger.
        onComplete: () =>
          gsap.set(
            cards.filter((card) => !fresh.includes(card)),
            { clearProps: 'transform' }
          ),
        onEnter: (entering) =>
          gsap.fromTo(
            (fresh = entering),
            {
              y: 160,
              scale: 0.72,
              rotation: (i: number) => (i % 2 ? 7 : -7),
            },
            {
              y: 0,
              scale: 1,
              rotation: 0,
              duration: 0.75,
              ease: 'back.out(1.3)',
              stagger: 0.08,
              clearProps: 'transform',
            }
          ),
      });
      spinCounters(board, 0.3);
    },
  };
}

export interface PhotoSource {
  src: string;
  srcSet?: string;
  sizes: string;
}

/** Lädt die ersten Fotos der neuen Reihe vor — sonst flogen dunkle, leere
 *  Karten ein, und die Fotos ploppten erst auf, als sie schon lagen
 *  (gemessen 01.10.2026: Fotos nach ~1,2 s). Höchstens `ms` lang: ein
 *  langsames Netz hält die Leiste nicht fest. Dieselben `srcset`/`sizes` wie
 *  die Karte, damit der Browser dieselbe Datei wählt und sie dann im Cache
 *  liegt. */
export function preloadPhotos(photos: PhotoSource[], ms = 1200): Promise<void> {
  const loads = photos.map(({ src, srcSet, sizes }) => {
    const img = new Image();
    img.sizes = sizes;
    if (srcSet) img.srcset = srcSet;
    img.src = src;
    if (typeof img.decode === 'function') return img.decode().catch(() => {});
    return new Promise<void>((done) => {
      img.onload = img.onerror = () => done();
    });
  });
  return Promise.race([
    Promise.all(loads).then(() => {}),
    new Promise<void>((done) => window.setTimeout(done, ms)),
  ]);
}
