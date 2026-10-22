'use client';

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { appScroller } from '@/lib/dom/appScroller';
import { CLEAR_DEAL, TILTS, dealFromPile, onFirstView, stackOnPile, visible } from '@/lib/home/dealIn';

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
 * Below the hero, Remy owns his entrance; this controller handles the
 * entrances of the magazine, the Must Eats and the districts map
 * (lib/home/dealIn.ts) and the signup demonstration (the FAQ opens in CSS,
 * HubFaq). Reduced motion always leaves the content in its resting state.
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

const CARD_BACK_SRC = '/pics/card-back.webp?v=8';

function centreOf(el: Element) {
  const box = el.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/** Auf dem Teller: die Hefte liegen als Stapel auf dem ersten Platz und
 *  werden auf ihre Plätze ausgeteilt; am Telefon landet das eine Heft, die
 *  Vorschauen darunter rutschen nach. */
function armMagazineDeal(): () => void {
  const section = document.querySelector<HTMLElement>('[data-hub-magazine]');
  if (!section) return () => {};
  const covers = () => visible(section.querySelectorAll<HTMLElement>('ol > li'));
  const thumbs = () => visible(section.querySelectorAll<HTMLElement>('[role="group"] > button'));
  const lift = 70;
  let timeline: gsap.core.Timeline | null = null;
  const stop = onFirstView(
    section,
    () => {
      const list = covers();
      if (!list.length) return;
      stackOnPile(list, centreOf(list[0]), lift);
      thumbs().forEach((thumb, index) => gsap.set(thumb, { y: 40, rotation: TILTS[index % TILTS.length] }));
    },
    () => {
      const list = covers();
      const small = thumbs();
      gsap.set([...list, ...small], { clearProps: CLEAR_DEAL });
      if (!list.length) return;
      timeline = dealFromPile(list, centreOf(list[0]), { lift, duration: 0.9, stagger: 0.1 });
      if (small.length) {
        timeline.fromTo(
          small,
          { y: 40, rotation: (index: number) => TILTS[index % TILTS.length] },
          { y: 0, rotation: 0, duration: 0.6, ease: 'back.out(1.6)', stagger: 0.06, clearProps: 'transform' },
          0.3,
        );
      }
    },
  );
  return () => {
    stop();
    timeline?.kill();
    gsap.set([...section.querySelectorAll('ol > li'), ...section.querySelectorAll('[role="group"] > button')], {
      clearProps: CLEAR_DEAL,
    });
  };
}

/** Must Eats: die Karten liegen verdeckt auf einem Stapel und werden
 *  ausgeteilt; unterwegs drehen sich die offenen um (wie live). */
function armMustEatsDeal(): () => void {
  const section = document.querySelector<HTMLElement>('[data-hub-musteats]');
  const deck = section?.querySelector<HTMLElement>('ul');
  if (!section || !deck) return () => {};
  const slides = () => visible(deck.querySelectorAll<HTMLElement>(':scope > li'));
  const captions = () => Array.from(deck.querySelectorAll<HTMLElement>('[data-stack-caption]'));
  const pileOf = (list: HTMLElement[]) => {
    const box = deck.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + list[0].offsetHeight / 2 };
  };
  const backs: HTMLImageElement[] = [];
  const addBacks = () => {
    deck.querySelectorAll<HTMLElement>('[data-stack-photo="open"]').forEach((photo) => {
      const back = document.createElement('img');
      back.src = CARD_BACK_SRC;
      back.alt = '';
      back.setAttribute('aria-hidden', 'true');
      back.setAttribute('data-deal-back', '');
      back.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;';
      photo.style.position = 'relative';
      photo.appendChild(back);
      backs.push(back);
    });
  };
  const removeBacks = () => {
    backs.splice(0).forEach((back) => {
      const photo = back.parentElement;
      back.remove();
      if (photo) photo.style.position = '';
    });
  };
  let timeline: gsap.core.Timeline | null = null;
  const stop = onFirstView(
    section,
    () => {
      const list = slides();
      if (!list.length) return;
      addBacks();
      stackOnPile(list, pileOf(list), 40, 0.9);
      gsap.set(captions(), { autoAlpha: 0 });
    },
    () => {
      const list = slides();
      gsap.set(list, { clearProps: CLEAR_DEAL });
      if (!list.length) return;
      const stagger = 0.09;
      timeline = dealFromPile(list, pileOf(list), { lift: 40, scale: 0.9, duration: 0.85, stagger });
      list.forEach((slide, index) => {
        const photo = slide.querySelector<HTMLElement>('[data-stack-photo="open"]');
        const back = photo?.querySelector<HTMLElement>('[data-deal-back]');
        if (!photo || !back) return;
        const turn = index * stagger + 0.3;
        timeline!
          .to(photo, { scaleX: 0, duration: 0.16, ease: 'power1.in' }, turn)
          .set(back, { visibility: 'hidden' }, turn + 0.16)
          .to(photo, { scaleX: 1, duration: 0.22, ease: 'power2.out', clearProps: 'transform' }, turn + 0.16);
      });
      timeline
        .to(captions(), { autoAlpha: 1, duration: 0.3, stagger: 0.05, clearProps: 'opacity,visibility' }, 0.75)
        .call(removeBacks);
    },
  );
  return () => {
    stop();
    timeline?.kill();
    removeBacks();
    gsap.set(deck.querySelectorAll(':scope > li'), { clearProps: CLEAR_DEAL });
    gsap.set(deck.querySelectorAll('[data-stack-photo]'), { clearProps: 'transform' });
    gsap.set(captions(), { clearProps: 'opacity,visibility' });
  };
}

/** Die Bezirke: die Berlin-Karte landet wie eine hingeworfene Karte, die
 *  Namen rutschen nacheinander auf ihre Zeilen. */
function armDistrictsDeal(): () => void {
  const section = document.querySelector<HTMLElement>('[data-hub-districts]');
  const map = section?.querySelector<HTMLElement>('[data-districts-map]');
  if (!section || !map) return () => {};
  const large = () => Array.from(section.querySelectorAll<HTMLElement>('[data-districts-large] > a'));
  const small = () => Array.from(section.querySelectorAll<HTMLElement>('[data-districts-small] > a'));
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
        .to(map, { y: 0, rotation: 0, scale: 1, duration: 1.05, ease: 'back.out(1.3)', clearProps: 'transform' }, 0)
        .to(large(), { yPercent: 0, rotation: 0, duration: 0.8, stagger: 0.08, clearProps: 'transform' }, 0.1)
        .to(small(), { y: 0, duration: 0.5, stagger: 0.04, clearProps: 'transform' }, 0.45);
    },
  );
  return () => {
    stop();
    timeline?.kill();
    gsap.set([map, ...large(), ...small()], { clearProps: 'transform' });
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
    .querySelectorAll('[data-hub-magazine], [data-hub-musteats], [data-hub-districts]')
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
        const stops: Array<() => void> = [];
        stops.push(armMagazineDeal());
        stops.push(armMustEatsDeal());
        stops.push(armDistrictsDeal());
        stops.push(armSignupDemo());
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
