/**
 * Bewegung im Artikel (02.10.2026, Ansage „sieht noch zu brav aus, das muss
 * geiles Design haben, wo was passiert im Artikel — check mal GSAP"). Dieselben
 * Regeln wie auf der Startseite (HubMotion): nur ohne `prefers-reduced-motion`,
 * nie als Opacity-Fade, Dinge bewegen sich als Ganzes — kein Text, der sich
 * Buchstabe für Buchstabe aufbaut, keine Fotos, die aus Masken ausfahren.
 *
 * Ausgelöst per IntersectionObserver, nicht per ScrollTrigger: das Plugin hält
 * eine rAF-Schleife für die ganze Sitzung am Laufen (siehe HubMotion). Nichts
 * hängt an der Scrollposition, also zittert auf dem iPhone nichts.
 *
 * Jede Szene läuft, wenn sie von unten ins Bild kommt, und rückwärts, wenn sie
 * es nach unten wieder verlässt — wer zurückscrollt und wieder runter, sieht
 * sie neu (wie Remys Tafel, Ansage 28.09.2026). Was schon über dem Bild liegt,
 * steht einfach da.
 *
 * - Stempel: Kapitel, Zitate und „Fazit" schlagen ein wie die Headline der
 *   Startseite — gross und gedreht, dann mit Stauchung auf ihren Platz.
 * - Abzug: Spot-Fotos und Bilder im Text landen wie hingeworfene Abzüge,
 *   „Zur Map" ploppt danach auf.
 * - Must-Eat-Bänder schieben von links herein, die Hefte unter „Weiter auf
 *   dem Teller" werden ausgeteilt, und das Booster-Pack der Katalog-Tafel
 *   wird auf die Tafel geworfen.
 *
 * Der Kopf ist CSS (NewsArticleShell.module.css, `data-article-intro`): er
 * muss mit dem ersten Paint laufen, nicht erst nach der Hydrierung. Die Marke
 * setzt der Bootstrap in app/[locale]/layout.tsx nur beim Laden — wer über ein
 * aufklappendes Heft kommt, hat das Aufklappen als Auftritt.
 */

import gsap from 'gsap';

/** Länger als der längste Takt des Kopf-Auftritts (CSS: 620 + 900 ms). */
const INTRO_MS = 1700;
const INTRO_MARK = 'data-article-intro';

interface Scene {
  trigger: Element;
  timeline: gsap.core.Timeline;
  targets: Element[];
}

const hide = { visibility: 'hidden' } as const;
const show = { visibility: 'visible' } as const;

function stamp(el: HTMLElement): Scene {
  gsap.set(el, { ...hide, scale: 1.9, rotation: -4 });
  const timeline = gsap
    .timeline({ paused: true })
    .set(el, show)
    .to(el, { scale: 0.97, rotation: 0.6, duration: 0.5, ease: 'expo.out' })
    .to(el, { scale: 1, rotation: 0, duration: 0.3, ease: 'power2.out' });
  return { trigger: el, timeline, targets: [el] };
}

/** Ein Spot: erst landet das Foto, dann ploppt der Knopf. */
function spot(card: HTMLElement): Scene | null {
  const photo = card.querySelector<HTMLElement>('[data-motion="print"]');
  const pop = card.querySelector<HTMLElement>('[data-motion="pop"]');
  if (!photo) return null;
  const scene = print(photo, card);
  if (pop) {
    gsap.set(pop, { ...hide, scale: 0.4 });
    scene.timeline
      .set(pop, show, '-=0.25')
      .to(pop, { scale: 1, duration: 0.45, ease: 'back.out(2.4)' }, '<');
    scene.targets.push(pop);
  }
  return scene;
}

/** Ein Foto fällt auf die Seite: etwas zu gross und schräg, dann flach. */
function print(el: HTMLElement, trigger: Element = el): Scene {
  gsap.set(el, { ...hide, y: 70, scale: 1.06, rotation: -3.5 });
  const timeline = gsap
    .timeline({ paused: true })
    .set(el, show)
    .to(el, { y: 0, scale: 1, rotation: 0, duration: 0.75, ease: 'back.out(1.3)' });
  return { trigger, timeline, targets: [el] };
}

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
  gsap.set(items, { ...hide, x: 240, y: -40, rotation: 14 });
  const timeline = gsap
    .timeline({ paused: true })
    .set(items, show)
    .to(items, { x: 0, y: 0, rotation: 0, duration: 0.7, ease: 'power3.out', stagger: 0.12 });
  return { trigger: list, timeline, targets: items };
}

function scenesOf(root: HTMLElement): Scene[] {
  const scenes: (Scene | null)[] = [];
  const content = root.querySelector<HTMLElement>('[data-article-content]');
  content
    ?.querySelectorAll<HTMLElement>(
      ':scope > h2, :scope > h3, :scope > blockquote, [data-block="conclusion-label"]'
    )
    .forEach((el) => scenes.push(stamp(el)));
  root.querySelectorAll<HTMLElement>('[data-motion="spot"]').forEach((el) => scenes.push(spot(el)));
  root.querySelectorAll<HTMLElement>('[data-motion="print"]').forEach((el) => {
    // Das Foto einer Spot-Karte gehört zur Szene der Karte.
    if (!el.closest('[data-motion="spot"]')) scenes.push(print(el));
  });
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
        if (entry.isIntersecting) timeline.play();
        else if (below) timeline.reverse();
        else if (timeline.progress() === 0) timeline.progress(1);
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
    }
  };
}
