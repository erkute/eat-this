/* „Was ist um dich?“: ScrollTrigger öffnet einen Fotofächer zur Fotowand.
   Nach Standortfreigabe sortiert Flip die Spots nach Entfernung; die grauen
   Gehzeit-Stempel zählen ihre Werte hoch. Reduced Motion zeigt die Endlage. */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { appScroller } from '@/lib/dom/appScroller';

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

/* ── Das „?" sucht ── */

/** Eine „?"-Walze dreht eine Runde und landet wieder auf „?". */
function spinQuestion(reel: HTMLElement): void {
  if (reel.dataset.reel !== '?' || gsap.isTweening(reel)) return;
  gsap.fromTo(
    reel,
    { y: 0, yPercent: reelPercent(0) },
    {
      yPercent: reelPercent(COUNTER_GLYPHS.length),
      duration: 0.9,
      ease: 'power2.inOut',
      onComplete: () => {
        gsap.set(reel, { clearProps: 'transform' });
      },
    }
  );
}

/** Solange der Standort fehlt und die Karten im Bild sind, dreht alle
 *  `every` ms eine zufällige „?"-Walze; mit der Maus dreht die der Karte,
 *  auf die man zeigt. Gibt die Aufräumfunktion zurück. */
export function armQuestionSpin(board: HTMLElement, every = 2600): () => void {
  if (reducedMotion() || typeof IntersectionObserver === 'undefined') return () => {};
  let inView = false;
  const io = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
    },
    { threshold: 0.2 }
  );
  io.observe(board);
  const timer = window.setInterval(() => {
    if (!inView || document.hidden) return;
    const reels = Array.from(board.querySelectorAll<HTMLElement>('[data-reel="?"]')).filter(
      (reel) => reel.getClientRects().length > 0
    );
    if (reels.length) spinQuestion(reels[Math.floor(Math.random() * reels.length)]);
  }, every);
  const onOver = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    const card = (event.target as Element).closest('a');
    // Nur beim Betreten der Karte, nicht bei jedem Kind darin.
    if (!card || card.contains(event.relatedTarget as Node | null)) return;
    const reel = card.querySelector<HTMLElement>('[data-reel="?"]');
    if (reel) spinQuestion(reel);
  };
  board.addEventListener('pointerover', onOver);
  return () => {
    io.disconnect();
    window.clearInterval(timer);
    board.removeEventListener('pointerover', onOver);
  };
}

/* Der Scrollweg öffnet den Fotofächer zur frei anklickbaren Fotowand. */
export interface NearbyEntrance {
  finish: () => void;
  dispose: () => void;
}

export function createNearbyEntrance(board: HTMLElement): NearbyEntrance | null {
  if (!window.matchMedia || reducedMotion()) return null;
  const spread = board.querySelector<HTMLElement>('[data-nearby-spread]');
  if (!spread) return null;
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  let timeline: gsap.core.Timeline | null = null;
  let finished = false;
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const cards = Array.from(spread.querySelectorAll<HTMLElement>('[data-flip-id] > a'));
    if (!cards.length || finished) return;
    const box = () => spread.getBoundingClientRect();
    timeline = gsap.timeline({
      scrollTrigger: {
        trigger: spread,
        scroller: appScroller() ?? undefined,
        start: 'top 85%',
        end: 'top 15%',
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });
    cards.forEach((card, i) => {
      const position = i - (cards.length - 1) / 2;
      timeline!.fromTo(card, {
        x: () => box().left + box().width / 2 - (card.parentElement!.getBoundingClientRect().left + card.offsetWidth / 2) + position * Math.min(32, box().width * 0.035),
        y: () => box().top + 140 - card.parentElement!.getBoundingClientRect().top + card.offsetTop + Math.abs(position) * 12,
        rotation: position * 9,
        scale: () => Math.min(1, (window.innerWidth < 768 ? 150 : 250) / Math.max(1, card.offsetWidth)),
        transformOrigin: '50% 25%',
      }, {
        x: 0, y: 0, rotation: 0, scale: 1,
        duration: 1,
        ease: 'power2.inOut',
      }, i * 0.035);
    });
    // Keyboard navigation exposes the complete wall immediately.
    const onFocus = () => finish();
    spread.addEventListener('focusin', onFocus);
    return () => {
      spread.removeEventListener('focusin', onFocus);
      timeline = null;
    };
  });
  const finish = () => {
    finished = true;
    timeline?.scrollTrigger?.kill();
    timeline?.progress(1);
  };
  return {
    finish,
    dispose: () => media.revert(),
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
              clipPath: 'inset(100% 0 0 0)',
              y: 64,
              scale: 0.92,
              rotation: (i: number) => (i % 2 ? 7 : -7),
            },
            {
              y: 0,
              scale: 1,
              rotation: 0,
              clipPath: 'inset(0% 0 0 0)',
              duration: 0.85,
              ease: 'back.out(1.3)',
              stagger: 0.1,
              clearProps: 'transform,clipPath',
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
