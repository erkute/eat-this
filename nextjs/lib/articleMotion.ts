/**
 * Nur die gestalteten Verweise bewegen sich: Must-Eat-Bänder, Magazine und
 * das Booster-Pack. Lesetext, Kapitel, Fotos und Map-Links bleiben wie in
 * den 032c-Referenzartikeln vom 13.10.2026 beim Scrollen ruhig.
 * IntersectionObserver löst jede Szene einmal aus, ohne Scroll-Schleife.
 * Reduced Motion und der bestehende CSS-Auftritt des Kopfs bleiben erhalten.
 */

import gsap from 'gsap';

/** Länger als der längste Takt des Kopf-Auftritts (CSS: 620 + 900 ms). */
const INTRO_MS = 1700;
const INTRO_MARK = 'data-article-intro';

interface Scene {
  trigger: Element;
  timeline: gsap.core.Timeline;
  targets: Element[];
  /** Räumt auf, was die Szene ausser Transform und Sichtbarkeit setzt. */
  release?: () => void;
}

const hide = { visibility: 'hidden' } as const;
const show = { visibility: 'visible' } as const;

/** Gelandet, gibt das Element seinen Transform an das Stylesheet zurück —
 *  sonst schlüge der Inline-Transform den Hover. Läuft die Szene rückwärts,
 *  setzt GSAP ihn wieder. */
function handBack(timeline: gsap.core.Timeline, el: HTMLElement): gsap.core.Timeline {
  return timeline.eventCallback('onComplete', () => gsap.set(el, { clearProps: 'transform' }));
}

function slide(el: HTMLElement): Scene {
  gsap.set(el, { ...hide, x: -90, rotation: -2 });
  const timeline = gsap
    .timeline({ paused: true })
    .set(el, show)
    .to(el, { x: 0, rotation: 0, duration: 0.65, ease: 'power3.out' });
  return { trigger: el, timeline: handBack(timeline, el), targets: [el] };
}

/** Einzelne Magazinempfehlung im Lesetext: nur das Cover wird eingeschoben.
 * Der unbewegte Link ist der Trigger; Titel und Trefferfläche bleiben stehen. */
function issue(card: HTMLElement): Scene | null {
  const cover = card.querySelector<HTMLElement>('[data-motion-part="cover"]');
  if (!cover) return null;
  gsap.set(cover, { x: -64, y: 16, rotation: -8 });
  const timeline = gsap
    .timeline({ paused: true })
    .to(cover, { x: 0, y: 0, rotation: 0, duration: 0.75, ease: 'power3.out' });
  return { trigger: card, timeline: handBack(timeline, cover), targets: [cover] };
}

/** Das Booster-Pack fliegt von rechts oben auf die Tafel und bleibt schräg
 *  liegen — die Schräge selbst steht im Stylesheet (`rotate`). */
function toss(board: HTMLElement): Scene | null {
  const pack = board.querySelector<HTMLElement>('[data-motion-part="pack"]');
  if (!pack) return null;
  gsap.set(pack, { ...hide, x: 160, y: -120, rotation: 50, scale: 1.2 });
  const timeline = gsap
    .timeline({ paused: true })
    .set(pack, show)
    .to(pack, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.75, ease: 'back.out(1.5)' });
  return { trigger: board, timeline: handBack(timeline, pack), targets: [pack] };
}

/** Die Hefte werden von rechts auf den Tisch ausgeteilt, eins nach dem
 *  anderen. Bewegt wird der Listenpunkt — das Heft selbst trägt seine
 *  Neigung und den Hover über `rotate`/`translate`. */
function deal(list: HTMLElement): Scene | null {
  const items = Array.from(list.children) as HTMLElement[];
  if (!items.length) return null;
  // Am Telefon ist die Liste ein Querscroller mit Einrasten, und Einrastpunkte
  // folgen verschobenen Elementen: der Streifen rastete auf das noch versetzte
  // erste Heft ein (205 px statt 0) und lief beim Austeilen mit — „erst nach
  // links, dann plötzlich nach rechts" (Ansage 03.10.2026); WebKit blieb mit
  // angeschnittenem Heft stehen. Solange ein Heft unterwegs ist, rastet nichts
  // ein, und der Streifen steht am Anfang.
  const settle = (dealt: boolean) => {
    list.style.scrollSnapType = dealt ? '' : 'none';
    if (!dealt) list.scrollLeft = 0;
  };
  settle(false);
  gsap.set(items, { ...hide, x: 240, y: -40, rotation: 14 });
  const timeline: gsap.core.Timeline = gsap
    .timeline({ paused: true, onUpdate: () => settle(timeline.progress() === 1) })
    .set(items, show)
    .to(items, { x: 0, y: 0, rotation: 0, duration: 0.7, ease: 'power3.out', stagger: 0.12 });
  return { trigger: list, timeline, targets: items, release: () => settle(true) };
}

function scenesOf(root: HTMLElement): Scene[] {
  const scenes: (Scene | null)[] = [];
  root.querySelectorAll<HTMLElement>('[data-motion="issue"]').forEach((el) => scenes.push(issue(el)));
  root
    .querySelectorAll<HTMLElement>('[data-motion="slide"]')
    .forEach((el) => scenes.push(slide(el)));
  root.querySelectorAll<HTMLElement>('[data-motion="deal"]').forEach((el) => scenes.push(deal(el)));
  root.querySelectorAll<HTMLElement>('[data-motion="toss"]').forEach((el) => scenes.push(toss(el)));
  return scenes.filter((scene): scene is Scene => scene !== null);
}

/** Lässt die Kopf-Marke fallen, wenn der Auftritt durch ist — sonst liefe er
 *  beim nächsten Artikel, der über ein Heft kommt, noch einmal mit. */
function endIntro(): () => void {
  const html = document.documentElement;
  if (!html.hasAttribute(INTRO_MARK)) return () => {};
  const timer = setTimeout(() => html.removeAttribute(INTRO_MARK), INTRO_MS);
  return () => {
    clearTimeout(timer);
    html.removeAttribute(INTRO_MARK);
  };
}

export function armArticleMotion(root: HTMLElement): () => void {
  const leaveIntro = endIntro();
  if (typeof IntersectionObserver === 'undefined') return leaveIntro;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return leaveIntro;

  // Ein Tab, der nicht zu sehen ist (im Hintergrund geöffnet, die Vorschau
  // der Desktop-App), lässt keine Animation laufen — was hier versteckt
  // würde, bliebe unsichtbar. Scharf wird erst, wenn der Tab sichtbar ist.
  let disarm: (() => void) | null = null;
  const armWhenVisible = () => {
    if (disarm || document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', armWhenVisible);
    disarm = armScenes(root);
  };
  document.addEventListener('visibilitychange', armWhenVisible);
  armWhenVisible();

  return () => {
    document.removeEventListener('visibilitychange', armWhenVisible);
    disarm?.();
    leaveIntro();
  };
}

function armScenes(root: HTMLElement): () => void {
  const scenes = scenesOf(root);
  const byTrigger = new Map(scenes.map((scene) => [scene.trigger, scene]));
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const scene = byTrigger.get(entry.target);
        if (!scene) continue;
        const { timeline } = scene;
        const below = entry.boundingClientRect.top > 0;
        if (!entry.isIntersecting && below) continue;
        io.unobserve(entry.target);
        byTrigger.delete(entry.target);
        if (entry.isIntersecting) timeline.play();
        else timeline.progress(1);
      }
    },
    // Erst, wenn ein Stück wirklich im Bild ist — nicht schon an der Kante.
    { rootMargin: '0px 0px -12% 0px' }
  );
  scenes.forEach((scene) => io.observe(scene.trigger));

  return () => {
    io.disconnect();
    for (const scene of scenes) {
      scene.timeline.kill();
      gsap.set(scene.targets, { clearProps: 'transform,visibility' });
      scene.release?.();
    }
  };
}
