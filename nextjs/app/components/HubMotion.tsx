'use client';

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { appScroller } from '@/lib/dom/appScroller';
import { onFirstView } from '@/lib/home/dealIn';

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
 * The hero cards and the magazine are immediately visible. This controller
 * handles the entrance of the districts map (lib/home/dealIn.ts) and the signup
 * demonstration (the FAQ opens in CSS,
 * HubFaq). Reduced motion always leaves the content in its resting state.
 */

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

/** Die Bezirke: die Berlin-Karte landet wie eine hingeworfene Karte, die
 *  Namen rutschen nacheinander auf ihre Zeilen. */
function armDistrictsDeal(): () => void {
  const section = document.querySelector<HTMLElement>('[data-hub-districts]');
  const map = section?.querySelector<HTMLElement>('[data-districts-map]');
  if (!section || !map) return () => {};
  const large = () =>
    Array.from(section.querySelectorAll<HTMLElement>('[data-districts-large] > a'));
  const small = () =>
    Array.from(section.querySelectorAll<HTMLElement>('[data-districts-small] > a'));
  let timeline: gsap.core.Timeline | null = null;
  const stop = onFirstView(
    section,
    () => {
      gsap.set(map, { y: 90, rotation: 8, scale: 0.88 });
      gsap.set(large(), { yPercent: 70, rotation: -4 });
      gsap.set(small(), { y: 26 });
    },
    () => {
      timeline = gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .to(
          map,
          {
            y: 0,
            rotation: 0,
            scale: 1,
            duration: 1.05,
            ease: 'back.out(1.3)',
            clearProps: 'transform',
          },
          0
        )
        .to(
          large(),
          { yPercent: 0, rotation: 0, duration: 0.8, stagger: 0.08, clearProps: 'transform' },
          0.1
        )
        .to(small(), { y: 0, duration: 0.5, stagger: 0.04, clearProps: 'transform' }, 0.45);
    }
  );
  return () => {
    stop();
    timeline?.kill();
    gsap.set([map, ...large(), ...small()], { clearProps: 'transform' });
  };
}

/** Preload individual photos shortly before they enter the scroll viewport. */
function armPreload(): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const img = entry.target as HTMLImageElement;
        if (img.getClientRects().length === 0) continue;
        io.unobserve(img);
        img.loading = 'eager';
      }
    },
    { root: appScroller(), rootMargin: '300px 0px' }
  );
  document
    .querySelectorAll(':is([data-hub-magazine], [data-hub-musteats], [data-hub-districts]) img[loading="lazy"]')
    .forEach((img) => io.observe(img));
  return () => io.disconnect();
}

export default function HubMotion() {
  useGSAP(() => {
    const stopPreload = armPreload();
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const stops = [armDistrictsDeal(), armSignupDemo()];
      return () => stops.forEach((stop) => stop());
    });
    return () => {
      stopPreload();
      mm.revert();
    };
  });

  return null;
}
