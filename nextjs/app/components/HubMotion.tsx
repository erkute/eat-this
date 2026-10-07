'use client';

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { appScroller } from '@/lib/dom/appScroller';
import { scrollProgress } from '@/lib/dom/scrollProgress';
import { armMagazineTable } from '@/lib/home/magazineTable';
import { enterLead } from '@/lib/home/leadEntrance';

/* Bewusst ohne ScrollTrigger: das Plugin hält ab dem Registrieren eine
   leere requestAnimationFrame-Schleife am Laufen, für die ganze Sitzung und
   auf jeder Seite. Damit rechnet der Hauptthread jedes Frame mit, und selbst
   reine Compositor-Animationen (Laufband, schwebende Telefone) kosteten
   Stil-Neuberechnungen — gemessen 60/s im Leerlauf, am gedrosselten Telefon
   rund ein Viertel der Hauptthread-Zeit (Review 29.09.2026). Ausgelöst wird
   hier per IntersectionObserver, was am Scrollweg hängt, über einen passiven
   Scroll-Listener. */
gsap.registerPlugin(useGSAP);

/**
 * Bewegung auf der Startseite. Alles nur ohne `prefers-reduced-motion` und nie
 * als Opacity-Fade (Hausregel für Brand-Flächen). Der Slogan stempelt ein
 * (das Hinschreiben vom 04.10.2026 ist seit 07.10.2026 wieder raus); Geräte
 * und Knöpfe bewegen sich als ganze Objekte.
 *
 * 1. **Auftritt beim Laden** (Aufmacher). Der Vorhang ist CSS: er muss ab
 *    dem ersten Paint laufen, nicht erst nach der Hydrierung (Begründung in
 *    HeroCurtain.module.css). Was er freilegt — die grosse Marke, die auf
 *    ihren Platz geschubst wird, die Stempel der Headline —, steuert
 *    `finishIntro`.
 *
 * 2. **Am Scrollweg:** Die räumlichen Bühnen (Magazin, Must Eats)
 *    steuern sich selbst. Nearby bleibt als ruhige Fotowand stehen.
 *    `armScrubFallback` ergänzt CSS-Scroll-Timelines, wo sie fehlen.
 *
 * 3. **Beim Hereinkommen:**
 *    - Remys Auftritt und Reaktionen gehören HubFragRemy.
 *    - Knöpfe werden gedrückt, jedes Mal, wenn ihre Section ins Bild kommt
 *      (`data-in-view`, CSS in HubSection.module.css; `armInView`).
 *    - Starter Pack: in das Adressfeld tippt sich eine Adresse, „Anmelden"
 *      wird gedrückt, das Feld leert sich — in Schleife, solange die Tafel im
 *      Bild ist (`armSignupDemo`).
 *    - FAQ: Antworten öffnen und schließen weich auf Klick (`armFaq`).
 *
 * 4. **Immer:** Remy redet, solange gescrollt wird — der große im Frag-Remy-
 *    Abschnitt und der schwebende unten rechts (`armScrollTalk`).
 *
 * 5. **Nur ab 768px:** die Telefone driften beim Herausscrollen auseinander,
 *    und der Magazin-Stapel blättert getimt wie ein Kartenstapel
 *    (`armMagazineTable`); mit echtem Zeiger kippen die Telefone zur Maus und
 *    der Knopf zieht magnetisch.
 */

/** Die Headline-Zeilen schlagen als Stempel ein: riesig und gedreht, dann
 *  mit Stauchung auf ihren Platz (Ansage 30.09.2026, nach dem Hinschreiben
 *  wieder zurück am 07.10.2026). Jede Zeile folgt der vorigen nach `gap` ms. */
function stampHeadline(hero: HTMLElement | null, gap: number): Animation[] {
  const animations: Animation[] = [];
  hero?.querySelectorAll<HTMLElement>('h1').forEach((headline) => {
    const lines = Array.from(headline.querySelectorAll<HTMLElement>('span')).filter(
      (line) => !line.children.length && line.getBoundingClientRect().height > 0
    );
    lines.forEach((line, index) => {
      animations.push(
        line.animate(
          [
            { transform: 'scale(2.8) translateZ(0) rotate(-5deg)', visibility: 'hidden', offset: 0 },
            { transform: 'scale(2.8) translateZ(0) rotate(-5deg)', visibility: 'visible', offset: 0.01 },
            { transform: 'scale(.97) translateZ(0) rotate(.6deg)', visibility: 'visible', offset: 0.75 },
            { transform: 'scale(1) translateZ(0) rotate(0deg)', visibility: 'visible' },
          ],
          {
            duration: 900,
            delay: index * gap,
            fill: 'backwards',
            easing: 'cubic-bezier(.16,1,.3,1)',
          }
        )
      );
    });
  });
  return animations;
}

/** Die Takte des Auftritts als Attribute an <html> (HubSection.module.css). */
const INTRO_STEPS = ['data-intro-mark', 'data-intro-head', 'data-intro-copy'] as const;

/**
 * Der Auftritt beim Laden: Remy schiebt den Vorhang weg (CSS,
 * HeroCurtain.module.css, ab dem ersten Paint) und legt dabei eine grosse
 * Wortmarke in der Mitte frei. Hat der Vorhang sie ganz freigegeben, duckt
 * sie sich, wird auf den Platz der echten Marke geschubst und tauscht dort
 * mit ihr. Die Headline stempelt erst ein, wenn Remy rechts ganz aus dem
 * Bild ist („We tell … muss kommen, wenn Remy aus dem Bild ist"), danach
 * kommen Lead, Knöpfe und Telefone (Idee des Betreibers 01.10.2026: „erstmal
 * gross und dann an seinem Platz gedrängt, nach oben, und dann kommt We tell
 * you what to eat"). Erst wenn Vorhang und Auftritt durch sind, fällt
 * `data-hero-intro` — vorher misst HeroMarkFlight die Marke nicht.
 */
function finishIntro(): (() => void) | void {
  const html = document.documentElement;
  if (!html.hasAttribute('data-hero-intro')) return;
  const hero = document.querySelector<HTMLElement>('[data-hub-hero]');
  const curtain = hero?.querySelector<HTMLElement>('[data-hero-curtain]');
  const edge = curtain?.querySelector<HTMLElement>('[data-hero-curtain-edge]');
  const card = hero?.querySelector<HTMLElement>('[data-hero-intro-mark]');
  const remy = curtain?.querySelector<HTMLElement>('[data-hero-remy]');
  const running = curtain?.getAnimations() ?? [];
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let cancelled = false;
  let frame = 0;
  let hold = 0;
  let later = 0;
  let timeline: gsap.core.Timeline | null = null;
  const motions: Animation[] = [];
  let copyTimeline: gsap.core.Timeline | null = null;

  const end = () => {
    html.removeAttribute('data-hero-intro');
    INTRO_STEPS.forEach((step) => html.removeAttribute(step));
    if (card) gsap.set(card, { clearProps: 'all' });
  };

  /** Lead, Knöpfe und Telefone, nachdem die Headline steht. Ohne Opacity:
   *  der Lead tippt sich hin (lib/home/leadEntrance.ts), der Knopf
   *  schlägt ein, die Telefone steigen von unter der Kante des Aufmachers
   *  herauf, und MAP und MENÜ fliegen von links und rechts in den Header. */
  const copyIn = () => {
    const lead = hero?.querySelectorAll<HTMLElement>('[data-hero-lead]');
    const actions = hero?.querySelector<HTMLElement>('[data-hero-actions]');
    const phones = hero?.querySelector<HTMLElement>('[data-hub-phones]');
    // Über `translate`/`rotate`, nicht `transform`: der gehört dem Zittern
    // der Wörter beim Drüberfahren (SiteNav.module.css).
    (
      [
        ['navMapBtn', -1],
        ['burgerBtn', 1],
      ] as const
    ).forEach(([id, side], i) => {
      const control = document.getElementById(id);
      if (!control) return;
      motions.push(
        control.animate(
          [
            { translate: `${side * 180}px 0`, rotate: `${side * 14}deg` },
            { translate: '0 0', rotate: '0deg' },
          ],
          {
            duration: 750,
            delay: 120 + i * 90,
            fill: 'backwards',
            easing: 'cubic-bezier(.34,1.45,.5,1)',
          }
        )
      );
    });
    // Die Telefone stehen als Ganzes unter dem Fensterrand, bevor CSS sie
    // sichtbar macht — keine Maske, kein Sprung am Ziel.
    const entryY = (element: HTMLElement) => Math.max(80, window.innerHeight - element.getBoundingClientRect().top + 32);
    const leads = Array.from(lead ?? []).filter((element) => element.getClientRects().length > 0);
    if (phones) gsap.set(phones, { y: entryY(phones) });
    if (actions) gsap.set(actions, { scale: 0, transformOrigin: '50% 50%' });
    const entrance = enterLead(leads);
    motions.push(...entrance.animations);
    const leadEnd = entrance.duration;
    html.setAttribute('data-intro-copy', '');
    copyTimeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
    // Der Knopf drückt sich, wenn der Lead fast steht.
    const press = Math.max(0.55, leadEnd / 1000 - 0.25);
    if (actions) copyTimeline
      .set(actions, { scale: 1.28, rotation: -7, y: -18 }, press)
      .to(actions, { scale: 0.96, rotation: 1, y: 2, duration: 0.18, ease: 'power3.in' }, press)
      .to(actions, { scale: 1, rotation: 0, y: 0, duration: 0.22, ease: 'back.out(1.8)', clearProps: 'transform,transformOrigin' });
    if (phones) copyTimeline.to(phones, { y: 0, duration: 1.3, clearProps: 'transform' }, 0.12);
  };

  /** Ist Remy rechts ganz aus dem Bild? Ohne Vorhang gilt er als weg. */
  const remyGone = () =>
    !remy ||
    running.every((a) => a.playState === 'finished') ||
    remy.getBoundingClientRect().left >= window.innerWidth;

  /** Die Headline, sobald Remy draussen ist; Lead und Rest, wenn ihre zweite
   *  Zeile eingeschlagen hat (430ms + 0,75 · 900ms) und kurz steht. */
  const headIn = () => {
    if (cancelled) return;
    if (!remyGone()) {
      frame = requestAnimationFrame(headIn);
      return;
    }
    html.setAttribute('data-intro-head', '');
    motions.push(...stampHeadline(hero, 430));
    later = window.setTimeout(() => !cancelled && copyIn(), 1300);
  };

  /** Ohne grosse Marke (oder ohne Bewegung): alles steht sofort. */
  const showAll = () => {
    INTRO_STEPS.forEach((step) => html.setAttribute(step, ''));
  };

  const push = () => {
    const mark = hero?.querySelector<HTMLElement>('[data-hero-mark]');
    if (!card || !mark || calm) {
      showAll();
      return;
    }
    // FLIP: von der Mitte auf den Platz der echten Marke, gemessen in dem
    // Moment, in dem es losgeht (Schrift und Knöpfe stehen dann schon).
    const from = card.getBoundingClientRect();
    const to = mark.getBoundingClientRect();
    if (!from.width || !to.width) {
      showAll();
      return;
    }
    const s = to.width / from.width;
    const x = to.left + to.width / 2 - (from.left + from.width / 2);
    const y = to.top + to.height / 2 - (from.top + from.height / 2);
    timeline = gsap
      .timeline()
      // Ducken: sie sackt ein Stück ein und wird breit — Anlauf für den Schub.
      .to(card, {
        y: 14,
        scaleX: 1.06,
        scaleY: 0.9,
        rotation: -2,
        duration: 0.22,
        ease: 'power2.in',
      })
      // Der Schub: schnell los, knapp über das Ziel hinaus, zurückfedern.
      .to(card, {
        x,
        y,
        scaleX: s,
        scaleY: s,
        rotation: 0,
        duration: 0.95,
        ease: 'back.out(1.25)',
      })
      // Gelandet: die echte Marke übernimmt, dann wartet die Headline auf
      // Remys Abgang.
      .call(() => html.setAttribute('data-intro-mark', ''))
      .call(headIn);
  };

  // Los geht es, sobald der Vorhang die Marke ganz freigegeben hat — dann
  // ist Remy noch auf dem Weg nach rechts hinaus, und der Schub schliesst an
  // sein Schieben an. Kurz stehen lassen, damit man sie liest.
  const watch = () => {
    if (cancelled) return;
    const freed =
      !edge ||
      !card ||
      edge.getBoundingClientRect().left >= card.getBoundingClientRect().right + 24;
    if (freed) {
      hold = window.setTimeout(() => !cancelled && push(), 280);
      return;
    }
    frame = requestAnimationFrame(watch);
  };
  if (running.length) watch();
  else push();

  // `data-hero-intro` erst nehmen, wenn Vorhang UND Auftritt durch sind:
  // der Vorhang hängt daran (display: none), die Takte auch.
  const curtainDone = Promise.all(running.map((a) => a.finished));
  const introDone = new Promise<void>((resolve) => {
    const check = () => {
      if (cancelled) return;
      const ready = html.hasAttribute('data-intro-copy') && (!timeline || !timeline.isActive()) && (!copyTimeline || !copyTimeline.isActive());
      if (ready) {
        Promise.all(motions.map((m) => m.finished)).then(
          () => resolve(),
          () => resolve()
        );
        return;
      }
      window.setTimeout(check, 120);
    };
    check();
  });
  Promise.all([curtainDone, introDone])
    .then(() => !cancelled && end())
    // Abgebrochen (Attribut schon weg, Seite verlassen) — nichts mehr zu tun.
    .catch(() => {});

  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
    window.clearTimeout(hold);
    window.clearTimeout(later);
    timeline?.kill();
    copyTimeline?.revert();
    motions.forEach((m) => m.cancel());
    // Wer die Startseite mitten im Auftritt verlässt, nimmt nichts davon mit
    // (versteckte MAP/MENÜ, Logo im Header). Nicht sofort: React baut im
    // Entwicklungsmodus jeden Effekt einmal ab und gleich wieder auf — dann
    // steht der Aufmacher noch.
    window.setTimeout(() => {
      if (!document.querySelector('[data-hub-hero]')) end();
    }, 0);
  };
}

/** GSAP setzt beim Animieren von `transform` die CSS-Eigenschaften
 *  `translate/rotate/scale` inline auf `none` — am Ende alles wieder frei
 *  geben, sonst bleiben Druckzustände (`--et-press-tile`) tot. */
const CLEAR_TRANSFORMS = 'transform,translate,rotate,scale';

/** Oberkante und Höhe des sichtbaren Scrollbereichs: `.app-pages` ab 768px,
 *  darunter das Fenster. */
function viewportOf(scroller: HTMLElement | Window): { top: number; height: number } {
  return scroller instanceof HTMLElement
    ? scroller.getBoundingClientRect()
    : { top: 0, height: window.innerHeight };
}

/** Ruft `update` höchstens einmal pro Frame, solange gescrollt wird, und einmal
 *  gleich zu Beginn. */
function onScrollFrame(scroller: HTMLElement | Window, update: () => void): () => void {
  let frame = 0;
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(() => ((frame = 0), update()));
  };
  update();
  scroller.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  return () => {
    cancelAnimationFrame(frame);
    scroller.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
  };
}

/**
 * `data-in-view` an jeder Section mit einem Knopf, der gedrückt werden soll
 * (`data-press`), und am Aufmacher: `1` im Bild, `0` draussen. Das CSS dazu
 * (HubSection.module.css) startet den Druck neu, sobald es auf `1` springt:
 * wer zurückscrollt, sieht den Knopf wieder gedrückt. Beobachtet wird die
 * Section, nicht der Knopf: HubHeroCopy baut die Knöpfe neu, sobald `useAuth`
 * steht.
 * Der Aufmacher bekommt die `1` erst, nachdem er einmal draussen war: beim
 * Laden ist er schon im Bild, und die `1` gleich beim Mount verkürzte nur die
 * Verzögerung des laufenden Drucks — ab Seitenstart gerechnet, der Knopf
 * drückte dann mitten in seinem Einflug.
 */
function armInView(): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const sections = new Set<HTMLElement>();
  const hero = document.querySelector<HTMLElement>('[data-hub-hero]');
  if (hero) sections.add(hero);
  document.querySelectorAll<HTMLElement>('[data-hub] [data-press]').forEach((el) => {
    const section = el.closest<HTMLElement>('section');
    if (section) sections.add(section);
  });
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (!entry.isIntersecting) el.setAttribute('data-in-view', '0');
        else if (el !== hero || el.hasAttribute('data-in-view')) {
          el.setAttribute('data-in-view', '1');
        }
      }
    },
    { rootMargin: '0px 0px -20% 0px' }
  );
  sections.forEach((el) => io.observe(el));
  return () => {
    io.disconnect();
    sections.forEach((el) => el.removeAttribute('data-in-view'));
  };
}

/** Animiert die Antworthöhe auf Klick; ohne Bewegung bleiben native Details. */
function armFaq(): () => void {
  const faq = document.querySelector<HTMLElement>('[data-hub-faq]');
  const first = faq?.querySelector<HTMLDetailsElement>('details');
  if (!faq || !first) return () => {};
  const CLEAR = 'height,paddingTop,paddingBottom,boxSizing,transform,transformOrigin';
  type Flap = { tween: gsap.core.Animation; open: boolean; state: { p: number } };
  const flaps = new Map<HTMLDetailsElement, Flap>();
  const isOpen = (d: HTMLDetailsElement) => flaps.get(d)?.open ?? d.open;

  const flap = (d: HTMLDetailsElement, open: boolean) => {
    const answer = d.querySelector<HTMLElement>('p');
    if (!answer || isOpen(d) === open) return;
    const running = flaps.get(d);
    running?.tween.kill();
    // Mitten im Schwenk umgedreht: von der aktuellen Stellung aus weiter.
    const state = { p: running ? running.state.p : open ? 0 : 1 };
    d.open = true;
    // Die fertige Höhe messen, bevor gezeichnet wird — im selben Takt, es
    // blitzt also nichts auf.
    gsap.set(answer, { clearProps: CLEAR });
    const cs = getComputedStyle(answer);
    const pad = [parseFloat(cs.paddingTop), parseFloat(cs.paddingBottom)];
    const full = answer.getBoundingClientRect().height;
    const draw = () => {
      const k = state.p;
      Object.assign(answer.style, {
        boxSizing: 'border-box',
        height: `${full * k}px`,
        paddingTop: `${pad[0] * k}px`,
        paddingBottom: `${pad[1] * k}px`,
      });
    };
    const done = () => {
      flaps.delete(d);
      if (!open) d.open = false;
      gsap.set(answer, { clearProps: CLEAR });
    };
    const tween = gsap.to(state, {
      p: open ? 1 : 0,
      duration: 0.35,
      ease: 'power2.inOut',
      onUpdate: draw,
      onComplete: done,
    });
    flaps.set(d, { tween, open, state });
    draw();
  };

  const onClick = (e: MouseEvent) => {
    const summary = e.target instanceof Element ? e.target.closest('summary') : null;
    const d = summary?.parentElement;
    if (!(d instanceof HTMLDetailsElement) || !faq.contains(d)) return;
    e.preventDefault();
    flap(d, !isOpen(d));
  };
  faq.addEventListener('click', onClick);

  return () => {
    faq.removeEventListener('click', onClick);
    flaps.forEach(({ tween, open }, d) => {
      tween.kill();
      d.open = open;
      const answer = d.querySelector('p');
      if (answer) gsap.set(answer, { clearProps: CLEAR });
    });
    flaps.clear();
  };
}

/**
 * Starter Pack: sobald die Tafel ins Bild kommt, tippt sich eine Adresse ins
 * Feld, „Anmelden" wird gedrückt, das Feld leert sich wieder (Ansage
 * 28.09.2026). Getippt wird in den Platzhalter, nie in den Wert — es wird
 * nichts abgeschickt, nichts validiert, und wer selbst ins Feld tippt, bricht
 * die Vorführung sofort ab. Sie läuft in Schleife, solange die Tafel im Bild
 * ist: tippen, drücken, leeren, kurz Pause, von vorn (Ansage 29.09.2026).
 * Nach eigenem Tippen erst wieder, wenn die Tafel neu ins Bild kommt.
 * Feld und Knopf werden bei jedem Lauf neu gesucht, Fokus und Eingabe an der
 * Section abgefangen: nach einem Absenden baut LoginBoard das Formular über
 * die „Mail gesendet"-Ansicht neu, gemerkte Knoten wären dann tot.
 */
const DEMO_ADDRESS = 'hunger@eatthisdot.com';

function armSignupDemo(): () => void {
  const section = document.querySelector<HTMLElement>('[data-hub-starter]');
  if (!section || typeof IntersectionObserver === 'undefined') return () => {};
  const isField = (el: EventTarget | null): el is HTMLInputElement =>
    el instanceof HTMLInputElement && el.type === 'email';
  // Die Knoten des laufenden Durchgangs, damit `reset` genau sie zurücksetzt.
  let shown: { input: HTMLInputElement; submit: HTMLButtonElement; original: string } | null = null;
  let timers: number[] = [];
  let active = false;
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
  const reset = () => {
    timers.forEach(clearTimeout);
    timers = [];
    if (!shown) return;
    shown.input.placeholder = shown.original;
    shown.input.removeAttribute('data-demo-typing');
    shown.submit.removeAttribute('data-pressing');
    shown = null;
  };
  const stop = () => {
    active = false;
    reset();
  };
  const run = () => {
    if (!active) return;
    const input = section.querySelector<HTMLInputElement>('input[type="email"]');
    const submit = section.querySelector<HTMLButtonElement>('button[type="submit"]');
    // Kein Formular (gerade „Mail gesendet"), oder jemand ist im Feld.
    if (!input || !submit || input.value || document.activeElement === input) {
      stop();
      return;
    }
    reset();
    shown = { input, submit, original: input.placeholder };
    input.setAttribute('data-demo-typing', '');
    input.placeholder = '';
    let t = 400;
    for (let i = 1; i <= DEMO_ADDRESS.length; i++) {
      // Ungleichmässig wie echtes Tippen: tick, tick — tick.
      t += 55 + ((i * 37) % 70);
      later(() => (input.placeholder = DEMO_ADDRESS.slice(0, i)), t);
    }
    later(() => submit.setAttribute('data-pressing', ''), t + 450);
    later(() => submit.removeAttribute('data-pressing'), t + 1250);
    later(() => {
      input.placeholder = '';
    }, t + 1000);
    // Leeren, kurz Pause mit dem echten Platzhalter, dann von vorn.
    later(() => {
      reset();
      later(run, 1800);
    }, t + 1700);
  };
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) stop();
        else if (!active) {
          active = true;
          run();
        }
      }),
    { rootMargin: '0px 0px -30% 0px' }
  );
  io.observe(section);
  const interrupt = (e: Event) => {
    if (isField(e.target)) stop();
  };
  section.addEventListener('focusin', interrupt);
  section.addEventListener('input', interrupt);
  return () => {
    io.disconnect();
    section.removeEventListener('focusin', interrupt);
    section.removeEventListener('input', interrupt);
    stop();
  };
}

/**
 * Remy redet, solange gescrollt wird: `data-remy-talk` am <html>, bis eine
 * Viertelsekunde Ruhe ist. Den Mund bewegen die Stylesheets (RemyLauncher,
 * HubFragRemy) — hier nur das Signal, darum auch auf dem Telefon: es hängt
 * nicht an der Scrollposition und kann nicht nachzittern.
 */
function armScrollTalk(scroller: HTMLElement | Window): () => void {
  const html = document.documentElement;
  let quiet = 0;
  const onScroll = () => {
    if (!quiet) html.setAttribute('data-remy-talk', '');
    window.clearTimeout(quiet);
    quiet = window.setTimeout(() => {
      quiet = 0;
      html.removeAttribute('data-remy-talk');
    }, 260);
  };
  scroller.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    scroller.removeEventListener('scroll', onScroll);
    window.clearTimeout(quiet);
    html.removeAttribute('data-remy-talk');
  };
}

/**
 * Für Browser ohne Scroll-Timeline (`animation-timeline: view()`): dieselben
 * Werte, die sonst CSS am Scrollweg treibt, per Scroll-Listener. Jedes Element
 * sagt selbst, welche Variable von wo nach wo läuft (`data-scrub="--deal 0 1"`)
 * und über welche Strecke (`data-scrub-start/-end`, lib/dom/scrollProgress).
 * Ein Drittel Sekunde Nachlauf, damit es sich nicht wie eingerastet anfühlt.
 */
function armScrubFallback(scroller: HTMLElement | Window): () => void {
  if (typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()')) return () => {};
  const scrubs = Array.from(
    document.querySelectorAll<HTMLElement>('[data-hub] [data-scrub]'),
    (el) => {
      const [prop, from, to] = (el.dataset.scrub ?? '').split(' ');
      if (!prop?.startsWith('--')) return null;
      const a = Number(from);
      const b = Number(to);
      const set = gsap.quickTo(el, prop, { duration: 0.3, ease: 'power1.out' });
      const start = el.dataset.scrubStart ?? 'top bottom';
      const end = el.dataset.scrubEnd ?? 'bottom top';
      gsap.set(el, {
        [prop]:
          a +
          (b - a) * scrollProgress(el.getBoundingClientRect(), viewportOf(scroller), start, end),
      });
      return {
        el,
        prop,
        update: () =>
          set(
            a +
              (b - a) * scrollProgress(el.getBoundingClientRect(), viewportOf(scroller), start, end)
          ),
      };
    }
  ).filter((s) => s !== null);
  if (!scrubs.length) return () => {};
  const stop = onScrollFrame(scroller, () => scrubs.forEach((s) => s.update()));
  return () => {
    stop();
    scrubs.forEach(({ el, prop }) => {
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: prop });
    });
  };
}

/** Die Telefone driften auseinander, während der Aufmacher oben hinausläuft
 *  (`--phones-drift`, HubSection.module.css) — mit einem halben Takt Nachlauf:
 *  liest sich als Trägheit, nicht als Ruckeln. */
function armPhonesDrift(scroller: HTMLElement | Window): () => void {
  const hero = document.querySelector<HTMLElement>('[data-hub-hero]');
  if (!hero) return () => {};
  const drift = gsap.quickTo(hero, '--phones-drift', { duration: 0.5, ease: 'power1.out' });
  const progress = () =>
    scrollProgress(hero.getBoundingClientRect(), viewportOf(scroller), 'top top', 'bottom top');
  gsap.set(hero, { '--phones-drift': progress() });
  const stop = onScrollFrame(scroller, () => drift(progress()));
  return () => {
    stop();
    gsap.killTweensOf(hero);
    gsap.set(hero, { clearProps: '--phones-drift' });
  };
}

/**
 * Maus über dem Aufmacher (nur Desktop mit echtem Zeiger): die Telefone
 * kippen in 3D zur Maus und trennen sich in der Tiefe (`--px/--py`, die Bahn
 * steht in HubSection.module.css), der Knopf zieht magnetisch zum Zeiger.
 * Die Knöpfe werden bei jeder Bewegung neu gesucht: HubHeroCopy tauscht sie
 * aus, sobald `useAuth` steht.
 */
function armHeroPointer(): () => void {
  const hero = document.querySelector<HTMLElement>('[data-hub-hero]');
  const phones = hero?.querySelector<HTMLElement>('[data-hub-phones]');
  if (!hero || !phones) return () => {};

  gsap.set(phones, { transformPerspective: 1100 });
  const follow = { duration: 0.9, ease: 'power3' };
  const px = gsap.quickTo(hero, '--px', follow);
  const py = gsap.quickTo(hero, '--py', follow);
  const tiltX = gsap.quickTo(phones, 'rotationX', follow);
  const tiltY = gsap.quickTo(phones, 'rotationY', follow);

  type Pull = { x: (v: number) => void; y: (v: number) => void };
  const pulls = new WeakMap<HTMLElement, Pull>();
  const pull = (el: HTMLElement): Pull => {
    let p = pulls.get(el);
    if (!p) {
      const snap = { duration: 0.5, ease: 'power3' };
      p = { x: gsap.quickTo(el, '--mx', snap), y: gsap.quickTo(el, '--my', snap) };
      pulls.set(el, p);
    }
    return p;
  };
  const magnets = () => hero.querySelectorAll<HTMLElement>('[data-magnetic]');

  const onMove = (e: PointerEvent) => {
    const r = hero.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    px(nx);
    py(ny);
    tiltY(nx * 12);
    tiltX(ny * -8);
    magnets().forEach((el) => {
      const b = el.getBoundingClientRect();
      const dx = e.clientX - (b.left + b.width / 2);
      const dy = e.clientY - (b.top + b.height / 2);
      // Fängt knapp vor dem Knopf an zu ziehen, nicht erst darauf — und nie
      // weiter als ein paar Pixel: ein Knopf, der wegläuft, ist keiner.
      const near = Math.hypot(dx, dy) < Math.max(b.width, b.height) * 0.8;
      pull(el).x(near ? gsap.utils.clamp(-16, 16, dx * 0.25) : 0);
      pull(el).y(near ? gsap.utils.clamp(-10, 10, dy * 0.3) : 0);
    });
  };
  const onLeave = () => {
    px(0);
    py(0);
    tiltX(0);
    tiltY(0);
    magnets().forEach((el) => {
      pull(el).x(0);
      pull(el).y(0);
    });
  };

  hero.addEventListener('pointermove', onMove);
  hero.addEventListener('pointerleave', onLeave);
  return () => {
    hero.removeEventListener('pointermove', onMove);
    hero.removeEventListener('pointerleave', onLeave);
    gsap.set(phones, { clearProps: CLEAR_TRANSFORMS });
    gsap.set(hero, { clearProps: '--px,--py' });
    magnets().forEach((el) => gsap.set(el, { clearProps: '--mx,--my' }));
  };
}

/** A small camera response, only on devices with a real hovering pointer. */
function armDepthPointer(): () => void {
  const cleanups = Array.from(
    document.querySelectorAll<HTMLElement>('[data-home-pointer]'),
    (el) => {
      const options = { duration: 0.65, ease: 'power3.out' };
      const x = gsap.quickTo(el, '--look-x', options);
      const y = gsap.quickTo(el, '--look-y', options);
      const move = (e: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        x(gsap.utils.clamp(-1, 1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
        y(gsap.utils.clamp(-1, 1, ((e.clientY - rect.top) / rect.height) * 2 - 1));
      };
      const leave = () => {
        x(0);
        y(0);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      return () => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerleave', leave);
        x.tween.kill();
        y.tween.kill();
        el.style.removeProperty('--look-x');
        el.style.removeProperty('--look-y');
      };
    }
  );
  return () => cleanups.forEach((stop) => stop());
}

/** Fotos vorladen, bevor die Sektionen ins Bild kommen. Der Desktop scrollt
 * in `.app-pages`; dessen Rand ist für das Vorladen maßgeblich. */
function armPreload(): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        entry.target
          .querySelectorAll<HTMLImageElement>('img[loading="lazy"]')
          .forEach((img) => {
            // Ausgeblendete Bilder bleiben lazy.
            if (img.getClientRects().length > 0) img.loading = 'eager';
          });
      }
    },
    { root: appScroller(), rootMargin: '150% 0px' }
  );
  document
    .querySelectorAll('[data-hub-map-preview], [data-hub-magazine], [data-hub-musteats]')
    .forEach((section) => io.observe(section));
  return () => io.disconnect();
}

/** Der Magazin-Stapel auf dem Tisch: blättern, ziehen, aufblättern
 *  (lib/home/magazineTable.ts). */
function armMagazine(): () => void {
  const stage = document.querySelector<HTMLElement>('[data-magazine-stage]');
  const deck = stage?.querySelector<HTMLElement>('[data-magazine-deck]');
  return stage && deck ? armMagazineTable(stage, deck) : () => {};
}

export default function HubMotion() {
  useGSAP(() => {
    // Ausserhalb von matchMedia: aufräumen muss es auch, wenn jemand während
    // des Auftritts auf reduced motion umschaltet.
    const stopIntro = finishIntro();
    const stopPreload = armPreload();
    const mm = gsap.matchMedia();
    mm.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        desk: '(min-width: 768px)',
        pointer: '(hover: hover) and (pointer: fine)',
      },
      (ctx) => {
        const { motion, desk, pointer } = ctx.conditions as Record<string, boolean>;
        if (!motion) return;
        const scroller = appScroller() ?? window;
        const stops: Array<() => void> = [];
        stops.push(armScrubFallback(scroller));
        stops.push(armInView());
        stops.push(armSignupDemo());
        stops.push(armFaq());
        stops.push(armScrollTalk(scroller));
        // Scroll-JS an der Position nur ab 768px: auf dem iPhone läuft es ein
        // bis zwei Frames hinterher (siehe HeroMarkFlight) und zittert.
        if (desk) {
          stops.push(armPhonesDrift(scroller));
          // Auch mit Finger (iPad): ohne ihn liegt der Fächer nur still da.
          stops.push(armMagazine());
        }
        if (desk && pointer) {
          stops.push(armHeroPointer());
          stops.push(armDepthPointer());
        }
        return () => stops.forEach((stop) => stop());
      }
    );
    return () => {
      stopIntro?.();
      stopPreload();
      mm.revert();
    };
  });

  return null;
}
