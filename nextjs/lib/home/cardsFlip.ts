/* „Was ist um dich?": gibt man den Standort frei, sortiert sich die Leiste
   nach Nähe um. Statt umzuspringen, fliegen die Karten (Idee vom 01.10.2026):
   wer bleibt, gleitet an seinen neuen Platz; wer neu dazukommt, wird von
   unten eingeworfen, die nächste zuerst. Wer wegfällt, ist schon weg — React
   nimmt ihn aus dem DOM, bevor sich etwas bewegen könnte.
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

/** Die Karten der Leiste, an ihrer Flip-Kennung (`data-flip-id`). */
const cardsOf = (rail: HTMLElement) =>
  Array.from(rail.querySelectorAll<HTMLElement>('[data-flip-id]'));

export interface CardsFlip {
  /** Spielt den Weg von der gemerkten Lage zur jetzigen. */
  play: (rail: HTMLElement) => void;
}

/** Merkt sich, wo die Karten gerade stehen. Ohne Bewegung: `null`. */
export async function rememberCards(rail: HTMLElement): Promise<CardsFlip | null> {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
  const Flip = await loadFlip();
  const state = Flip.getState(cardsOf(rail));
  return {
    play(rail) {
      // Die nächste Karte steht vorne: die Leiste beginnt wieder am Anfang.
      rail.scrollTo({ left: 0, behavior: 'instant' });
      const cards = cardsOf(rail);
      let fresh: Element[] = [];
      Flip.from(state, {
        targets: cards,
        duration: 0.8,
        ease: 'power3.inOut',
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
