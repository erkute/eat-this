/* „Was ist um dich?" (HubNearby): die Nächste groß, die übrigen klein in der
   Querleiste bzw. ab 1024px im Raster, auf jeder Karte ein grauer Stempel
   mit der Gehzeit (Wahl vom 02.10.2026 nach Prototyp „D · Die Nächste",
   Stempel grau, mit Zähler).

   Vier Bewegungen:
   - Beim Hereinkommen werden die Karten von einem Stapel ausgeteilt, jede
     bekommt beim Landen ihren Stempel (`createNearbyEntrance`).
   - Ohne Standort sucht das „?": ab und zu dreht eine Walze eine Runde und
     bleibt wieder auf „?", mit der Maus auch die Karte unter dem Zeiger
     (`armQuestionSpin`).
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

/* ── Austeilen beim Hereinkommen ──
   Ab 1024px liegt der Stapel auf dem Foto der Großen: die kleinen Karten
   fliegen nacheinander in ihre Rasterfelder, zuletzt wächst die Große, die
   ganz unten lag, auf ihren Platz. Darunter (Leiste) schneidet die Leiste
   alles ab, was über sie hinausragt — dort wird die Große erst hingelegt,
   dann liegt der Stapel am Anfang der Leiste und wird nach rechts
   ausgeteilt. Jede Karte bekommt beim Landen ihren Stempel. */

const jitter = (i: number, span: number) => Math.sin(i * 12.9898 + 4.1) * span;
const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
const photoOf = (card: HTMLElement) => card.querySelector<HTMLElement>('.hv-photo') ?? card;

export interface NearbyEntrance {
  /** Legt die (womöglich neu gerenderten) Karten wieder auf den Stapel,
   *  solange noch nicht ausgeteilt ist. */
  restack: () => void;
  /** Springt ans Ende (z. B. wenn „Freigeben" getippt wird). */
  finish: () => void;
  dispose: () => void;
}

/** Legt die Karten von `board` auf den Stapel und teilt sie aus, sobald sie
 *  ins Bild kommen. Ohne Bewegung: `null` — die Karten liegen einfach da. */
export function createNearbyEntrance(board: HTMLElement): NearbyEntrance | null {
  if (reducedMotion() || typeof IntersectionObserver === 'undefined') return null;
  const spread = board.querySelector<HTMLElement>('[data-nearby-spread]');
  const rail = board.querySelector<HTMLElement>('[data-nearby-rail]');
  if (!spread || !rail) return null;

  let state: 'stacked' | 'dealing' | 'done' = 'stacked';
  let tl: gsap.core.Timeline | null = null;

  const heroCard = () => spread.querySelector<HTMLElement>(':scope > [data-flip-id] > a');
  const railCards = () =>
    Array.from(rail.querySelectorAll<HTMLElement>(':scope > li > a')).filter(
      (card) => card.getClientRects().length > 0
    );
  // Das Raster (ab 1024px) schneidet nicht ab, die Leiste schon.
  const isGrid = () => getComputedStyle(rail).overflowX === 'visible';
  const stampOf = (card: HTMLElement) => card.querySelector<HTMLElement>('[data-stamp]');
  const all = () => [heroCard(), ...railCards()].filter((c): c is HTMLElement => !!c);
  const stamps = () => all().flatMap((card) => stampOf(card) ?? []);
  const slides = () => railCards().flatMap((card) => card.parentElement ?? []);

  const stack = () => {
    // Deckender Grund, solange Karten übereinanderliegen (HubNearby.module.css).
    board.setAttribute('data-dealing', '');
    const hero = heroCard();
    const cards = railCards();
    // Erst ohne Versatz messen, dann auf den Stapel legen.
    gsap.set(all(), { clearProps: 'transform' });
    gsap.set(stamps(), { scale: 0 });
    if (!hero) return;
    const heroPhoto = photoOf(hero).getBoundingClientRect();
    if (isGrid()) {
      const deck = center(heroPhoto);
      cards.forEach((card, i) => {
        const at = center(photoOf(card).getBoundingClientRect());
        gsap.set(card.parentElement, { zIndex: cards.length - i });
        gsap.set(card, {
          x: deck.x - at.x + jitter(i, 8),
          y: deck.y - at.y + jitter(i + 3, 6),
          rotation: jitter(i + 7, 7),
        });
      });
      // Die Große liegt ganz unten, so klein wie eine aus dem Stapel.
      const small = cards[0] ? photoOf(cards[0]).getBoundingClientRect().width : heroPhoto.width / 2;
      const box = hero.getBoundingClientRect();
      gsap.set(hero, {
        transformOrigin: `${deck.x - box.left}px ${deck.y - box.top}px`,
        scale: small / heroPhoto.width,
        rotation: -4,
      });
    } else {
      const first = cards[0]?.getBoundingClientRect();
      cards.forEach((card, i) => {
        const box = card.getBoundingClientRect();
        gsap.set(card.parentElement, { zIndex: cards.length - i });
        gsap.set(card, {
          x: (first?.left ?? box.left) - box.left - 22 + jitter(i, 6),
          y: 14 + jitter(i + 3, 5),
          rotation: jitter(i + 7, 7),
          scale: 0.92,
        });
      });
      gsap.set(hero, { y: -18, scale: 1.05, rotation: -3 });
    }
  };

  const slam = (timeline: gsap.core.Timeline, card: HTMLElement, at: number) => {
    const stamp = stampOf(card);
    if (!stamp) return;
    timeline.fromTo(
      stamp,
      { scale: 2.8, rotation: -26 },
      { scale: 1, rotation: -7, duration: 0.2, ease: 'power4.in', immediateRender: false },
      at
    );
    timeline.to(card, { y: '+=4', duration: 0.05, ease: 'power1.out', yoyo: true, repeat: 1 }, at + 0.2);
  };

  const deal = () => {
    state = 'dealing';
    stack(); // frisch messen: Schrift und Bilder können das Layout verschoben haben
    const hero = heroCard();
    const cards = railCards();
    tl = gsap.timeline({
      onComplete: () => {
        state = 'done';
        board.removeAttribute('data-dealing');
        gsap.set(all(), { clearProps: 'transform,transformOrigin' });
        gsap.set(stamps(), { clearProps: 'transform' });
        gsap.set(slides(), { clearProps: 'zIndex' });
      },
    });
    const grid = isGrid();
    let t = 0.05;
    const heroIn = (at: number) => {
      if (!hero) return;
      tl!.to(hero, { x: 0, y: 0, scale: 1, rotation: 0, duration: 0.65, ease: 'back.out(1.3)' }, at);
      slam(tl!, hero, at + 0.5);
    };
    if (!grid) {
      heroIn(t);
      t += 0.55;
    }
    cards.forEach((card, i) => {
      const at = t + i * 0.12;
      tl!.to(card, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.62, ease: 'power3.out' }, at);
      slam(tl!, card, at + 0.48);
    });
    if (grid) heroIn(t + cards.length * 0.12 + 0.15);
  };

  stack();
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || state !== 'stacked') return;
      io.disconnect();
      deal();
    },
    // Erst wenn die Karten gut im Bild sind: der Stapel soll als Stapel zu
    // sehen sein, bevor er ausgeteilt wird.
    { rootMargin: '0px 0px -40% 0px' }
  );
  io.observe(spread);

  return {
    restack: () => {
      if (state === 'stacked') stack();
    },
    finish: () => {
      if (state === 'stacked') {
        io.disconnect();
        deal();
      }
      tl?.progress(1);
    },
    dispose: () => {
      io.disconnect();
      tl?.kill();
      board.removeAttribute('data-dealing');
      gsap.set(all(), { clearProps: 'transform,transformOrigin' });
      gsap.set(stamps(), { clearProps: 'transform' });
      gsap.set(slides(), { clearProps: 'zIndex' });
    },
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
