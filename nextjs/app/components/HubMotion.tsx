'use client';

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { appScroller } from '@/lib/dom/appScroller';

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
 * The curtain Remy pushes away remains; the hero behind it stands still.
 * Below the hero, Remy owns his entrance; this controller handles the signup
 * demonstration and scroll-triggered speech (the FAQ opens in CSS, HubFaq). Reduced motion
 * always leaves the content in its resting state.
 */

/**
 * Der Auftritt beim Laden: Remy schiebt den Vorhang weg (CSS,
 * HeroCurtain.module.css, ab dem ersten Paint). Dahinter steht der Hero schon
 * fertig — Marke, Headline, Lead, Knöpfe und MAP/MENÜ fliegen nicht mehr ein
 * (Ansage 21.10.2026: „nur die Remy-Animation, das Schieben, soll bleiben").
 * Ist der Vorhang durch, fällt `data-hero-intro` — vorher misst
 * HeroMarkFlight die Marke nicht.
 */
function finishIntro(): (() => void) | void {
  const html = document.documentElement;
  if (!html.hasAttribute('data-hero-intro')) return;
  const curtain = document.querySelector<HTMLElement>('[data-hub-hero] [data-hero-curtain]');
  const running = curtain?.getAnimations() ?? [];
  let cancelled = false;
  const end = () => html.removeAttribute('data-hero-intro');

  Promise.all(running.map((a) => a.finished))
    .then(() => !cancelled && end())
    // Abgebrochen (Attribut schon weg, Seite verlassen) — nichts mehr zu tun.
    .catch(() => {});

  return () => {
    cancelled = true;
    // Wer die Startseite mitten im Auftritt verlässt, nimmt nichts davon mit
    // (Logo im Header). Nicht sofort: React baut im Entwicklungsmodus jeden
    // Effekt einmal ab und gleich wieder auf — dann steht der Aufmacher noch.
    window.setTimeout(() => {
      if (!document.querySelector('[data-hub-hero]')) end();
    }, 0);
  };
}

/** GSAP setzt beim Animieren von `transform` die CSS-Eigenschaften
 *  `translate/rotate/scale` inline auf `none` — am Ende alles wieder frei
 *  geben, sonst bleiben Druckzustände (`--et-press-tile`) tot. */
const CLEAR_TRANSFORMS = 'transform,translate,rotate,scale';

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

/** The hero card follows a real pointer; touch and reduced motion stay still. */
function armHeroPointer(): () => void {
  const hero = document.querySelector<HTMLElement>('[data-hub-hero]');
  const art = hero?.querySelector<HTMLElement>('[data-hub-art]');
  if (!hero || !art) return () => {};
  gsap.set(art, { transformPerspective: 1100 });
  const follow = { duration: 0.9, ease: 'power3' };
  const tiltX = gsap.quickTo(art, 'rotationX', follow);
  const tiltY = gsap.quickTo(art, 'rotationY', follow);
  const move = (event: PointerEvent) => {
    const rect = hero.getBoundingClientRect();
    tiltY((((event.clientX - rect.left) / rect.width) * 2 - 1) * 12);
    tiltX((((event.clientY - rect.top) / rect.height) * 2 - 1) * -8);
  };
  const leave = () => { tiltX(0); tiltY(0); };
  hero.addEventListener('pointermove', move);
  hero.addEventListener('pointerleave', leave);
  return () => {
    hero.removeEventListener('pointermove', move);
    hero.removeEventListener('pointerleave', leave);
    tiltX.tween.kill();
    tiltY.tween.kill();
    gsap.set(art, { clearProps: CLEAR_TRANSFORMS });
  };
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
    .querySelectorAll('[data-hub-magazine], [data-hub-musteats]')
    .forEach((section) => io.observe(section));
  return () => io.disconnect();
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
        stops.push(armSignupDemo());
        stops.push(armScrollTalk(scroller));
        if (desk && pointer) {
          stops.push(armHeroPointer());
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
